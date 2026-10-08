import pool from "../config/db.js";
import { getRoleLevel, REPORT_ROLE_LEVELS } from "./reportHierarchyService.js";

const DEFAULT_CACHE_TTL_MS = 15_000;
const visibleUserCache = new Map();

const isGlobalReportAccessEnabled = () => {
  const value = String(process.env.REPORT_GLOBAL_ACCESS_ENABLED || "true").toLowerCase();
  if (!["true", "false"].includes(value)) {
    throw new Error("REPORT_GLOBAL_ACCESS_ENABLED must be set to true or false.");
  }
  return value === "true";
};

const getHistoryVisibilityMode = () => {
  const mode = String(process.env.REPORT_HISTORY_VISIBILITY_MODE || "current").toLowerCase();
  if (!["current", "submission"].includes(mode)) {
    throw new Error("REPORT_HISTORY_VISIBILITY_MODE must be current or submission.");
  }
  return mode;
};

export const invalidateReportVisibilityCache = () => {
  visibleUserCache.clear();
};

const resolveVisibilityScope = async (user) => {
  const userId = Number(user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("A valid authenticated user is required to resolve report visibility.");
  }

  const userRole = String(user.role || "").toUpperCase();
  if (isGlobalReportAccessEnabled() && ["HR", "SUPER_ADMIN"].includes(userRole)) {
    return { userIds: null, reportIds: null, unrestricted: true };
  }

  const now = Date.now();
  const cached = visibleUserCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.scope;
  if (cached) visibleUserCache.delete(userId);

  const employeeResult = await pool.query(
    `SELECT id, department_id, role, designation, employment_type
     FROM employees
     WHERE user_id = $1 AND is_deleted = FALSE
     LIMIT 1;`,
    [userId]
  );
  const employee = employeeResult.rows[0];
  const isDepartmentHead = getRoleLevel({
    role: employee?.role || userRole,
    designation: employee?.designation || user.designation,
    employmentType: employee?.employment_type,
  }) === REPORT_ROLE_LEVELS.DEPARTMENT_HEAD;
  const roleLevel = getRoleLevel({
    role: employee?.role || userRole,
    designation: employee?.designation || user.designation,
    employmentType: employee?.employment_type,
  });

  let visibleUserIds;
  if (isDepartmentHead && employee?.department_id) {
    const departmentResult = await pool.query(
      `SELECT DISTINCT u.id
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE e.department_id = $1
         AND e.is_deleted = FALSE
         AND u.is_deleted = FALSE;`,
      [employee.department_id]
    );
    visibleUserIds = departmentResult.rows.map((row) => Number(row.id));
  } else if (roleLevel === REPORT_ROLE_LEVELS.TL || roleLevel === REPORT_ROLE_LEVELS.SUB_TL) {
    const treeResult = await pool.query(
      `WITH RECURSIVE report_tree AS (
         SELECT e.id, e.user_id, e.reporting_manager_id,
                CASE
                  WHEN UPPER(COALESCE(e.role, '')) = 'SUPER_ADMIN' OR LOWER(COALESCE(e.designation, '')) LIKE '%superadmin%' THEN 6
                  WHEN UPPER(COALESCE(e.role, '')) = 'HR' OR LOWER(COALESCE(e.designation, '')) LIKE '%human resources%' THEN 5
                  WHEN UPPER(COALESCE(e.role, '')) IN ('SUB_TL', 'SUB-TL')
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%sub-team lead%'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%sub team lead%'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%sub tl%' THEN 2
                  WHEN UPPER(COALESCE(e.role, '')) = 'MANAGER'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%department head%'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%head of department%'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%manager%' THEN 4
                  WHEN UPPER(COALESCE(e.role, '')) = 'TL'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%team lead%'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%team leader%'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%supervisor%' THEN 3
                  WHEN UPPER(COALESCE(e.role, '')) = 'INTERN'
                    OR UPPER(COALESCE(e.employment_type, '')) = 'INTERN'
                    OR LOWER(COALESCE(e.designation, '')) LIKE '%intern%' THEN 1
                  ELSE 0
                END AS role_level,
                ARRAY[e.id]::bigint[] AS path
         FROM employees e
         WHERE e.user_id = $1 AND e.is_deleted = FALSE
         UNION ALL
         SELECT child.id, child.user_id, child.reporting_manager_id, child.role_level, parent.path || child.id
         FROM (
           SELECT e.*,
                  CASE
                    WHEN UPPER(COALESCE(e.role, '')) = 'SUPER_ADMIN' OR LOWER(COALESCE(e.designation, '')) LIKE '%superadmin%' THEN 6
                    WHEN UPPER(COALESCE(e.role, '')) = 'HR' OR LOWER(COALESCE(e.designation, '')) LIKE '%human resources%' THEN 5
                    WHEN UPPER(COALESCE(e.role, '')) IN ('SUB_TL', 'SUB-TL')
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%sub-team lead%'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%sub team lead%'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%sub tl%' THEN 2
                    WHEN UPPER(COALESCE(e.role, '')) = 'MANAGER'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%department head%'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%head of department%'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%manager%' THEN 4
                    WHEN UPPER(COALESCE(e.role, '')) = 'TL'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%team lead%'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%team leader%'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%supervisor%' THEN 3
                    WHEN UPPER(COALESCE(e.role, '')) = 'INTERN'
                      OR UPPER(COALESCE(e.employment_type, '')) = 'INTERN'
                      OR LOWER(COALESCE(e.designation, '')) LIKE '%intern%' THEN 1
                    ELSE 0
                  END AS role_level
           FROM employees e
           WHERE e.is_deleted = FALSE
         ) child
         JOIN report_tree parent ON child.reporting_manager_id = parent.id
         WHERE child.role_level < parent.role_level
           AND NOT child.id = ANY(parent.path)
       )
       SELECT DISTINCT u.id
       FROM report_tree t
       JOIN users u ON u.id = t.user_id
       WHERE u.is_deleted = FALSE;`,
      [userId]
    );
    visibleUserIds = treeResult.rows.map((row) => Number(row.id));
  } else {
    visibleUserIds = [userId];
  }

  if (!visibleUserIds.includes(userId)) visibleUserIds.push(userId);
  let visibleReportIds = [];
  if (getHistoryVisibilityMode() === "submission") {
    const reportResult = await pool.query(
      `SELECT report_id
       FROM daily_work_report_visibility
       WHERE viewer_user_id = $1;`,
      [userId]
    );
    visibleReportIds = reportResult.rows.map((row) => Number(row.report_id));
  }
  const departmentResult = await pool.query(
    `SELECT department_id
     FROM employees
     WHERE user_id = ANY($1::bigint[])
       AND department_id IS NOT NULL
       AND is_deleted = FALSE
     UNION
     SELECT DISTINCT COALESCE(r.department_id, e.department_id) AS department_id
     FROM daily_work_reports r
     LEFT JOIN employees e ON e.id = r.employee_id
     WHERE r.id = ANY($2::bigint[])
       AND COALESCE(r.department_id, e.department_id) IS NOT NULL;`,
    [visibleUserIds, visibleReportIds]
  );
  const ttl = Math.max(1_000, Number(process.env.REPORT_VISIBILITY_CACHE_TTL_MS) || DEFAULT_CACHE_TTL_MS);
  const scope = {
    userIds: visibleUserIds,
    reportIds: visibleReportIds,
    departmentIds: departmentResult.rows.map((row) => Number(row.department_id)),
    unrestricted: false,
  };
  visibleUserCache.set(userId, { scope, expiresAt: now + ttl });
  return scope;
};

export const getVisibleUserIds = async (user) =>
  (await resolveVisibilityScope(user)).userIds;

export const getReportVisibilityScope = resolveVisibilityScope;

export const hasGlobalReportAccess = (user) =>
  isGlobalReportAccessEnabled() &&
  ["HR", "SUPER_ADMIN"].includes(String(user?.role || "").toUpperCase());

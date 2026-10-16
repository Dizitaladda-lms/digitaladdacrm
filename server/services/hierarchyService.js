import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";

/**
 * ============================================================================
 * CENTRALIZED HIERARCHY & REPORTING SERVICE (hierarchyService.js)
 * ============================================================================
 *
 * Core Responsibilities:
 * 1. Upward Reporting Chain (for report routing & approvals):
 *    Intern/Employee -> SUB_TL -> TL -> DEPARTMENT_HEAD/MANAGER -> HR -> SUPER_ADMIN
 *    - Recursive CTE with cycle protection (path array) and max depth limit (10).
 *    - Inactive / missing middle manager skipping: seamlessly advances to the
 *      next active ancestor. If none found in direct line, routes to active Department Head.
 * 2. Downward Subordinate Tree (for report visibility):
 *    - SUPER_ADMIN: sees all reports across all departments.
 *    - HR: sees all reports below HR level across all departments.
 *    - DEPARTMENT_HEAD / MANAGER: sees all users in their managed department(s)
 *      PLUS all recursive descendants in their reporting subtree.
 *    - TL: strictly sees only their own subordinates & Sub-TLs (isolated from other TLs).
 *    - SUB_TL: strictly sees only their pod/intern subordinates.
 * 3. Validation & Prevention of Future Breaks:
 *    - Rejects self-reporting (manager_id === id).
 *    - Rejects circular reporting (A -> B -> A).
 *    - Validates allowed role-to-role reporting hierarchy.
 *    - Re-routes pending reports when a manager is deactivated or changed.
 */

export const HIERARCHY_LEVELS = Object.freeze({
  INTERN: 1,
  SUB_TL: 2,
  TL: 3,
  DEPARTMENT_HEAD: 4,
  HR: 5,
  SUPER_ADMIN: 6,
});

export const HIERARCHY_ROLE_LABELS = Object.freeze({
  1: "INTERN",
  2: "SUB_TL",
  3: "TL",
  4: "DEPARTMENT_HEAD",
  5: "HR",
  6: "SUPER_ADMIN",
});

/**
 * Normalize and determine numerical hierarchy level for a user / employee
 */
export const resolveRoleHierarchyLevel = ({ role, designation, employmentType } = {}) => {
  const normRole = String(role || "").trim().toUpperCase();
  const normDesig = String(designation || "").trim().toLowerCase();
  const normEmpType = String(employmentType || "").trim().toUpperCase();

  if (normRole === "SUPER_ADMIN" || normDesig.includes("superadmin")) {
    return HIERARCHY_LEVELS.SUPER_ADMIN;
  }
  if (normRole === "HR" || normDesig.includes("human resources") || normDesig.includes("hr manager")) {
    return HIERARCHY_LEVELS.HR;
  }
  if (
    normRole === "SUB_TL" ||
    normRole === "SUB-TL" ||
    normDesig.includes("sub-team lead") ||
    normDesig.includes("sub team lead") ||
    normDesig.includes("sub tl") ||
    normDesig.includes("sub-team leader")
  ) {
    return HIERARCHY_LEVELS.SUB_TL;
  }
  if (
    normRole === "MANAGER" ||
    normRole === "DEPARTMENT_HEAD" ||
    normRole === "ADMIN" ||
    normRole === "SALES_HEAD" ||
    normDesig.includes("department head") ||
    normDesig.includes("head of department") ||
    normDesig.includes("sales head") ||
    normDesig.includes("manager")
  ) {
    return HIERARCHY_LEVELS.DEPARTMENT_HEAD;
  }
  if (
    normRole === "TL" ||
    normDesig.includes("team lead") ||
    normDesig.includes("team leader") ||
    normDesig.includes("leader") ||
    normDesig.includes("supervisor")
  ) {
    return HIERARCHY_LEVELS.TL;
  }
  if (
    normRole === "INTERN" ||
    normEmpType === "INTERN" ||
    normDesig.includes("intern") ||
    normDesig.includes("trainee")
  ) {
    return HIERARCHY_LEVELS.INTERN;
  }

  // Counsellors, Trainers, General Employees default to Level 1 execution
  return HIERARCHY_LEVELS.INTERN;
};

/**
 * ============================================================================
 * 1. UPWARD APPROVAL CHAIN RESOLUTION (Dynamic Recursive CTE)
 * ============================================================================
 * Resolves the complete upward path from submitter to Super Admin.
 * Handles:
 * - Dynamic traversal through employees.reporting_manager_id & users.reports_to
 * - Cycle protection with path tracking
 * - Depth limit: 10
 * - Inactive middle manager skipping: if a Sub-TL or TL is deactivated/missing,
 *   skips to the next active manager above them.
 * - Missing Department Head fallback: if direct line doesn't reach Dept Head,
 *   queries active Department Head for that departmentId and logs a clean warning.
 */
export const getUpwardApprovalChain = async ({
  submitterUserId,
  departmentId = null,
  clientOrPool = pool,
}) => {
  const executor = clientOrPool || pool;

  if (!submitterUserId) {
    throw new ApiError(400, "Submitter user ID is required to resolve upward reporting chain.");
  }

  // 1. Fetch submitter's profile
  const subRes = await executor.query(
    `SELECT u.id AS user_id, u.full_name AS user_name, u.role AS user_role, u.department_id AS user_dept_id,
            e.id AS employee_id, e.full_name AS employee_name, e.role AS employee_role, e.designation,
            e.employment_type, e.department_id AS emp_dept_id, e.reporting_manager_id
     FROM users u
     LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
     WHERE u.id = $1 AND u.is_deleted = FALSE
     LIMIT 1;`,
    [submitterUserId]
  );

  const submitter = subRes.rows[0];
  if (!submitter) {
    return [];
  }

  const effectiveDeptId = departmentId || submitter.emp_dept_id || submitter.user_dept_id || null;
  const submitterLevel = resolveRoleHierarchyLevel({
    role: submitter.employee_role || submitter.user_role,
    designation: submitter.designation,
    employmentType: submitter.employment_type,
  });

  // 2. Traversal up the chain using Recursive CTE with cycle protection & depth limit
  const chainRes = await executor.query(
    `WITH RECURSIVE upward_chain AS (
       -- Anchor member: immediate manager of submitter
       SELECT 
         m_e.id AS emp_id,
         m_u.id AS user_id,
         m_u.full_name,
         COALESCE(m_e.role, m_u.role) AS role,
         m_e.designation,
         m_e.employment_type,
         COALESCE(m_e.department_id, m_u.department_id) AS department_id,
         m_e.reporting_manager_id,
         m_u.reports_to,
         m_u.is_active AS user_active,
         m_u.is_deleted AS user_deleted,
         m_e.status AS emp_status,
         m_e.is_deleted AS emp_deleted,
         1 AS depth,
         ARRAY[u.id, m_u.id]::bigint[] AS path
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       -- Match either employee's reporting_manager_id or user's reports_to
       LEFT JOIN employees m_e ON (e.reporting_manager_id IS NOT NULL AND m_e.id = e.reporting_manager_id AND m_e.is_deleted = FALSE)
       LEFT JOIN users m_u ON (
         (m_e.user_id IS NOT NULL AND m_u.id = m_e.user_id)
         OR (e.reporting_manager_id IS NULL AND u.reports_to IS NOT NULL AND m_u.id = u.reports_to)
       )
       WHERE u.id = $1
         AND m_u.id IS NOT NULL

       UNION ALL

       -- Recursive member: manager of current node
       SELECT 
         next_e.id AS emp_id,
         next_u.id AS user_id,
         next_u.full_name,
         COALESCE(next_e.role, next_u.role) AS role,
         next_e.designation,
         next_e.employment_type,
         COALESCE(next_e.department_id, next_u.department_id) AS department_id,
         next_e.reporting_manager_id,
         next_u.reports_to,
         next_u.is_active AS user_active,
         next_u.is_deleted AS user_deleted,
         next_e.status AS emp_status,
         next_e.is_deleted AS emp_deleted,
         c.depth + 1 AS depth,
         c.path || next_u.id
       FROM upward_chain c
       LEFT JOIN employees next_e ON (c.reporting_manager_id IS NOT NULL AND next_e.id = c.reporting_manager_id AND next_e.is_deleted = FALSE)
       LEFT JOIN users next_u ON (
         (next_e.user_id IS NOT NULL AND next_u.id = next_e.user_id)
         OR (c.reporting_manager_id IS NULL AND c.reports_to IS NOT NULL AND next_u.id = c.reports_to)
       )
       WHERE next_u.id IS NOT NULL
         AND c.depth < 10
         AND NOT (next_u.id = ANY(c.path))
     )
     SELECT * FROM upward_chain ORDER BY depth ASC;`,
    [submitterUserId]
  );

  const stepsByLevel = new Map();
  const seenUserIds = new Set([submitterUserId]);

  // 3. Process direct chain rows, skipping inactive managers
  for (const row of chainRes.rows) {
    const isNodeActive =
      row.user_active !== false &&
      row.user_deleted !== true &&
      row.emp_deleted !== true &&
      (!row.emp_status || String(row.emp_status).toUpperCase() === "ACTIVE");

    if (!isNodeActive) {
      // Inactive middle manager skipped: log clean info and continue upward
      continue;
    }

    const nodeLevel = resolveRoleHierarchyLevel({
      role: row.role,
      designation: row.designation,
      employmentType: row.employment_type,
    });

    if (nodeLevel > submitterLevel && !stepsByLevel.has(nodeLevel) && !seenUserIds.has(Number(row.user_id))) {
      seenUserIds.add(Number(row.user_id));
      stepsByLevel.set(nodeLevel, {
        approverId: Number(row.user_id),
        level: nodeLevel,
        roleLabel: HIERARCHY_ROLE_LABELS[nodeLevel] || "MANAGER",
        fullName: row.full_name,
        departmentId: row.department_id,
        source: "reporting_chain",
      });
    }
  }

  // 4. Missing Middle Level Fallback: If Department Head (Level 4) is above submitter
  // and direct line did not hit an active Department Head, find active Department Head for this department
  if (
    submitterLevel < HIERARCHY_LEVELS.DEPARTMENT_HEAD &&
    !stepsByLevel.has(HIERARCHY_LEVELS.DEPARTMENT_HEAD) &&
    effectiveDeptId
  ) {
    const dhRes = await executor.query(
      `SELECT u.id AS user_id, u.full_name, e.role, e.designation, e.department_id
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE e.is_deleted = FALSE
         AND u.is_deleted = FALSE
         AND u.is_active = TRUE
         AND e.status = 'ACTIVE'
         AND (
           e.department_id = $1
           OR (e.managed_department_ids IS NOT NULL AND e.managed_department_ids @> to_jsonb($1::bigint))
         )
         AND (
           UPPER(COALESCE(e.role, '')) IN ('MANAGER', 'DEPARTMENT_HEAD', 'SALES_HEAD', 'ADMIN')
           OR UPPER(COALESCE(u.role, '')) IN ('MANAGER', 'DEPARTMENT_HEAD', 'SALES_HEAD', 'ADMIN')
           OR LOWER(COALESCE(e.designation, '')) LIKE '%department head%'
           OR LOWER(COALESCE(e.designation, '')) LIKE '%head of department%'
           OR LOWER(COALESCE(e.designation, '')) LIKE '%manager%'
         )
       ORDER BY e.id ASC
       LIMIT 1;`,
      [effectiveDeptId]
    );

    if (dhRes.rows[0] && !seenUserIds.has(Number(dhRes.rows[0].user_id))) {
      seenUserIds.add(Number(dhRes.rows[0].user_id));
      stepsByLevel.set(HIERARCHY_LEVELS.DEPARTMENT_HEAD, {
        approverId: Number(dhRes.rows[0].user_id),
        level: HIERARCHY_LEVELS.DEPARTMENT_HEAD,
        roleLabel: "DEPARTMENT_HEAD",
        fullName: dhRes.rows[0].full_name,
        departmentId: dhRes.rows[0].department_id,
        source: "department_fallback",
      });
    } else {
      // Log warning when no active Department Head is found for department
      console.warn(`[HIERARCHY WARN] No active Department Head found for departmentId ${effectiveDeptId}. Advancing to HR.`);
    }
  }

  // 5. Ensure HR (Level 5) is in the chain if above submitter
  if (submitterLevel < HIERARCHY_LEVELS.HR && !stepsByLevel.has(HIERARCHY_LEVELS.HR)) {
    const hrRes = await executor.query(
      `SELECT u.id AS user_id, u.full_name, e.department_id
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       WHERE u.is_deleted = FALSE
         AND u.is_active = TRUE
         AND (UPPER(u.role) = 'HR' OR UPPER(COALESCE(e.role, '')) = 'HR')
       ORDER BY u.id ASC
       LIMIT 1;`
    );
    if (hrRes.rows[0] && !seenUserIds.has(Number(hrRes.rows[0].user_id))) {
      seenUserIds.add(Number(hrRes.rows[0].user_id));
      stepsByLevel.set(HIERARCHY_LEVELS.HR, {
        approverId: Number(hrRes.rows[0].user_id),
        level: HIERARCHY_LEVELS.HR,
        roleLabel: "HR",
        fullName: hrRes.rows[0].full_name,
        departmentId: hrRes.rows[0].department_id,
        source: "global_hr",
      });
    }
  }

  // 6. Ensure Super Admin (Level 6) is in the chain if above submitter
  if (submitterLevel < HIERARCHY_LEVELS.SUPER_ADMIN && !stepsByLevel.has(HIERARCHY_LEVELS.SUPER_ADMIN)) {
    const saRes = await executor.query(
      `SELECT u.id AS user_id, u.full_name
       FROM users u
       WHERE u.is_deleted = FALSE
         AND u.is_active = TRUE
         AND UPPER(u.role) = 'SUPER_ADMIN'
       ORDER BY u.id ASC
       LIMIT 1;`
    );
    if (saRes.rows[0] && !seenUserIds.has(Number(saRes.rows[0].user_id))) {
      seenUserIds.add(Number(saRes.rows[0].user_id));
      stepsByLevel.set(HIERARCHY_LEVELS.SUPER_ADMIN, {
        approverId: Number(saRes.rows[0].user_id),
        level: HIERARCHY_LEVELS.SUPER_ADMIN,
        roleLabel: "SUPER_ADMIN",
        fullName: saRes.rows[0].full_name,
        departmentId: null,
        source: "global_super_admin",
      });
    }
  }

  return Array.from(stepsByLevel.values()).sort((a, b) => a.level - b.level);
};

/**
 * ============================================================================
 * 2. DOWNWARD SUBORDINATE USER IDS (Dynamic Recursive CTE)
 * ============================================================================
 * Returns all user IDs that the actor is authorized to see reports for.
 * Rules:
 * - SUPER_ADMIN: all active users in the system.
 * - HR: all users below HR level + self.
 * - DEPARTMENT_HEAD / MANAGER: all users in their managed department(s)
 *   PLUS all recursive descendants in their tree.
 * - TL: strictly all descendants in their tree (Sub-TLs, Interns, Counsellors) + self.
 *   Zero leakage to other TLs' teams!
 * - SUB_TL: strictly all descendants in their pod + self.
 * - EMPLOYEE / INTERN: self only [userId].
 */
export const getDownwardSubordinateUserIds = async (user, clientOrPool = pool) => {
  const executor = clientOrPool || pool;
  const userId = Number(user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return [];
  }

  // 1. Fetch user profile and department associations
  const profileRes = await executor.query(
    `SELECT u.id AS user_id, u.role AS user_role, u.department_id AS user_dept_id,
            e.id AS employee_id, e.role AS employee_role, e.designation, e.employment_type,
            e.department_id AS emp_dept_id, e.managed_department_ids
     FROM users u
     LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
     WHERE u.id = $1 AND u.is_deleted = FALSE
     LIMIT 1;`,
    [userId]
  );

  const profile = profileRes.rows[0] || {};
  const userRole = String(profile.employee_role || profile.user_role || user?.role || "").toUpperCase();
  const designation = profile.designation || user?.designation || "";
  const employmentType = profile.employment_type || user?.employment_type || "";

  const level = resolveRoleHierarchyLevel({
    role: userRole,
    designation,
    employmentType,
  });

  // A. Super Admin: global access
  if (level === HIERARCHY_LEVELS.SUPER_ADMIN || userRole === "SUPER_ADMIN") {
    const allRes = await executor.query(`SELECT id FROM users WHERE is_deleted = FALSE;`);
    return allRes.rows.map((r) => Number(r.id));
  }

  // B. HR: organization-wide below HR level
  if (level === HIERARCHY_LEVELS.HR || userRole === "HR") {
    const hrRes = await executor.query(
      `SELECT u.id, u.role AS user_role, e.role AS emp_role, e.designation, e.employment_type
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       WHERE u.is_deleted = FALSE;`
    );
    const set = new Set([userId]);
    for (const r of hrRes.rows) {
      const lvl = resolveRoleHierarchyLevel({
        role: r.emp_role || r.user_role,
        designation: r.designation,
        employmentType: r.employment_type,
      });
      if (lvl < HIERARCHY_LEVELS.HR) {
        set.add(Number(r.id));
      }
    }
    return Array.from(set);
  }

  // C. Recursive Tree Traversal (downwards from current actor)
  const treeRes = await executor.query(
    `WITH RECURSIVE subordinate_tree AS (
       -- Anchor: the acting user
       SELECT 
         u.id AS user_id, 
         e.id AS emp_id,
         ARRAY[u.id]::bigint[] AS visited
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       WHERE u.id = $1 AND u.is_deleted = FALSE

       UNION ALL

       -- Children reporting to this node
       SELECT 
         child_u.id AS user_id, 
         child_e.id AS emp_id,
         st.visited || child_u.id
       FROM users child_u
       LEFT JOIN employees child_e ON child_e.user_id = child_u.id AND child_e.is_deleted = FALSE
       JOIN subordinate_tree st ON (
         (child_e.reporting_manager_id IS NOT NULL AND child_e.reporting_manager_id = st.emp_id)
         OR (child_u.reports_to IS NOT NULL AND child_u.reports_to = st.user_id)
         OR (child_e.reporting_manager_id IS NOT NULL AND child_e.reporting_manager_id = st.user_id)
       )
       WHERE child_u.is_deleted = FALSE
         AND NOT (child_u.id = ANY(st.visited))
     )
     SELECT DISTINCT user_id FROM subordinate_tree WHERE user_id IS NOT NULL;`,
    [userId]
  );

  const subordinateSet = new Set(treeRes.rows.map((r) => Number(r.user_id)));

  // D. Department Head: also add everyone in their managed/assigned department(s) below level 4
  if (level === HIERARCHY_LEVELS.DEPARTMENT_HEAD) {
    let deptIds = [];
    if (profile.emp_dept_id) deptIds.push(Number(profile.emp_dept_id));
    if (profile.user_dept_id) deptIds.push(Number(profile.user_dept_id));
    if (Array.isArray(profile.managed_department_ids)) {
      deptIds.push(...profile.managed_department_ids.map(Number));
    }
    deptIds = Array.from(new Set(deptIds.filter((id) => Number.isInteger(id) && id > 0)));

    if (deptIds.length > 0) {
      const deptRes = await executor.query(
        `SELECT u.id, u.role AS user_role, e.role AS emp_role, e.designation, e.employment_type
         FROM users u
         LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
         WHERE u.is_deleted = FALSE
           AND COALESCE(e.department_id, u.department_id) = ANY($1::bigint[]);`,
        [deptIds]
      );
      for (const r of deptRes.rows) {
        const lvl = resolveRoleHierarchyLevel({
          role: r.emp_role || r.user_role,
          designation: r.designation,
          employmentType: r.employment_type,
        });
        if (lvl < HIERARCHY_LEVELS.DEPARTMENT_HEAD) {
          subordinateSet.add(Number(r.id));
        }
      }
    }
  }

  // Ensure actor themselves is included
  subordinateSet.add(userId);
  return Array.from(subordinateSet);
};

/**
 * ============================================================================
 * 3. VALIDATION ON CREATE / UPDATE EMPLOYEE (Prevents Future Breaks)
 * ============================================================================
 * Enforces:
 * - No self-reporting (manager_id !== employeeId)
 * - Active manager validation
 * - Circular reference rejection via recursive check
 * - Role-to-role reporting rules:
 *   INTERN -> SUB_TL, TL, MANAGER, SUPER_ADMIN
 *   SUB_TL -> TL, MANAGER, SUPER_ADMIN
 *   TL -> MANAGER, DEPARTMENT_HEAD, SUPER_ADMIN
 */
export const validateManagerAssignment = async ({
  employeeId,
  managerId,
  role,
  designation,
  employmentType,
  clientOrPool = pool,
}) => {
  const executor = clientOrPool || pool;

  if (!managerId) {
    // If Super Admin, null manager is completely valid
    const targetLevel = resolveRoleHierarchyLevel({ role, designation, employmentType });
    if (targetLevel === HIERARCHY_LEVELS.SUPER_ADMIN) {
      return { valid: true };
    }
    // For non-super-admins, null manager is allowed on creation but flagged
    return { valid: true, warning: "Employee created without a reporting manager." };
  }

  const cleanEmpId = employeeId ? Number(employeeId) : null;
  const cleanMgrId = Number(managerId);

  // 1. Self-reporting check
  if (cleanEmpId && cleanEmpId === cleanMgrId) {
    throw new ApiError(400, "An employee cannot be their own reporting manager.");
  }

  // 2. Fetch manager details
  const mgrRes = await executor.query(
    `SELECT e.id, e.user_id, e.full_name, e.role, e.designation, e.employment_type, e.status, e.is_deleted,
            u.is_active AS user_active, u.is_deleted AS user_deleted
     FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.id = $1;`,
    [cleanMgrId]
  );

  const manager = mgrRes.rows[0];
  if (!manager || manager.is_deleted || manager.status !== "ACTIVE") {
    throw new ApiError(400, "The selected reporting manager does not exist or is inactive.");
  }

  if (manager.user_active === false || manager.user_deleted === true) {
    throw new ApiError(400, "The selected reporting manager's user account is inactive or deleted.");
  }

  // 3. Circular reference check (if employeeId already exists)
  if (cleanEmpId) {
    const cycleRes = await executor.query(
      `WITH RECURSIVE mgr_path AS (
         SELECT id, reporting_manager_id, ARRAY[id]::bigint[] AS path
         FROM employees
         WHERE id = $1 AND is_deleted = FALSE
         UNION ALL
         SELECT parent.id, parent.reporting_manager_id, p.path || parent.id
         FROM employees parent
         JOIN mgr_path p ON parent.id = p.reporting_manager_id
         WHERE parent.is_deleted = FALSE AND NOT (parent.id = ANY(p.path))
       )
       SELECT EXISTS(SELECT 1 FROM mgr_path WHERE id = $2) AS has_cycle;`,
      [cleanMgrId, cleanEmpId]
    );

    if (cycleRes.rows[0]?.has_cycle) {
      throw new ApiError(400, "Cannot assign this reporting manager as it creates a circular reporting loop.");
    }
  }

  // 4. Role-to-role reporting hierarchy validation
  const empLevel = resolveRoleHierarchyLevel({ role, designation, employmentType });
  const mgrLevel = resolveRoleHierarchyLevel({
    role: manager.role,
    designation: manager.designation,
    employmentType: manager.employment_type,
  });

  if (empLevel > mgrLevel && mgrLevel < HIERARCHY_LEVELS.SUPER_ADMIN) {
    throw new ApiError(
      400,
      `Invalid hierarchy: An employee with level ${HIERARCHY_ROLE_LABELS[empLevel]} cannot report to a lower level manager (${HIERARCHY_ROLE_LABELS[mgrLevel]}).`
    );
  }

  return { valid: true };
};

/**
 * ============================================================================
 * 4. REASSIGN DIRECT REPORTS & REROUTE PENDING REPORTS
 * ============================================================================
 * When a manager is deactivated, soft-deleted, or changed:
 * - Reassigns their direct reports to newManagerId (or next ancestor).
 * - Re-routes any pending reports awaiting the old manager to the new manager.
 */
export const reassignDirectReportsAndReroutePending = async ({
  oldManagerId,
  newManagerId = null,
  client,
}) => {
  const executor = client || pool;
  const cleanOldMgrId = Number(oldManagerId);
  const cleanNewMgrId = newManagerId ? Number(newManagerId) : null;

  if (!cleanOldMgrId) return;

  // 1. Fetch old manager's user_id
  const oldMgrUserRes = await executor.query(
    `SELECT user_id, reporting_manager_id FROM employees WHERE id = $1;`,
    [cleanOldMgrId]
  );
  const oldMgrUserId = oldMgrUserRes.rows[0]?.user_id ? Number(oldMgrUserRes.rows[0].user_id) : null;
  const grandManagerId = oldMgrUserRes.rows[0]?.reporting_manager_id ? Number(oldMgrUserRes.rows[0].reporting_manager_id) : null;

  // Effective replacement manager (newManagerId or grandManagerId)
  const targetManagerId = cleanNewMgrId || grandManagerId || null;

  // 2. Reassign direct reporting employees
  await executor.query(
    `UPDATE employees
     SET reporting_manager_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE reporting_manager_id = $2 AND is_deleted = FALSE;`,
    [targetManagerId, cleanOldMgrId]
  );

  // 3. If old manager had a linked user_id, re-route pending reports awaiting them
  if (oldMgrUserId) {
    let targetUserId = null;
    if (targetManagerId) {
      const targetUserRes = await executor.query(
        `SELECT user_id FROM employees WHERE id = $1;`,
        [targetManagerId]
      );
      targetUserId = targetUserRes.rows[0]?.user_id ? Number(targetUserRes.rows[0].user_id) : null;
    }

    if (targetUserId) {
      // Re-route current_level_user_id on daily_work_reports
      await executor.query(
        `UPDATE daily_work_reports
         SET current_level_user_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE current_level_user_id = $2
           AND status NOT IN ('SUPER_ADMIN_APPROVED', 'REVISION_REQUESTED')
           AND COALESCE(current_status, 'PENDING') = 'PENDING';`,
        [targetUserId, oldMgrUserId]
      );

      // Re-route pending approver_id on report_approvals
      await executor.query(
        `UPDATE report_approvals
         SET approver_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE approver_id = $2 AND status = 'PENDING';`,
        [targetUserId, oldMgrUserId]
      );
    }
  }
};

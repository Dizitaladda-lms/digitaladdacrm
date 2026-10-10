import pool, { withTransaction } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import {
  getRoleLevel,
  REPORT_ROLE_LEVELS,
  ROLE_LABELS_BY_LEVEL,
} from "./reportHierarchyService.js";
import { invalidateReportVisibilityCache } from "./reportVisibilityPolicy.js";

/**
 * Helper: safely insert an in-app notification for a user
 */
export const createReportNotification = async (
  clientOrPool,
  { userId, actorUserId, type, title, message, link = "/employee/my-report", priority = "NORMAL" }
) => {
  if (!userId || Number(userId) === Number(actorUserId)) return;
  const executor = clientOrPool || pool;
  try {
    await executor.query(
      `INSERT INTO user_notifications (user_id, actor_user_id, type, category, title, message, link, priority)
       VALUES ($1, $2, $3, 'REPORT', $4, $5, $6, $7);`,
      [userId, actorUserId || null, type, title, message, link, priority]
    );
  } catch (err) {
    // Non-fatal in test/mocked environments if user_notifications table is not mocked
    console.warn("Notification insert skipped:", err.message);
  }
};

/**
 * Resolve full employee + user profile with hierarchy level
 */
export const getActorHierarchyProfile = async (clientOrPool, user) => {
  const executor = clientOrPool || pool;
  const userId = Number(user?.id);
  const res = await executor.query(
    `SELECT
       u.id AS user_id,
       u.full_name AS user_name,
       u.role AS user_role,
       u.reports_to,
       u.department_id AS user_department_id,
       e.id AS employee_id,
       e.full_name AS employee_name,
       e.role AS employee_role,
       e.designation,
       e.employment_type,
       e.department_id AS emp_department_id,
       e.managed_department_ids,
       e.reporting_manager_id
     FROM users u
     LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
     WHERE u.id = $1 AND u.is_deleted = FALSE
     LIMIT 1;`,
    [userId]
  );

  const row = res.rows[0] || {};
  const effectiveRole = row.employee_role || row.user_role || user?.role || "INTERN";
  const effectiveDesignation = row.designation || user?.designation || "";
  const effectiveEmploymentType = row.employment_type || user?.employment_type || "";

  let level = getRoleLevel({
    role: effectiveRole,
    designation: effectiveDesignation,
    employmentType: effectiveEmploymentType,
  });
  if (level === 0) level = REPORT_ROLE_LEVELS.INTERN;

  const departmentId = row.emp_department_id || row.user_department_id || user?.department_id || null;
  const managedDepts = Array.isArray(row.managed_department_ids)
    ? row.managed_department_ids.map(Number).filter(Boolean)
    : [];
  const allowedDepartmentIds = Array.from(
    new Set([...(departmentId ? [Number(departmentId)] : []), ...managedDepts])
  );

  return {
    userId,
    employeeId: row.employee_id || null,
    fullName: row.employee_name || row.user_name || user?.full_name || "User",
    role: effectiveRole,
    designation: effectiveDesignation,
    level,
    roleLabel: ROLE_LABELS_BY_LEVEL[level] || "INTERN",
    departmentId: departmentId ? Number(departmentId) : null,
    allowedDepartmentIds,
    reportingManagerId: row.reporting_manager_id || null,
    reportsToUserId: row.reports_to || null,
  };
};

/**
 * Recursive CTE helper: Get all subordinate user IDs for a given user based on the 6-tier hierarchy:
 * 6. Super Admin -> All users
 * 5. HR -> All Department Heads, TLs, Sub-TLs, Interns
 * 4. Department Head -> All users in their department(s) (TL, Sub-TL, Intern) + direct tree subordinates
 * 3. TL -> All Sub-TLs and Interns in their recursive reporting tree
 * 2. Sub-TL -> All Interns in their recursive reporting tree
 * 1. Intern -> Only themselves
 */
export const getSubordinateUserIds = async (user, clientOrPool = pool) => {
  const profile = await getActorHierarchyProfile(clientOrPool, user);

  if (profile.level === REPORT_ROLE_LEVELS.SUPER_ADMIN) {
    const allRes = await clientOrPool.query(
      `SELECT id FROM users WHERE is_deleted = FALSE;`
    );
    return allRes.rows.map((r) => Number(r.id));
  }

  if (profile.level === REPORT_ROLE_LEVELS.HR) {
    const hrRes = await clientOrPool.query(
      `SELECT u.id, u.role AS user_role, e.role AS emp_role, e.designation, e.employment_type
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       WHERE u.is_deleted = FALSE;`
    );
    return hrRes.rows
      .filter((r) => {
        const lvl = getRoleLevel({
          role: r.emp_role || r.user_role,
          designation: r.designation,
          employmentType: r.employment_type,
        });
        return lvl < REPORT_ROLE_LEVELS.HR || Number(r.id) === profile.userId;
      })
      .map((r) => Number(r.id));
  }

  // Recursive reporting tree query (supports both employees.reporting_manager_id and users.reports_to)
  const treeRes = await clientOrPool.query(
    `WITH RECURSIVE subordinates AS (
       SELECT u.id AS user_id, e.id AS emp_id, ARRAY[u.id]::bigint[] AS visited
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       WHERE u.id = $1 AND u.is_deleted = FALSE
       UNION ALL
       SELECT child_u.id AS user_id, child_e.id AS emp_id, s.visited || child_u.id
       FROM users child_u
       LEFT JOIN employees child_e ON child_e.user_id = child_u.id AND child_e.is_deleted = FALSE
       JOIN subordinates s ON (
         (child_e.reporting_manager_id IS NOT NULL AND child_e.reporting_manager_id = s.emp_id)
         OR (child_u.reports_to IS NOT NULL AND child_u.reports_to = s.user_id)
       )
       WHERE child_u.is_deleted = FALSE
         AND NOT (child_u.id = ANY(s.visited))
     )
     SELECT DISTINCT user_id FROM subordinates WHERE user_id IS NOT NULL;`,
    [profile.userId]
  );

  const subordinateIds = new Set(treeRes.rows.map((r) => Number(r.user_id)));

  // If Department Head, also include everyone in their managed/assigned department(s) below level 4
  if (
    profile.level === REPORT_ROLE_LEVELS.DEPARTMENT_HEAD &&
    profile.allowedDepartmentIds.length > 0
  ) {
    const deptRes = await clientOrPool.query(
      `SELECT u.id, u.role AS user_role, e.role AS emp_role, e.designation, e.employment_type
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       WHERE u.is_deleted = FALSE
         AND COALESCE(e.department_id, u.department_id) = ANY($1::bigint[]);`,
      [profile.allowedDepartmentIds]
    );
    for (const r of deptRes.rows) {
      const lvl = getRoleLevel({
        role: r.emp_role || r.user_role,
        designation: r.designation,
        employmentType: r.employment_type,
      });
      if (lvl < REPORT_ROLE_LEVELS.DEPARTMENT_HEAD) {
        subordinateIds.add(Number(r.id));
      }
    }
  }

  subordinateIds.add(profile.userId);
  return Array.from(subordinateIds);
};

/**
 * Build the ordered approval steps for a report submission and persist in report_approvals
 * Chain order: Intern (1) -> Sub-TL (2) -> TL (3) -> Department Head (4) -> HR (5) -> Super Admin (6)
 */
export const buildAndPersistApprovalChain = async (client, report, submitterUser) => {
  const submitterProfile = await getActorHierarchyProfile(client, submitterUser);
  const submitterLevel = submitterProfile.level || REPORT_ROLE_LEVELS.INTERN;
  const departmentId = report.department_id || submitterProfile.departmentId;

  const stepsByLevel = new Map();

  // 1. Walk up the direct reporting chain (via employees.reporting_manager_id or users.reports_to)
  let currentEmpManagerId = submitterProfile.reportingManagerId;
  let currentUserManagerId = submitterProfile.reportsToUserId;
  const visitedUserIds = new Set([submitterProfile.userId]);

  while (currentEmpManagerId || currentUserManagerId) {
    let mgrRes;
    if (currentEmpManagerId) {
      mgrRes = await client.query(
        `SELECT u.id AS user_id, u.full_name, u.role AS user_role, u.is_active, u.is_deleted AS user_deleted,
                u.reports_to, u.department_id AS user_dept_id,
                e.id AS emp_id, e.role AS emp_role, e.designation, e.employment_type,
                e.department_id AS emp_dept_id, e.reporting_manager_id, e.status AS emp_status, e.is_deleted AS emp_deleted
         FROM employees e
         JOIN users u ON u.id = e.user_id
         WHERE e.id = $1
         LIMIT 1;`,
        [currentEmpManagerId]
      );
    } else {
      mgrRes = await client.query(
        `SELECT u.id AS user_id, u.full_name, u.role AS user_role, u.is_active, u.is_deleted AS user_deleted,
                u.reports_to, u.department_id AS user_dept_id,
                e.id AS emp_id, e.role AS emp_role, e.designation, e.employment_type,
                e.department_id AS emp_dept_id, e.reporting_manager_id, e.status AS emp_status, e.is_deleted AS emp_deleted
         FROM users u
         LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
         WHERE u.id = $1
         LIMIT 1;`,
        [currentUserManagerId]
      );
    }

    const mgr = mgrRes.rows[0];
    if (!mgr || visitedUserIds.has(Number(mgr.user_id))) break;
    visitedUserIds.add(Number(mgr.user_id));

    const isActive =
      mgr.is_active !== false &&
      mgr.user_deleted !== true &&
      mgr.emp_deleted !== true &&
      (!mgr.emp_status || String(mgr.emp_status).toUpperCase() === "ACTIVE");

    if (isActive) {
      const mgrLevel = getRoleLevel({
        role: mgr.emp_role || mgr.user_role,
        designation: mgr.designation,
        employmentType: mgr.employment_type,
      });

      if (mgrLevel > submitterLevel && !stepsByLevel.has(mgrLevel)) {
        stepsByLevel.set(mgrLevel, {
          approverId: Number(mgr.user_id),
          level: mgrLevel,
          roleLabel: ROLE_LABELS_BY_LEVEL[mgrLevel] || "TL",
        });
      }
    }

    currentEmpManagerId = mgr.reporting_manager_id || null;
    currentUserManagerId = mgr.reports_to || null;
  }

  // 2. Fallback: If Department Head (Level 4) is above submitter and not yet in chain, find active Department Head for department
  if (submitterLevel < REPORT_ROLE_LEVELS.DEPARTMENT_HEAD && !stepsByLevel.has(REPORT_ROLE_LEVELS.DEPARTMENT_HEAD) && departmentId) {
    const deptHeadRes = await client.query(
      `SELECT u.id AS user_id, u.role AS user_role, e.role AS emp_role, e.designation
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
           UPPER(COALESCE(e.role, '')) IN ('MANAGER', 'DEPARTMENT_HEAD')
           OR UPPER(COALESCE(u.role, '')) IN ('MANAGER', 'DEPARTMENT_HEAD')
           OR LOWER(COALESCE(e.designation, '')) LIKE '%department head%'
           OR LOWER(COALESCE(e.designation, '')) LIKE '%head of department%'
           OR LOWER(COALESCE(e.designation, '')) LIKE '%manager%'
         )
       ORDER BY e.id ASC
       LIMIT 1;`,
      [departmentId]
    );
    if (deptHeadRes.rows[0] && Number(deptHeadRes.rows[0].user_id) !== submitterProfile.userId) {
      stepsByLevel.set(REPORT_ROLE_LEVELS.DEPARTMENT_HEAD, {
        approverId: Number(deptHeadRes.rows[0].user_id),
        level: REPORT_ROLE_LEVELS.DEPARTMENT_HEAD,
        roleLabel: "DEPARTMENT_HEAD",
      });
    }
  }

  // 3. Fallback: Ensure HR (Level 5) and Super Admin (Level 6) are in the chain if above submitterLevel
  if (submitterLevel < REPORT_ROLE_LEVELS.HR && !stepsByLevel.has(REPORT_ROLE_LEVELS.HR)) {
    const hrRes = await client.query(
      `SELECT u.id AS user_id
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       WHERE u.is_deleted = FALSE
         AND u.is_active = TRUE
         AND (UPPER(u.role) = 'HR' OR UPPER(COALESCE(e.role, '')) = 'HR')
       ORDER BY u.id ASC
       LIMIT 1;`
    );
    if (hrRes.rows[0]) {
      stepsByLevel.set(REPORT_ROLE_LEVELS.HR, {
        approverId: Number(hrRes.rows[0].user_id),
        level: REPORT_ROLE_LEVELS.HR,
        roleLabel: "HR",
      });
    }
  }

  if (submitterLevel < REPORT_ROLE_LEVELS.SUPER_ADMIN && !stepsByLevel.has(REPORT_ROLE_LEVELS.SUPER_ADMIN)) {
    const saRes = await client.query(
      `SELECT u.id AS user_id
       FROM users u
       WHERE u.is_deleted = FALSE
         AND u.is_active = TRUE
         AND UPPER(u.role) = 'SUPER_ADMIN'
       ORDER BY u.id ASC
       LIMIT 1;`
    );
    if (saRes.rows[0]) {
      stepsByLevel.set(REPORT_ROLE_LEVELS.SUPER_ADMIN, {
        approverId: Number(saRes.rows[0].user_id),
        level: REPORT_ROLE_LEVELS.SUPER_ADMIN,
        roleLabel: "SUPER_ADMIN",
      });
    }
  }

  const orderedSteps = Array.from(stepsByLevel.values()).sort((a, b) => a.level - b.level);

  // Clear existing pending/rejected approval steps for this report before inserting fresh chain
  await client.query(`DELETE FROM report_approvals WHERE report_id = $1;`, [report.id]);

  for (const step of orderedSteps) {
    await client.query(
      `INSERT INTO report_approvals (
         report_id, approver_id, level, role_label, status, is_auto_approved
       )
       VALUES ($1, $2, $3, $4, 'PENDING', FALSE)
       ON CONFLICT (report_id, level)
       DO UPDATE SET
         approver_id = EXCLUDED.approver_id,
         role_label = EXCLUDED.role_label,
         status = 'PENDING',
         remarks = NULL,
         is_auto_approved = FALSE,
         acted_by_id = NULL,
         acted_at = NULL,
         updated_at = CURRENT_TIMESTAMP;`,
      [report.id, step.approverId, step.level, step.roleLabel]
    );
  }

  const firstStep = orderedSteps[0] || null;
  const currentStatus = firstStep ? "PENDING" : "APPROVED";
  const mainStatus = firstStep ? "SUBMITTED" : "SUPER_ADMIN_APPROVED";

  await client.query(
    `UPDATE daily_work_reports
     SET current_level_user_id = $1,
         current_approval_level = $2,
         current_status = $3,
         status = $4,
         rejection_reason = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5;`,
    [
      firstStep ? firstStep.approverId : null,
      firstStep ? firstStep.level : null,
      currentStatus,
      mainStatus,
      report.id,
    ]
  );

  // Notify direct reporting manager (first approver in chain)
  if (firstStep?.approverId) {
    await createReportNotification(client, {
      userId: firstStep.approverId,
      actorUserId: submitterProfile.userId,
      type: "REPORT_SUBMITTED",
      title: `New Report Submitted by ${submitterProfile.fullName}`,
      message: `${submitterProfile.fullName} (${submitterProfile.roleLabel}) submitted a work report for ${report.report_date}. Pending your review.`,
      link: "/employee/team-reports",
      priority: "NORMAL",
    });
  }

  invalidateReportVisibilityCache();
  return orderedSteps;
};

/**
 * Fetch approval timeline rows for one or more report IDs
 */
export const getApprovalsByReportIds = async (reportIds = [], clientOrPool = pool) => {
  const cleanIds = Array.from(new Set(reportIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  if (cleanIds.length === 0) return new Map();

  try {
    const res = await clientOrPool.query(
      `SELECT
         ra.id,
         ra.report_id,
         ra.approver_id,
         approver_u.full_name AS approver_name,
         ra.acted_by_id,
         actor_u.full_name AS acted_by_name,
         ra.level,
         ra.role_label,
         ra.status,
         ra.remarks,
         ra.is_auto_approved,
         ra.acted_at,
         ra.created_at
       FROM report_approvals ra
       LEFT JOIN users approver_u ON approver_u.id = ra.approver_id
       LEFT JOIN users actor_u ON actor_u.id = ra.acted_by_id
       WHERE ra.report_id = ANY($1::bigint[])
       ORDER BY ra.report_id ASC, ra.level ASC;`,
      [cleanIds]
    );

    const map = new Map();
    for (const row of res.rows) {
      const rId = Number(row.report_id);
      if (!map.has(rId)) map.set(rId, []);
      map.get(rId).push(row);
    }
    return map;
  } catch {
    return new Map();
  }
};

/**
 * Attach approval timeline array to a single report or list of reports
 */
export const attachApprovalsToReports = async (reportsOrSingle, clientOrPool = pool) => {
  if (!reportsOrSingle) return reportsOrSingle;
  const isArray = Array.isArray(reportsOrSingle);
  const list = isArray ? reportsOrSingle : [reportsOrSingle];
  if (list.length === 0) return reportsOrSingle;

  const map = await getApprovalsByReportIds(
    list.map((r) => r.id),
    clientOrPool
  );

  for (const r of list) {
    r.approvals = map.get(Number(r.id)) || [];
  }

  return isArray ? list : list[0];
};

/**
 * Verify whether an acting reviewer can act (approve/reject) on a target report
 */
const assertCanReviewReport = async (client, actorProfile, report, existingApprovals) => {
  if (Number(report.user_id) === actorProfile.userId) {
    throw new ApiError(403, "You cannot approve or reject your own report.");
  }

  const submitterProfile = await getActorHierarchyProfile(client, { id: report.user_id });

  if (actorProfile.level <= submitterProfile.level) {
    throw new ApiError(
      403,
      `Insufficient role hierarchy level. Reviewer level (${actorProfile.roleLabel}) must be higher than submitter (${submitterProfile.roleLabel}).`
    );
  }

  // Super Admin and HR have organization-wide authority above lower roles
  if (
    actorProfile.level === REPORT_ROLE_LEVELS.SUPER_ADMIN ||
    actorProfile.level === REPORT_ROLE_LEVELS.HR
  ) {
    return submitterProfile;
  }

  // Check if directly assigned in report_approvals or current_level_user_id
  const isAssignedApprover =
    Number(report.current_level_user_id) === actorProfile.userId ||
    existingApprovals.some((a) => Number(a.approver_id) === actorProfile.userId);

  if (isAssignedApprover) {
    return submitterProfile;
  }

  // Check tree / department subordinate visibility
  const subordinateIds = await getSubordinateUserIds({ id: actorProfile.userId, role: actorProfile.role }, client);
  if (!subordinateIds.includes(Number(report.user_id))) {
    throw new ApiError(403, "You can only review reports of users under your hierarchy or department.");
  }

  return submitterProfile;
};

/**
 * ============================================================================
 * APPROVE REPORT (With Skip / Auto-Approval Logic for Lower Levels)
 * ============================================================================
 * - If a higher authority (e.g. Department Head, Level 4) approves a report while
 *   Sub-TL (Level 2) or TL (Level 3) is still PENDING, all lower pending levels
 *   are automatically marked APPROVED with is_auto_approved = TRUE, acted_by_id = actor.
 * - Forwards report to the next upper level in the chain (or completes if Super Admin).
 */
export const approveReportHierarchicalService = async (user, reportId, payload = {}) => {
  const cleanReportId = Number(reportId);
  if (!Number.isInteger(cleanReportId) || cleanReportId <= 0) {
    throw new ApiError(400, "Valid report ID is required.");
  }

  const remarks = (payload.remarks || payload.feedback || "").trim() || null;

  const updatedReportId = await withTransaction(async (client) => {
    const reportRes = await client.query(
      `SELECT * FROM daily_work_reports WHERE id = $1 FOR UPDATE;`,
      [cleanReportId]
    );
    const report = reportRes.rows[0];
    if (!report) {
      throw new ApiError(404, "Report not found.");
    }

    if (
      String(report.status).toUpperCase() === "REVISION_REQUESTED" ||
      String(report.current_status).toUpperCase() === "REJECTED"
    ) {
      throw new ApiError(400, "This report was rejected. The submitter must edit and resubmit it before approval.");
    }

    if (String(report.status).toUpperCase() === "SUPER_ADMIN_APPROVED") {
      throw new ApiError(400, "This report has already received final approval from Super Admin.");
    }

    const actorProfile = await getActorHierarchyProfile(client, user);
    const approvalsRes = await client.query(
      `SELECT * FROM report_approvals WHERE report_id = $1 ORDER BY level ASC FOR UPDATE;`,
      [cleanReportId]
    );
    let approvals = approvalsRes.rows;

    // If legacy report had no report_approvals rows yet, initialize them now
    if (approvals.length === 0) {
      await buildAndPersistApprovalChain(client, report, { id: report.user_id });
      const refreshed = await client.query(
        `SELECT * FROM report_approvals WHERE report_id = $1 ORDER BY level ASC FOR UPDATE;`,
        [cleanReportId]
      );
      approvals = refreshed.rows;
    }

    await assertCanReviewReport(client, actorProfile, report, approvals);

    const actorLevel = actorProfile.level;
    const autoApprovalNote = `Auto-approved by higher authority (${actorProfile.fullName} - ${actorProfile.roleLabel})`;

    // 1. SKIP / AUTO-APPROVAL LOGIC:
    // Mark all lower levels (< actorLevel) that are currently PENDING as auto-approved
    await client.query(
      `UPDATE report_approvals
       SET status = 'APPROVED',
           is_auto_approved = TRUE,
           acted_by_id = $1,
           acted_at = CURRENT_TIMESTAMP,
           remarks = COALESCE(remarks, $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE report_id = $3
         AND level < $4
         AND status = 'PENDING';`,
      [actorProfile.userId, autoApprovalNote, cleanReportId, actorLevel]
    );

    // 2. Mark the actor's own level as directly APPROVED (is_auto_approved = FALSE)
    await client.query(
      `INSERT INTO report_approvals (
         report_id, approver_id, acted_by_id, level, role_label, status, remarks, is_auto_approved, acted_at
       )
       VALUES ($1, $2, $2, $3, $4, 'APPROVED', $5, FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (report_id, level)
       DO UPDATE SET
         acted_by_id = EXCLUDED.acted_by_id,
         status = 'APPROVED',
         remarks = COALESCE(EXCLUDED.remarks, report_approvals.remarks),
         is_auto_approved = FALSE,
         acted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP;`,
      [
        cleanReportId,
        actorProfile.userId,
        actorLevel,
        actorProfile.roleLabel,
        remarks || `Approved by ${actorProfile.roleLabel}`,
      ]
    );

    // 3. Find the next pending level above actorLevel
    const nextRes = await client.query(
      `SELECT * FROM report_approvals
       WHERE report_id = $1 AND level > $2 AND status = 'PENDING'
       ORDER BY level ASC
       LIMIT 1;`,
      [cleanReportId, actorLevel]
    );
    const nextStep = nextRes.rows[0] || null;

    let nextStatus = "TL_REVIEWED";
    let nextCurrentStatus = "IN_REVIEW";
    if (!nextStep || actorLevel >= REPORT_ROLE_LEVELS.SUPER_ADMIN) {
      nextStatus = "SUPER_ADMIN_APPROVED";
      nextCurrentStatus = "APPROVED";
    } else if (actorLevel === REPORT_ROLE_LEVELS.HR) {
      nextStatus = "HR_APPROVED";
    }

    // Update legacy columns alongside new hierarchy columns
    await client.query(
      `UPDATE daily_work_reports
       SET status = $1,
           current_status = $2,
           current_level_user_id = $3,
           current_approval_level = $4,
           tl_id = CASE WHEN $5 IN (2, 3, 4) THEN $6 ELSE tl_id END,
           tl_reviewed_at = CASE WHEN $5 IN (2, 3, 4) THEN CURRENT_TIMESTAMP ELSE tl_reviewed_at END,
           tl_feedback = CASE WHEN $5 IN (2, 3, 4) AND $7::text IS NOT NULL THEN $7 ELSE tl_feedback END,
           hr_id = CASE WHEN $5 = 5 THEN $6 ELSE hr_id END,
           hr_reviewed_at = CASE WHEN $5 = 5 THEN CURRENT_TIMESTAMP ELSE hr_reviewed_at END,
           hr_feedback = CASE WHEN $5 = 5 AND $7::text IS NOT NULL THEN $7 ELSE hr_feedback END,
           super_admin_id = CASE WHEN $5 = 6 THEN $6 ELSE super_admin_id END,
           super_admin_reviewed_at = CASE WHEN $5 = 6 THEN CURRENT_TIMESTAMP ELSE super_admin_reviewed_at END,
           super_admin_feedback = CASE WHEN $5 = 6 AND $7::text IS NOT NULL THEN $7 ELSE super_admin_feedback END,
           rejection_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8;`,
      [
        nextStatus,
        nextCurrentStatus,
        nextStep ? nextStep.approver_id : null,
        nextStep ? nextStep.level : null,
        actorLevel,
        actorProfile.userId,
        remarks,
        cleanReportId,
      ]
    );

    // 4. Send notifications to submitter and next approver
    if (nextStep) {
      await createReportNotification(client, {
        userId: report.user_id,
        actorUserId: actorProfile.userId,
        type: "REPORT_APPROVED_STEP",
        title: `Report Verified by ${actorProfile.roleLabel}`,
        message: `${actorProfile.fullName} (${actorProfile.roleLabel}) approved your report for ${report.report_date}. Forwarded to ${nextStep.role_label}.`,
        link: "/employee/my-report",
      });

      if (nextStep.approver_id) {
        await createReportNotification(client, {
          userId: nextStep.approver_id,
          actorUserId: actorProfile.userId,
          type: "REPORT_PENDING_APPROVAL",
          title: `Report Forwarded for ${nextStep.role_label} Approval`,
          message: `A report for ${report.report_date} was verified by ${actorProfile.fullName} (${actorProfile.roleLabel}) and is now awaiting your approval.`,
          link: "/employee/team-reports",
        });
      }
    } else {
      await createReportNotification(client, {
        userId: report.user_id,
        actorUserId: actorProfile.userId,
        type: "REPORT_FINAL_APPROVED",
        title: `Report Final Approved!`,
        message: `Your work report for ${report.report_date} has been completely verified and approved by ${actorProfile.fullName} (${actorProfile.roleLabel}).`,
        link: "/employee/my-report",
      });
    }

    return cleanReportId;
  });

  // Fetch full report with updated approvals
  const { findReportByIdRepository } = await import("../repositories/reportRepository.js");
  const fullReport = await findReportByIdRepository(updatedReportId);
  return await attachApprovalsToReports(fullReport);
};

/**
 * ============================================================================
 * REJECT REPORT (Sends back to Submitter with Remarks for Edit & Resubmit)
 * ============================================================================
 */
export const rejectReportHierarchicalService = async (user, reportId, payload = {}) => {
  const cleanReportId = Number(reportId);
  if (!Number.isInteger(cleanReportId) || cleanReportId <= 0) {
    throw new ApiError(400, "Valid report ID is required.");
  }

  const remarks = (payload.remarks || payload.feedback || payload.rejection_reason || "").trim();
  if (!remarks) {
    throw new ApiError(400, "Rejection remarks/feedback are required when rejecting a report.");
  }

  const updatedReportId = await withTransaction(async (client) => {
    const reportRes = await client.query(
      `SELECT * FROM daily_work_reports WHERE id = $1 FOR UPDATE;`,
      [cleanReportId]
    );
    const report = reportRes.rows[0];
    if (!report) {
      throw new ApiError(404, "Report not found.");
    }

    const actorProfile = await getActorHierarchyProfile(client, user);
    const approvalsRes = await client.query(
      `SELECT * FROM report_approvals WHERE report_id = $1 ORDER BY level ASC FOR UPDATE;`,
      [cleanReportId]
    );
    let approvals = approvalsRes.rows;
    if (approvals.length === 0) {
      await buildAndPersistApprovalChain(client, report, { id: report.user_id });
      const refreshed = await client.query(
        `SELECT * FROM report_approvals WHERE report_id = $1 ORDER BY level ASC FOR UPDATE;`,
        [cleanReportId]
      );
      approvals = refreshed.rows;
    }

    await assertCanReviewReport(client, actorProfile, report, approvals);

    const actorLevel = actorProfile.level;

    await client.query(
      `INSERT INTO report_approvals (
         report_id, approver_id, acted_by_id, level, role_label, status, remarks, is_auto_approved, acted_at
       )
       VALUES ($1, $2, $2, $3, $4, 'REJECTED', $5, FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (report_id, level)
       DO UPDATE SET
         acted_by_id = EXCLUDED.acted_by_id,
         status = 'REJECTED',
         remarks = EXCLUDED.remarks,
         is_auto_approved = FALSE,
         acted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP;`,
      [cleanReportId, actorProfile.userId, actorLevel, actorProfile.roleLabel, remarks]
    );

    await client.query(
      `UPDATE daily_work_reports
       SET status = 'REVISION_REQUESTED',
           current_status = 'REJECTED',
           rejection_reason = $1,
           current_level_user_id = user_id,
           current_approval_level = 1,
           tl_feedback = CASE WHEN $2 IN (2, 3, 4) THEN $1 ELSE tl_feedback END,
           hr_feedback = CASE WHEN $2 = 5 THEN $1 ELSE hr_feedback END,
           super_admin_feedback = CASE WHEN $2 = 6 THEN $1 ELSE super_admin_feedback END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3;`,
      [remarks, actorLevel, cleanReportId]
    );

    await createReportNotification(client, {
      userId: report.user_id,
      actorUserId: actorProfile.userId,
      type: "REPORT_REJECTED",
      title: `Report Rejected by ${actorProfile.roleLabel}`,
      message: `${actorProfile.fullName} (${actorProfile.roleLabel}) requested changes on your report for ${report.report_date}: "${remarks}". Please edit and resubmit.`,
      link: "/employee/my-report",
      priority: "HIGH",
    });

    return cleanReportId;
  });

  const { findReportByIdRepository } = await import("../repositories/reportRepository.js");
  const fullReport = await findReportByIdRepository(updatedReportId);
  return await attachApprovalsToReports(fullReport);
};

/**
 * ============================================================================
 * EDIT & RESUBMIT REJECTED REPORT (PUT /api/reports/:id)
 * ============================================================================
 */
export const editAndResubmitReportService = async (user, reportId, payload = {}) => {
  const cleanReportId = Number(reportId);
  if (!Number.isInteger(cleanReportId) || cleanReportId <= 0) {
    throw new ApiError(400, "Valid report ID is required.");
  }

  const updatedReportId = await withTransaction(async (client) => {
    const reportRes = await client.query(
      `SELECT * FROM daily_work_reports WHERE id = $1 FOR UPDATE;`,
      [cleanReportId]
    );
    const report = reportRes.rows[0];
    if (!report) {
      throw new ApiError(404, "Report not found.");
    }

    if (Number(report.user_id) !== Number(user.id)) {
      throw new ApiError(403, "Only the report author can edit and resubmit this report.");
    }

    const workTitle = payload.work_title !== undefined ? payload.work_title : (payload.title !== undefined ? payload.title : report.work_title);
    const tasksSummary = (payload.tasks_summary || payload.content || report.tasks_summary || "").trim();
    if (!tasksSummary) {
      throw new ApiError(400, "Report content / tasks summary cannot be empty.");
    }

    const deliverableLinks = payload.deliverable_links !== undefined ? payload.deliverable_links : report.deliverable_links;
    const blockers = payload.blockers !== undefined ? payload.blockers : report.blockers;
    const nextDayPlan = payload.next_day_plan !== undefined ? payload.next_day_plan : report.next_day_plan;
    const workStatus = payload.work_status || report.work_status || "COMPLETED";

    const updateRes = await client.query(
      `UPDATE daily_work_reports
       SET work_title = $1,
           tasks_summary = $2,
           deliverable_links = $3,
           blockers = $4,
           next_day_plan = $5,
           work_status = $6,
           status = 'SUBMITTED',
           current_status = 'PENDING',
           rejection_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *;`,
      [workTitle, tasksSummary, deliverableLinks, blockers, nextDayPlan, workStatus, cleanReportId]
    );

    const updatedReport = updateRes.rows[0];

    // Re-initialize approval chain from the direct reporting manager
    await buildAndPersistApprovalChain(client, updatedReport, user);

    return cleanReportId;
  });

  const { findReportByIdRepository } = await import("../repositories/reportRepository.js");
  const fullReport = await findReportByIdRepository(updatedReportId);
  return await attachApprovalsToReports(fullReport);
};

/**
 * ============================================================================
 * GET PENDING APPROVALS FOR CURRENT USER (GET /api/reports/pending-for-me)
 * ============================================================================
 */
export const getPendingApprovalsForMeService = async (user, query = {}) => {
  const actorProfile = await getActorHierarchyProfile(pool, user);

  if (actorProfile.level <= REPORT_ROLE_LEVELS.INTERN) {
    return { reports: [], total: 0, page: 1, limit: 25 };
  }

  const subordinateUserIds = await getSubordinateUserIds(user, pool);
  const includeHigherAuthoritySkip = query.includeSkipEligible !== "false";

  const values = [actorProfile.userId, actorProfile.level];
  let paramIdx = 3;

  const whereClauses = [
    `r.user_id <> $1`,
    `r.status NOT IN ('SUPER_ADMIN_APPROVED', 'REVISION_REQUESTED')`,
    `COALESCE(r.current_status, 'PENDING') <> 'REJECTED'`,
  ];

  if (includeHigherAuthoritySkip) {
    // Show reports directly at actor's level OR pending at a lower level within actor's subordinate visibility
    values.push(subordinateUserIds);
    whereClauses.push(`(
      r.current_level_user_id = $1
      OR EXISTS (
        SELECT 1 FROM report_approvals ra
        WHERE ra.report_id = r.id
          AND ra.approver_id = $1
          AND ra.status = 'PENDING'
      )
      OR (
        r.user_id = ANY($${paramIdx++}::bigint[])
        AND COALESCE(r.current_approval_level, 2) <= $2
      )
    )`);
  } else {
    whereClauses.push(`(
      r.current_level_user_id = $1
      OR EXISTS (
        SELECT 1 FROM report_approvals ra
        WHERE ra.report_id = r.id
          AND ra.approver_id = $1
          AND ra.status = 'PENDING'
      )
    )`);
  }

  if (query.departmentId && query.departmentId !== "ALL") {
    whereClauses.push(`(r.department_id = $${paramIdx++} OR e.department_id = $${paramIdx - 1})`);
    values.push(Number(query.departmentId));
  }

  if (query.date) {
    whereClauses.push(`r.report_date = $${paramIdx++}`);
    values.push(query.date);
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const offset = (page - 1) * limit;

  const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

  const countRes = await pool.query(
    `SELECT COUNT(*) AS total
     FROM daily_work_reports r
     LEFT JOIN employees e ON r.employee_id = e.id
     ${whereSql};`,
    values
  );
  const total = parseInt(countRes.rows[0]?.total || "0", 10);

  values.push(limit, offset);
  const dataRes = await pool.query(
    `SELECT
       r.*,
       u.full_name AS user_name,
       u.email AS user_email,
       u.profile_image AS user_avatar,
       e.employee_code,
       e.designation,
       e.employment_type,
       e.role AS employee_role,
       e.reporting_manager_id,
       m.full_name AS mentor_name,
       COALESCE(d.department_name, 'General') AS department_name,
       curr_u.full_name AS current_approver_name
     FROM daily_work_reports r
     LEFT JOIN users u ON r.user_id = u.id
     LEFT JOIN employees e ON r.employee_id = e.id
     LEFT JOIN employees m ON e.reporting_manager_id = m.id
     LEFT JOIN departments d ON COALESCE(r.department_id, e.department_id) = d.id
     LEFT JOIN users curr_u ON r.current_level_user_id = curr_u.id
     ${whereSql}
     ORDER BY
       CASE WHEN r.current_level_user_id = $1 THEN 0 ELSE 1 END ASC,
       r.report_date DESC,
       r.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++};`,
    values
  );

  const reports = await attachApprovalsToReports(dataRes.rows);
  return {
    reports,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

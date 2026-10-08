import pool from "../config/db.js";

export const REPORT_ROLE_LEVELS = Object.freeze({
  INTERN: 1,
  SUB_TL: 2,
  TL: 3,
  DEPARTMENT_HEAD: 4,
  HR: 5,
  SUPER_ADMIN: 6,
});

export const getRoleLevel = ({ role, designation, employmentType } = {}) => {
  const normalizedRole = String(role || "").toUpperCase();
  const normalizedDesignation = String(designation || "").toLowerCase();
  const normalizedEmploymentType = String(employmentType || "").toUpperCase();

  if (normalizedRole === "SUPER_ADMIN" || normalizedDesignation.includes("superadmin")) return REPORT_ROLE_LEVELS.SUPER_ADMIN;
  if (normalizedRole === "HR" || normalizedDesignation.includes("hr") || normalizedDesignation.includes("human resources")) return REPORT_ROLE_LEVELS.HR;
  if (
    normalizedDesignation.includes("sub-team lead") ||
    normalizedDesignation.includes("sub team lead") ||
    normalizedDesignation.includes("sub tl") ||
    normalizedDesignation.includes("sub-team leader")
  ) return REPORT_ROLE_LEVELS.SUB_TL;
  if (
    normalizedRole === "MANAGER" ||
    normalizedDesignation.includes("department head") ||
    normalizedDesignation.includes("manager") ||
    normalizedDesignation.includes("head of department")
  ) return REPORT_ROLE_LEVELS.DEPARTMENT_HEAD;
  if (
    normalizedRole === "TL" ||
    normalizedDesignation.includes("team lead") ||
    normalizedDesignation.includes("team leader") ||
    normalizedDesignation.includes("leader") ||
    normalizedDesignation.includes("supervisor")
  ) return REPORT_ROLE_LEVELS.TL;
  if (normalizedRole === "INTERN" || normalizedEmploymentType === "INTERN" || normalizedDesignation.includes("intern")) return REPORT_ROLE_LEVELS.INTERN;

  return 0;
};

export const canDepartmentHeadVerifyReport = ({
  reviewerUserId,
  reviewerRole,
  reviewerDesignation,
  reviewerDepartmentIds = [],
  report,
} = {}) => {
  if (getRoleLevel({ role: reviewerRole, designation: reviewerDesignation }) !== REPORT_ROLE_LEVELS.DEPARTMENT_HEAD) {
    return false;
  }

  if (String(report?.status || "").toUpperCase() !== "SUBMITTED") {
    return false;
  }

  const reportDepartmentId = Number(report.department_id);
  if (!Number.isInteger(reportDepartmentId) || reportDepartmentId <= 0) {
    return false;
  }

  return reviewerDepartmentIds.some((departmentId) => Number(departmentId) === reportDepartmentId)
    && Number(reviewerUserId) !== Number(report.user_id);
};

const normalizeRoleName = (value) => {
  if (!value) return "EMPLOYEE";
  const clean = String(value).trim().toUpperCase();
  if (clean === "SUB_TL" || clean === "SUB-TL") return "SUB_TL";
  return clean;
};

const getPureUserRole = (user) => {
  if (!user) return "EMPLOYEE";

  const role = normalizeRoleName(user.role || user.user_role || user.employee_role || "");
  if (role === "ADMIN") return "MANAGER";
  return role;
};

const getUserEmployeeRecord = async (userId) => {
  const result = await pool.query(
    `SELECT e.id, e.user_id, e.full_name, e.role, e.designation, e.department_id, e.reporting_manager_id, e.status,
            u.role AS user_role, u.full_name AS user_name
     FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.user_id = $1 AND e.is_deleted = FALSE
     LIMIT 1;`,
    [userId]
  );

  return result.rows[0] || null;
};

export const getReportingChain = async (userId) => {
  const lead = await getUserEmployeeRecord(userId);
  if (!lead) return [];

  const chain = [];
  let current = lead;
  let visited = new Set();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const currentLevel = getRoleLevel({
      role: getPureUserRole(current),
      designation: current.designation,
      employmentType: current.employment_type,
    });

    chain.push({
      id: current.id,
      userId: current.user_id,
      fullName: current.full_name || current.user_name || "Unknown",
      role: getPureUserRole(current),
      designation: current.designation || "Employee",
      departmentId: current.department_id,
      reportingManagerId: current.reporting_manager_id || null,
      level: currentLevel || 0,
    });

    if (!current.reporting_manager_id) break;

    const managerRes = await pool.query(
      `SELECT e.id, e.user_id, e.full_name, e.role, e.designation, e.department_id, e.reporting_manager_id, e.employment_type,
              u.role AS user_role
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.id = $1 AND e.is_deleted = FALSE
       LIMIT 1;`,
      [current.reporting_manager_id]
    );

    current = managerRes.rows[0] || null;
  }

  return chain;
};

export const buildApprovalChain = async ({ submitterUserId, submitterRole, submitterDesignation, departmentId }) => {
  const submitterLevel = getRoleLevel({
    role: submitterRole,
    designation: submitterDesignation,
  });

  if (!submitterUserId) {
    throw new Error("Submitter user id is required.");
  }

  const chain = [];
  const seenUserIds = new Set();

  const directLine = await getReportingChain(submitterUserId);

  for (const person of directLine) {
    const level = Number(person.level || 0);
    if (level <= submitterLevel || level === 0) continue;
    if (!person.userId || seenUserIds.has(person.userId)) continue;

    if (level === REPORT_ROLE_LEVELS.DEPARTMENT_HEAD && departmentId && Number(person.departmentId) !== Number(departmentId)) {
      continue;
    }

    seenUserIds.add(person.userId);
    chain.push({
      userId: person.userId,
      level,
      role: person.role,
      designation: person.designation,
      fullName: person.fullName,
      departmentId: person.departmentId,
      source: "reporting_line",
    });
  }

  const globalApprovers = await pool.query(
    `SELECT u.id, u.full_name, e.role, e.designation, e.department_id
     FROM users u
     LEFT JOIN employees e ON e.user_id = u.id
     WHERE u.role IN ('HR', 'SUPER_ADMIN', 'ADMIN')
       AND u.is_active = TRUE
       AND (e.is_deleted IS NULL OR e.is_deleted = FALSE);`
  );

  for (const approver of globalApprovers.rows) {
    const level = getRoleLevel({
      role: getPureUserRole(approver),
      designation: approver.designation,
    });

    if (level <= submitterLevel || level === 0) continue;
    if (!approver.id || seenUserIds.has(approver.id)) continue;

    chain.push({
      userId: approver.id,
      level,
      role: getPureUserRole(approver),
      designation: approver.designation || "Employee",
      fullName: approver.full_name,
      departmentId: approver.department_id,
      source: "global_role",
    });
  }

  chain.sort((a, b) => a.level - b.level);
  return chain;
};

export const getCurrentApproverForReport = async (report) => {
  if (!report) return null;

  const status = String(report.status || "").toUpperCase();
  if (status === "FULLY_VERIFIED") return null;

  const tlId = report.tl_id ? Number(report.tl_id) : null;
  const hrId = report.hr_id ? Number(report.hr_id) : null;
  const superAdminId = report.super_admin_id ? Number(report.super_admin_id) : null;
  const currentStatus = report.status || "SUBMITTED";

  if (currentStatus === "SUBMITTED" || currentStatus === "TL_REVIEWED") {
    return tlId ? { id: tlId, label: "TL" } : null;
  }

  if (currentStatus === "HR_APPROVED") {
    return hrId ? { id: hrId, label: "HR" } : null;
  }

  if (currentStatus === "SUPER_ADMIN_APPROVED") {
    return superAdminId ? { id: superAdminId, label: "SUPER_ADMIN" } : null;
  }

  return null;
};

export const canUserActOnReport = async (user, report) => {
  if (!user || !report) return false;

  const currentApprover = await getCurrentApproverForReport(report);
  if (!currentApprover) return false;

  if (Number(user.id) === Number(report.user_id)) return false;
  return Number(user.id) === Number(currentApprover.id);
};

export const getHierarchySummary = ({ role, designation }) => {
  const level = getRoleLevel({ role, designation });

  const labels = {
    1: "Intern",
    2: "Sub-TL",
    3: "Team Leader",
    4: "Department Head",
    5: "HR",
    6: "Superadmin",
  };

  return { level, label: labels[level] || "Employee" };
};

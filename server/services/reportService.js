import pool, { withTransaction } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { ensureEmployeeProfileForUser } from "./ensureEmployeeProfile.service.js";
import {
  buildApprovalChain,
  canDepartmentHeadVerifyReport,
  canTeamLeaderVerifyReport,
  getRoleLevel,
  REPORT_ROLE_LEVELS,
} from "./reportHierarchyService.js";
import {
  upsertDailyReportRepository,
  syncReportClassesRepository,
  findReportByIdRepository,
  reportExistsByIdRepository,
  findMyReportByDateRepository,
  findMyReportsHistoryRepository,
  findTeamReportsRepository,
  reviewReportAsTLRepository,
  reviewReportAsHRRepository,
  reviewReportAsSuperAdminRepository,
  findHROverviewRepository,
  findAllCompanyReportsRepository,
  findClassesAuditRepository,
} from "../repositories/reportRepository.js";

/**
 * Helper: format today's date in YYYY-MM-DD (Asia/Kolkata timezone safe)
 */
const getFormattedDate = (dateInput) => {
  if (dateInput) {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  }
  return new Date().toISOString().split("T")[0];
};

/**
 * Submit or Update Daily Work Report (with class logs and video links)
 */
export const submitDailyReportService = async (user, payload) => {
  const userId = user.id;
  const reportDate = getFormattedDate(payload.report_date);

  if (!payload.tasks_summary || !payload.tasks_summary.trim()) {
    throw new ApiError(400, "Today's work summary/tasks description is required.");
  }

  // Ensure employee profile exists to link department and employee_id
  const empProfile = await ensureEmployeeProfileForUser(userId);
  const employeeId = empProfile?.id || null;
  const departmentId = payload.department_id || empProfile?.department_id || null;

  // Determine user's official role_type in operations (strictly fixed by HR in employee profile)
  let roleType = "EXECUTIVE";
  const userRole = String(user.role || "").toUpperCase();
  const empRole = String(empProfile?.role || "").toUpperCase();
  const designation = String(empProfile?.designation || user?.designation || "").toLowerCase();
  const employmentType = String(empProfile?.employment_type || "").toUpperCase();

  if (userRole === "HR" || empRole === "HR") {
    roleType = "HR";
  } else if (
    userRole === "TL" ||
    empRole === "TL" ||
    designation.includes("team lead") ||
    designation.includes("team leader") ||
    designation.includes("leader") ||
    designation.includes("head") ||
    designation.includes("manager")
  ) {
    roleType = "TL";
  } else if (
    userRole === "INTERN" ||
    empRole === "INTERN" ||
    employmentType === "INTERN" ||
    designation.includes("intern")
  ) {
    roleType = "INTERN";
  } else {
    roleType = "EXECUTIVE";
  }

  // Fetch actual attendance in and out for the report date to calculate hours
  let attendanceHours = null;
  if (employeeId) {
    try {
      const attRes = await pool.query(
        `SELECT 
           a.id, a.check_in_time, a.check_out_time, a.total_hours,
           ROUND(
             COALESCE(
               a.total_hours, 
               CASE WHEN a.check_in_time IS NOT NULL 
                 THEN EXTRACT(EPOCH FROM (COALESCE(a.check_out_time, CURRENT_TIMESTAMP) - a.check_in_time))/3600.0 
                 ELSE 0 
               END
             ), 
             2
           ) AS live_hours
         FROM daily_attendance a
         WHERE a.employee_id = $1 AND a.date = $2
         LIMIT 1;`,
        [employeeId, reportDate]
      );
      if (attRes.rows[0]) {
        attendanceHours = parseFloat(attRes.rows[0].live_hours || attRes.rows[0].total_hours || 0);
      } else {
        // Strict attendance-based rule: if no punch-in exists for date, logged hours is 0.0
        attendanceHours = 0.0;
      }
    } catch (attErr) {
      console.error("Error querying attendance hours for report:", attErr);
    }
  }

  // Calculate final total hours worked strictly based on attendance punch-in and punch-out
  const finalHoursWorked = attendanceHours !== null ? attendanceHours : 0.0;

  // Hierarchical approval chain using the actual reporting line.
  // This is intentionally level-based so the same logic works for all roles.
  const hierarchyChain = await buildApprovalChain({
    submitterUserId: userId,
    submitterRole: empProfile?.role || user.role,
    submitterDesignation: empProfile?.designation || user?.designation,
    departmentId: departmentId,
  });

  const nextTlInChain = hierarchyChain.find((step) => step.level === 3);
  const nextHrInChain = hierarchyChain.find((step) => step.level === 5);
  const nextSuperAdminInChain = hierarchyChain.find((step) => step.level === 6);

  // Initial workflow status:
  // - Interns & Executives/Employees -> 'SUBMITTED' (Pending verification in chain)
  // - Department Head / TL -> 'TL_REVIEWED' when they submit from their own level
  // - HR / Super Admin -> 'HR_APPROVED' when they submit directly
  let initialStatus = "SUBMITTED";
  let tlId = nextTlInChain?.userId || null;
  let tlReviewedAt = null;

  const submitterLevel = getRoleLevel({
    role: empProfile?.role || user.role,
    designation: empProfile?.designation || user?.designation,
  });

  if (submitterLevel >= 5 || user.role === "HR" || user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    initialStatus = "HR_APPROVED";
    tlId = nextTlInChain?.userId || null;
  } else if (submitterLevel >= 3 || roleType === "TL" || user.role === "TL" || user.role === "MANAGER") {
    initialStatus = "TL_REVIEWED";
    tlId = userId;
    tlReviewedAt = new Date();
  }

  const tookClass = Boolean(payload.took_class || (payload.classes && payload.classes.length > 0));
  const classesList = Array.isArray(payload.classes) ? payload.classes : [];

  const legacyBlockers = String(payload.blockers || "");
  const legacyInternsMarker = legacyBlockers.indexOf("INTERNS_REPORT:");
  const normalizedBlockers = legacyInternsMarker >= 0
    ? legacyBlockers.slice(0, legacyInternsMarker).trim()
    : legacyBlockers.trim();
  const internsWorkSummary = payload.interns_work_summary || (
    legacyInternsMarker >= 0
      ? legacyBlockers.slice(legacyInternsMarker + "INTERNS_REPORT:".length).trim()
      : ""
  );

  // If user took classes, validate video link for each class
  if (tookClass) {
    if (classesList.length === 0) {
      throw new ApiError(400, "Please add at least one class session.");
    }

    for (let i = 0; i < classesList.length; i++) {
      const cls = classesList[i];
      if (!cls.batch_name || !cls.batch_name.trim()) {
        throw new ApiError(400, `Class #${i + 1}: Batch/Course name is required.`);
      }
      if (!cls.topic_covered || !cls.topic_covered.trim()) {
        throw new ApiError(400, `Class #${i + 1}: Topic covered is required.`);
      }
    }
  }

  const reportData = {
    user_id: userId,
    employee_id: employeeId,
    department_id: departmentId,
    report_date: reportDate,
    role_type: roleType,
    work_title: payload.work_title || null,
    tasks_summary: payload.tasks_summary.trim(),
    total_hours_worked: finalHoursWorked,
    work_status: payload.work_status || "COMPLETED",
    deliverable_links: payload.deliverable_links || null,
    blockers: normalizedBlockers || null,
    interns_work_summary: internsWorkSummary || null,
    next_day_plan: payload.next_day_plan || null,
    took_class: tookClass,
    status: initialStatus,
    tl_id: tlId,
    tl_reviewed_at: tlReviewedAt,
    hr_id: nextHrInChain?.userId || null,
    super_admin_id: nextSuperAdminInChain?.userId || null,
  };

  // Run in database transaction
  const result = await withTransaction(async (client) => {
    const savedReport = await upsertDailyReportRepository(client, reportData);
    const savedClasses = await syncReportClassesRepository(
      client,
      savedReport.id,
      userId,
      tookClass ? classesList : []
    );
    savedReport.classes = savedClasses;
    return savedReport;
  });

  return await findReportByIdRepository(result.id);
};

/**
 * Get My Report for specific date
 */
export const getMyReportByDateService = async (userId, targetDate) => {
  const dateStr = getFormattedDate(targetDate);
  const report = await findMyReportByDateRepository(userId, dateStr);
  return report || null;
};

/**
 * Get My Report History (Paginated)
 */
export const getMyReportsHistoryService = async (userId, query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 15));
  const startDate = query.startDate ? getFormattedDate(query.startDate) : undefined;
  const endDate = query.endDate ? getFormattedDate(query.endDate) : undefined;
  const status = query.status || undefined;

  return await findMyReportsHistoryRepository(userId, {
    page,
    limit,
    startDate,
    endDate,
    status,
  });
};

/**
 * Get Single Report by ID
 */
export const getReportByIdService = async (reportId, _user, visibility = {}) => {
  const report = await findReportByIdRepository(reportId, {
    userIds: visibility.unrestricted ? null : visibility.userIds,
    reportIds: visibility.unrestricted ? null : visibility.reportIds,
  });
  if (!report) {
    if (await reportExistsByIdRepository(reportId)) {
      throw new ApiError(403, "You are not allowed to view this report.");
    }
    throw new ApiError(404, "Daily work report not found.");
  }
  if (
    !visibility.unrestricted &&
    !visibility.userIds?.includes(Number(report.user_id)) &&
    !visibility.reportIds?.includes(Number(report.id))
  ) {
    throw new ApiError(403, "You are not allowed to view this report.");
  }
  return report;
};

/**
 * Get Team Reports (for Team Lead, HR, Super Admin)
 */
export const getTeamReportsService = async (user, query, visibility = {}) => {
  const isSuperAdminOrHR = Boolean(visibility.unrestricted);
  const empProfile = await ensureEmployeeProfileForUser(user.id);
  
  let departmentId = null;
  let allowedDepartmentIds = null;

  if (isSuperAdminOrHR) {
    if (query.departmentId && query.departmentId !== "ALL") {
      departmentId = query.departmentId;
    }
  } else {
    // Non-admin / Non-HR (TL, Manager, Employee)
    const primaryDeptId = empProfile?.department_id ? Number(empProfile.department_id) : null;
    const managedIds = Array.isArray(empProfile?.managed_department_ids)
      ? empProfile.managed_department_ids.map(Number).filter((id) => !isNaN(id) && id > 0)
      : [];

    allowedDepartmentIds = Array.from(
      new Set([...(primaryDeptId ? [primaryDeptId] : []), ...managedIds])
    );

    if (query.departmentId && query.departmentId !== "ALL") {
      const requestedDeptId = Number(query.departmentId);
      if (allowedDepartmentIds.includes(requestedDeptId)) {
        departmentId = requestedDeptId;
      } else {
        // Fallback: If requesting a department not assigned to this TL, default to their allowed department(s)
        departmentId = allowedDepartmentIds.length === 1 ? allowedDepartmentIds[0] : null;
      }
    } else {
      // If no specific dept requested, or "ALL" requested by TL:
      // If TL leads only 1 department, explicitly filter by that department
      if (allowedDepartmentIds.length === 1) {
        departmentId = allowedDepartmentIds[0];
      }
      // If TL leads multiple departments, departmentId remains null and repository filters by allowedDepartmentIds
    }
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const date = query.date ? getFormattedDate(query.date) : undefined;
  const startDate = query.startDate ? getFormattedDate(query.startDate) : undefined;
  const endDate = query.endDate ? getFormattedDate(query.endDate) : undefined;
  const roleType = query.roleType || undefined;
  const status = query.status || undefined;
  const search = query.search?.trim();

  return await findTeamReportsRepository({
    tlUserId: null,
    tlEmployeeId: isSuperAdminOrHR ? null : (empProfile?.id || null),
    visibleUserIds: isSuperAdminOrHR ? null : (visibility.userIds || [Number(user.id)]),
    visibleReportIds: isSuperAdminOrHR ? null : (visibility.reportIds || []),
    departmentId,
    allowedDepartmentIds,
    date,
    startDate,
    endDate,
    roleType,
    status,
    search,
    isSuperAdminOrHR,
    page,
    limit,
    includePendingApprover:
      isSuperAdminOrHR ||
      getRoleLevel({
        role: empProfile?.role || user.role,
        designation: empProfile?.designation || user.designation,
      }) === REPORT_ROLE_LEVELS.DEPARTMENT_HEAD,
  });
};

/**
 * Department Head / TL Review Report
 */
export const reviewReportAsTLService = async (user, reportId, payload, visibility) => {
  const report = await findReportByIdRepository(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found.");
  }
  if (visibility && !visibility.unrestricted &&
      !visibility.userIds?.includes(Number(report.user_id)) &&
      !visibility.reportIds?.includes(Number(report.id))) {
    throw new ApiError(403, "You are not allowed to review this report.");
  }

  const employeeProfile = await ensureEmployeeProfileForUser(user.id);
  const departmentIds = [
    employeeProfile?.department_id,
    ...(Array.isArray(employeeProfile?.managed_department_ids)
      ? employeeProfile.managed_department_ids
      : []),
  ]
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const isDepartmentHeadOverride = canDepartmentHeadVerifyReport({
    reviewerUserId: user.id,
    reviewerRole: employeeProfile?.role || user.role,
    reviewerDesignation: employeeProfile?.designation || user.designation,
    reviewerDepartmentIds: departmentIds,
    report,
  });
  const isCurrentTeamLeader = canTeamLeaderVerifyReport({
    reviewerUserId: user.id,
    reviewerRole: employeeProfile?.role || user.role,
    reviewerDesignation: employeeProfile?.designation || user.designation,
    report,
    visibleInHierarchy:
      visibility?.userIds?.includes(Number(report.user_id)) ||
      visibility?.reportIds?.includes(Number(report.id)),
  });

  if (
    Number(report.tl_id) !== Number(user.id) &&
    Number(report.user_id) !== Number(user.id) &&
    !isCurrentTeamLeader &&
    !isDepartmentHeadOverride
  ) {
    throw new ApiError(403, "Only the assigned TL or the Department Head assigned to this report's department can verify it.");
  }

  const feedback = payload.feedback || payload.tl_feedback || "";
  const status = payload.status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : (payload.status || "TL_REVIEWED");

  return await reviewReportAsTLRepository(reportId, user.id, feedback, status);
};

/**
 * HR Compliance Overview
 */
export const getHROverviewService = async (queryDate, visibility = {}) => {
  const dateStr = getFormattedDate(queryDate);
  return await findHROverviewRepository(
    dateStr,
    visibility.unrestricted ? null : visibility.userIds,
    visibility.unrestricted ? null : visibility.reportIds
  );
};

/**
 * HR & Super Admin: Get All Company Reports
 */
export const getAllCompanyReportsService = async (query, visibility = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const date = query.date ? getFormattedDate(query.date) : undefined;
  const startDate = query.startDate ? getFormattedDate(query.startDate) : undefined;
  const endDate = query.endDate ? getFormattedDate(query.endDate) : undefined;
  const departmentId = query.departmentId || undefined;
  const employeeId = query.employeeId || undefined;
  const roleType = query.roleType || undefined;
  const status = query.status || undefined;
  const tookClass = query.tookClass;
  const search = query.search?.trim();

  return await findAllCompanyReportsRepository({
    visibleUserIds: visibility.unrestricted ? null : visibility.userIds,
    visibleReportIds: visibility.unrestricted ? null : visibility.reportIds,
    departmentId,
    employeeId,
    date,
    startDate,
    endDate,
    roleType,
    status,
    tookClass,
    search,
    page,
    limit,
  });
};

/**
 * HR Review / Approve Report
 */
export const reviewReportAsHRService = async (user, reportId, payload, visibility) => {
  const report = await findReportByIdRepository(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found.");
  }
  if (visibility && !visibility.unrestricted &&
      !visibility.userIds?.includes(Number(report.user_id)) &&
      !visibility.reportIds?.includes(Number(report.id))) {
    throw new ApiError(403, "You are not allowed to review this report.");
  }

  const userRole = String(user.role || "").toUpperCase();
  const isAssignedApprover = Number(report.hr_id) === Number(user.id);
  const canReviewAsOrganizationApprover = ["HR", "SUPER_ADMIN", "ADMIN"].includes(userRole);
  if (!isAssignedApprover && !canReviewAsOrganizationApprover) {
    throw new ApiError(403, "Only the assigned HR approver can act on this report.");
  }

  const feedback = payload.feedback || payload.hr_feedback || "";
  const status = payload.status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : (payload.status || "HR_APPROVED");

  return await reviewReportAsHRRepository(reportId, user.id, feedback, status);
};

/**
 * Super Admin Review / Final Approve Report
 */
export const reviewReportAsSuperAdminService = async (user, reportId, payload, visibility) => {
  const report = await findReportByIdRepository(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found.");
  }
  if (visibility && !visibility.unrestricted &&
      !visibility.userIds?.includes(Number(report.user_id)) &&
      !visibility.reportIds?.includes(Number(report.id))) {
    throw new ApiError(403, "You are not allowed to review this report.");
  }

  if (String(user.role || "").toUpperCase() !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only Super Admin can final-approve this report.");
  }

  const feedback = payload.feedback || payload.super_admin_feedback || "";
  const status = payload.status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : (payload.status || "SUPER_ADMIN_APPROVED");

  return await reviewReportAsSuperAdminRepository(reportId, user.id, feedback, status);
};

/**
 * Classes Video Proof Audit Feed
 */
export const getClassesAuditFeedService = async (query, visibility = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const date = query.date ? getFormattedDate(query.date) : undefined;
  const startDate = query.startDate ? getFormattedDate(query.startDate) : undefined;
  const endDate = query.endDate ? getFormattedDate(query.endDate) : undefined;
  const departmentId = query.departmentId || undefined;
  const search = query.search?.trim();

  return await findClassesAuditRepository({
    visibleUserIds: visibility.unrestricted ? null : visibility.userIds,
    visibleReportIds: visibility.unrestricted ? null : visibility.reportIds,
    departmentId,
    date,
    startDate,
    endDate,
    search,
    page,
    limit,
  });
};

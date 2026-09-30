import { withTransaction } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { ensureEmployeeProfileForUser } from "./ensureEmployeeProfile.service.js";
import {
  upsertDailyReportRepository,
  syncReportClassesRepository,
  findReportByIdRepository,
  findMyReportByDateRepository,
  findMyReportsHistoryRepository,
  findTeamReportsRepository,
  reviewReportAsTLRepository,
  reviewReportAsHRRepository,
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

  // Determine user's role_type in operations
  let roleType = payload.role_type;
  if (!roleType) {
    const userRole = String(user.role || "").toUpperCase();
    if (userRole === "HR") roleType = "HR";
    else if (userRole === "TL" || (empProfile?.designation && empProfile.designation.toLowerCase().includes("team lead"))) roleType = "TL";
    else if (empProfile?.employment_type === "INTERN") roleType = "INTERN";
    else roleType = "EMPLOYEE";
  }

  const tookClass = Boolean(payload.took_class || (payload.classes && payload.classes.length > 0));
  const classesList = Array.isArray(payload.classes) ? payload.classes : [];

  // If user took classes, validate video link for each class
  if (tookClass) {
    if (classesList.length === 0) {
      throw new ApiError(400, "Please add at least one class log with its video recording link.");
    }

    for (let i = 0; i < classesList.length; i++) {
      const cls = classesList[i];
      if (!cls.batch_name || !cls.batch_name.trim()) {
        throw new ApiError(400, `Class #${i + 1}: Batch/Course name is required.`);
      }
      if (!cls.topic_covered || !cls.topic_covered.trim()) {
        throw new ApiError(400, `Class #${i + 1}: Topic covered is required.`);
      }
      if (!cls.video_recording_url || !cls.video_recording_url.trim()) {
        throw new ApiError(
          400,
          `Class #${i + 1}: Video recording link (Google Drive, Zoom, YouTube, Loom, etc.) is mandatory as proof of class.`
        );
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
    total_hours_worked: Number(payload.total_hours_worked) || 8.0,
    work_status: payload.work_status || "COMPLETED",
    deliverable_links: payload.deliverable_links || null,
    blockers: payload.blockers || null,
    next_day_plan: payload.next_day_plan || null,
    took_class: tookClass,
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
export const getReportByIdService = async (reportId) => {
  const report = await findReportByIdRepository(reportId);
  if (!report) {
    throw new ApiError(404, "Daily work report not found.");
  }
  return report;
};

/**
 * Get Team Reports (for Team Lead)
 */
export const getTeamReportsService = async (user, query) => {
  const empProfile = await ensureEmployeeProfileForUser(user.id);
  const departmentId = query.departmentId || empProfile?.department_id || null;

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const date = query.date ? getFormattedDate(query.date) : undefined;
  const startDate = query.startDate ? getFormattedDate(query.startDate) : undefined;
  const endDate = query.endDate ? getFormattedDate(query.endDate) : undefined;
  const roleType = query.roleType || undefined;
  const status = query.status || undefined;

  return await findTeamReportsRepository({
    tlUserId: user.id,
    tlEmployeeId: empProfile?.id || null,
    departmentId,
    date,
    startDate,
    endDate,
    roleType,
    status,
    page,
    limit,
  });
};

/**
 * Team Lead Review Report
 */
export const reviewReportAsTLService = async (user, reportId, payload) => {
  const report = await findReportByIdRepository(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  const feedback = payload.feedback || payload.tl_feedback || "";
  const status = payload.status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : "TL_REVIEWED";

  return await reviewReportAsTLRepository(reportId, user.id, feedback, status);
};

/**
 * HR Compliance Overview
 */
export const getHROverviewService = async (queryDate) => {
  const dateStr = getFormattedDate(queryDate);
  return await findHROverviewRepository(dateStr);
};

/**
 * HR & Super Admin: Get All Company Reports
 */
export const getAllCompanyReportsService = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const date = query.date ? getFormattedDate(query.date) : undefined;
  const startDate = query.startDate ? getFormattedDate(query.startDate) : undefined;
  const endDate = query.endDate ? getFormattedDate(query.endDate) : undefined;
  const departmentId = query.departmentId || undefined;
  const roleType = query.roleType || undefined;
  const status = query.status || undefined;
  const tookClass = query.tookClass;
  const search = query.search?.trim();

  return await findAllCompanyReportsRepository({
    departmentId,
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
export const reviewReportAsHRService = async (user, reportId, payload) => {
  const report = await findReportByIdRepository(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  const feedback = payload.feedback || payload.hr_feedback || "";
  const status = payload.status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : "HR_APPROVED";

  return await reviewReportAsHRRepository(reportId, user.id, feedback, status);
};

/**
 * Classes Video Proof Audit Feed
 */
export const getClassesAuditFeedService = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const date = query.date ? getFormattedDate(query.date) : undefined;
  const startDate = query.startDate ? getFormattedDate(query.startDate) : undefined;
  const endDate = query.endDate ? getFormattedDate(query.endDate) : undefined;
  const departmentId = query.departmentId || undefined;
  const search = query.search?.trim();

  return await findClassesAuditRepository({
    departmentId,
    date,
    startDate,
    endDate,
    search,
    page,
    limit,
  });
};

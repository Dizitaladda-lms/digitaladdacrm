import axiosInstance from "../api/axiosInstance";

/**
 * ==========================================================
 * DIZITALADDA CRM — Daily Work Report & Class Video Proofs Service
 * ==========================================================
 */

/**
 * Submit or update today's daily work report
 * @param {Object} data { report_date, tasks_summary, total_hours_worked, work_status, deliverable_links, took_class, classes, blockers, next_day_plan }
 */
export const submitDailyReport = async (data) => {
  const response = await axiosInstance.post("/reports/daily", data);
  return response.data;
};

/**
 * Get current user's report for today or a specific date
 * @param {string} [date] YYYY-MM-DD
 */
export const getMyReportToday = async (date) => {
  const response = await axiosInstance.get("/reports/daily/my/today", {
    params: date ? { date } : {},
  });
  return response.data;
};

/**
 * Get current user's past reports history (paginated)
 * @param {Object} [params] { page, limit, startDate, endDate, status }
 */
export const getMyReportsHistory = async (params = {}) => {
  const response = await axiosInstance.get("/reports/daily/my", { params });
  return response.data;
};

/**
 * Get single report by ID
 * @param {string|number} id
 */
export const getReportById = async (id) => {
  const response = await axiosInstance.get(`/reports/daily/${id}`);
  return response.data;
};

export const getReportVisibility = async () => {
  const response = await axiosInstance.get("/reports/visibility");
  return response.data;
};

/**
 * Team Lead: Get department team reports
 * @param {Object} [params] { page, limit, date, startDate, endDate, roleType, status }
 */
export const getTeamReports = async (params = {}) => {
  const response = await axiosInstance.get("/reports/daily/team", { params });
  return response.data;
};

/**
 * Team Lead: Review a team member's report
 * @param {string|number} id
 * @param {Object} data { feedback, status: 'TL_REVIEWED' | 'REVISION_REQUESTED' }
 */
export const reviewReportAsTL = async (id, data) => {
  const response = await axiosInstance.post(`/reports/daily/${id}/tl-review`, data);
  return response.data;
};

/**
 * HR: Get company-wide compliance overview & stats
 * @param {string} [date] YYYY-MM-DD
 */
export const getHROverview = async (date) => {
  const response = await axiosInstance.get("/reports/daily/hr/overview", {
    params: date ? { date } : {},
  });
  return response.data;
};

/**
 * HR & Super Admin: Get all company reports with filters
 * @param {Object} [params] { page, limit, departmentId, date, startDate, endDate, roleType, status, tookClass, search }
 */
export const getAllCompanyReports = async (params = {}) => {
  const response = await axiosInstance.get("/reports/daily/hr/all", { params });
  return response.data;
};

/**
 * HR: Review and approve a report
 * @param {string|number} id
 * @param {Object} data { feedback, status: 'HR_APPROVED' | 'REVISION_REQUESTED' }
 */
export const reviewReportAsHR = async (id, data) => {
  const response = await axiosInstance.post(`/reports/daily/${id}/hr-review`, data);
  return response.data;
};

/**
 * Super Admin: Final review and approval of a report
 * @param {string|number} id
 * @param {Object} data { feedback, status: 'SUPER_ADMIN_APPROVED' | 'REVISION_REQUESTED' }
 */
export const reviewReportAsSuperAdmin = async (id, data) => {
  const response = await axiosInstance.post(`/reports/daily/${id}/super-admin-review`, data);
  return response.data;
};

/**
 * Super Admin & HR: Classes & Video Recording Proofs Audit Feed
 * @param {Object} [params] { page, limit, departmentId, date, startDate, endDate, search }
 */
export const getClassesAuditFeed = async (params = {}) => {
  const response = await axiosInstance.get("/reports/daily/classes-audit", { params });
  return response.data;
};

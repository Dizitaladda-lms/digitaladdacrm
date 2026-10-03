import axiosInstance from "../api/axiosInstance";

/**
 * ==========================================================
 * DIZITALADDA CRM — Task Assignment & Report Revision Service
 * ==========================================================
 */

/**
 * Assign a new task / project work (Super Admin & Managers)
 * @param {Object} data { title, description, assigned_to_id, department_id, report_id, priority, due_date }
 */
export const createTask = async (data) => {
  const response = await axiosInstance.post("/tasks", data);
  return response.data;
};

/**
 * Get list of assigned tasks (Paginated with filters)
 * @param {Object} [params] { assignedToId, assignedById, departmentId, status, reportId, search, page, limit }
 */
export const getTasks = async (params = {}) => {
  const response = await axiosInstance.get("/tasks", { params });
  return response.data;
};

/**
 * Update task status or revision comments
 * @param {string|number} id
 * @param {Object} data { status, revision_feedback }
 */
export const updateTaskStatus = async (id, data) => {
  const response = await axiosInstance.patch(`/tasks/${id}/status`, data);
  return response.data;
};

/**
 * Delete assigned task
 * @param {string|number} id
 */
export const deleteTask = async (id) => {
  const response = await axiosInstance.delete(`/tasks/${id}`);
  return response.data;
};

/**
 * Request Changes / Revision on Daily Report and auto-route task
 * @param {string|number} reportId
 * @param {Object} data { feedback, assigned_to_id }
 */
export const requestReportRevision = async (reportId, data) => {
  const response = await axiosInstance.post(`/tasks/report-revision/${reportId}`, data);
  return response.data;
};

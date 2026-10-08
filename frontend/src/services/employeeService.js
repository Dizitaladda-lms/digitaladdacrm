import axiosInstance from "../api/axiosInstance";

/**
 * ==========================================
 * Get All Employees
 * ==========================================
 */
export const getEmployees = async (params = {}) => {
  const response = await axiosInstance.get("/employees", {
    params,
  });

  return response.data;
};

/**
 * ==========================================
 * Get Employee By ID
 * ==========================================
 */
export const getEmployeeById = async (id) => {
  const response = await axiosInstance.get(`/employees/${id}`);
  return response.data;
};

/**
 * ==========================================
 * Create Employee
 * ==========================================
 */
export const createEmployee = async (data) => {
  const response = await axiosInstance.post("/employees", data);
  return response.data;
};

export const getEmployeeApprovalRequests = async () => {
  const response = await axiosInstance.get("/employees/approval-requests");
  return response.data;
};

export const approveEmployeeApprovalRequest = async (id) => {
  const response = await axiosInstance.post(`/employees/approval-requests/${id}/approve`);
  return response.data;
};

export const rejectEmployeeApprovalRequest = async (id, reviewNote = "") => {
  const response = await axiosInstance.post(`/employees/approval-requests/${id}/reject`, {
    review_note: reviewNote,
  });
  return response.data;
};

/**
 * ==========================================
 * Update Employee
 * ==========================================
 */
export const updateEmployee = async (id, data) => {
  const response = await axiosInstance.put(`/employees/${id}`, data);
  return response.data;
};

/**
 * ==========================================
 * Delete Employee
 * ==========================================
 */
export const deleteEmployee = async (id) => {
  const response = await axiosInstance.delete(`/employees/${id}`);
  return response.data;
};

/**
 * ==========================================
 * Restore Employee
 * ==========================================
 */
export const restoreEmployee = async (id) => {
  const response = await axiosInstance.patch(`/employees/${id}/restore`);
  return response.data;
};

/**
 * ==========================================
 * Employee Statistics
 * ==========================================
 */
export const getEmployeeStatistics = async () => {
  const response = await axiosInstance.get("/employees/statistics");
  return response.data;
};

export const getEmployeePerformance = async (id) => {
  const response = await axiosInstance.get(`/employees/${id}/performance`);
  return response.data;
};

export const getEmployeeDevices = async (id) => {
  const response = await axiosInstance.get(`/employees/${id}/devices`);
  return response.data;
};

export const renameEmployeeDevice = async (employeeId, deviceId, deviceName) => {
  const response = await axiosInstance.patch(
    `/employees/${employeeId}/devices/${deviceId}`,
    { device_name: deviceName }
  );
  return response.data;
};

export const revokeEmployeeDevice = async (employeeId, deviceId) => {
  const response = await axiosInstance.post(
    `/employees/${employeeId}/devices/${deviceId}/revoke`
  );
  return response.data;
};

export const getMyPerformance = async (params = {}) => {
  const response = await axiosInstance.get("/employees/my-performance", { params });
  return response.data;
};

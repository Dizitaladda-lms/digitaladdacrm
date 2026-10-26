import axiosInstance, { BIOMETRIC_REQUEST_TIMEOUT_MS } from "../api/axiosInstance";

export const getBiometricStatus = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/status", { params });
  return response.data;
};

export const registerBiometricCredential = async (payload) => {
  const response = await axiosInstance.post("/attendance/biometric/register", payload, {
    timeout: BIOMETRIC_REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

export const getBiometricRegistrationOptions = async () => {
  const response = await axiosInstance.post("/attendance/biometric/registration-options");
  return response.data;
};

export const getBiometricAuthenticationOptions = async () => {
  const response = await axiosInstance.post("/attendance/biometric/authentication-options");
  return response.data;
};

export const getBiometricFaceChallenge = async (purpose) => {
  const response = await axiosInstance.post("/attendance/biometric/face-challenge", { purpose });
  return response.data;
};

export const resetBiometricCredential = async (employeeId) => {
  const url = employeeId ? `/attendance/biometric/reset/${employeeId}` : "/attendance/biometric/reset";
  const response = await axiosInstance.delete(url);
  return response.data;
};

export const getPendingBiometricApprovals = async () => {
  const response = await axiosInstance.get("/attendance/biometric/pending-approvals");
  return response.data;
};

export const approveBiometricRegistration = async (id) => {
  const response = await axiosInstance.post(`/attendance/biometric/approve/${id}`);
  return response.data;
};

export const rejectBiometricRegistration = async (id, reason) => {
  const response = await axiosInstance.post(`/attendance/biometric/reject/${id}`, { reason });
  return response.data;
};

export const checkInAttendance = async (payload = {}) => {
  const response = await axiosInstance.post("/attendance/check-in", payload, {
    timeout: BIOMETRIC_REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

export const checkOutAttendance = async (payload = {}) => {
  const response = await axiosInstance.post("/attendance/check-out", payload, {
    timeout: BIOMETRIC_REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

export const getMyAttendanceHistory = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/my-history", { params });
  return response.data;
};

export const getCompanyPresence = async (date) => {
  const response = await axiosInstance.get("/attendance/company-presence", {
    params: date ? { date } : undefined,
  });
  return response.data;
};

export const setEmployeeWorkMode = async (employeeId, workMode) => {
  const response = await axiosInstance.patch(
    `/attendance/company-presence/${employeeId}/work-mode`,
    { work_mode: workMode }
  );
  return response.data;
};

export const setEmployeePresenceStatus = async (employeeId, status) => {
  const response = await axiosInstance.patch(
    `/attendance/company-presence/${employeeId}/status`,
    { status }
  );
  return response.data;
};

export const getHRAttendanceReports = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/hr-reports", { params });
  return response.data;
};

export const upsertEmployeeAttendanceByHR = async (payload = {}) => {
  const response = await axiosInstance.post("/attendance/hr-manage", payload);
  return response.data;
};

export const getEmployeeAttendanceQuotaSummary = async (employeeId, date) => {
  const response = await axiosInstance.get(`/attendance/employee-quota/${employeeId}`, {
    params: date ? { date } : undefined,
  });
  return response.data;
};

export const getOfficeIPs = async () => {
  const response = await axiosInstance.get("/attendance/office-ips");
  return response.data;
};

export const getAttendanceSettings = async () => {
  const response = await axiosInstance.get("/attendance/settings");
  return response.data;
};

export const updateAttendanceSettings = async (payload) => {
  const response = await axiosInstance.put("/attendance/settings", payload);
  return response.data;
};

export const addOfficeIP = async (payload) => {
  const response = await axiosInstance.post("/attendance/office-ips", payload);
  return response.data;
};

export const deleteOfficeIP = async (id) => {
  const response = await axiosInstance.delete(`/attendance/office-ips/${id}`);
  return response.data;
};

export const getMyLeaveRequests = async () => {
  const response = await axiosInstance.get("/leave/my-requests");
  return response.data;
};

export const createLeaveRequest = async (payload) => {
  const body = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== "manager_approval_proof") body.append(key, value);
  });
  if (payload.manager_approval_proof) body.append("manager_approval_proof", payload.manager_approval_proof);
  const response = await axiosInstance.post("/leave", body);
  return response.data;
};

export const getPendingLeaveApprovals = async () => {
  const response = await axiosInstance.get("/leave/approvals");
  return response.data;
};

export const getLeaveApprovalProof = async (id) => {
  const response = await axiosInstance.get(`/leave/${id}/manager-approval-proof`);
  return response.data;
};

export const decideLeaveRequest = async (id, decision, reason = "") => {
  const response = await axiosInstance.post(`/leave/${id}/decision`, { decision, reason });
  return response.data;
};

export const syncOfflineAttendance = async (payload) => {
  const response = await axiosInstance.post("/attendance/offline-sync", payload);
  return response.data;
};


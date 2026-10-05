import axiosInstance from "../api/axiosInstance";

export const getBiometricStatus = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/status", { params });
  return response.data;
};

export const registerBiometricCredential = async (payload) => {
  const response = await axiosInstance.post("/attendance/biometric/register", payload);
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
  const response = await axiosInstance.post("/attendance/check-in", payload);
  return response.data;
};

export const checkOutAttendance = async (payload = {}) => {
  const response = await axiosInstance.post("/attendance/check-out", payload);
  return response.data;
};

export const getMyAttendanceHistory = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/my-history", { params });
  return response.data;
};

export const getHRAttendanceReports = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/hr-reports", { params });
  return response.data;
};

export const getOfficeIPs = async () => {
  const response = await axiosInstance.get("/attendance/office-ips");
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

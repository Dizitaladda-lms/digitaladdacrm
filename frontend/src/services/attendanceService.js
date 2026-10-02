import axiosInstance from "../api/axiosInstance";

export const getBiometricStatus = async () => {
  const response = await axiosInstance.get("/attendance/status");
  return response.data;
};

export const registerBiometricCredential = async (payload) => {
  const response = await axiosInstance.post("/attendance/biometric/register", payload);
  return response.data;
};

export const checkInAttendance = async (payload = {}) => {
  const response = await axiosInstance.post("/attendance/check-in", payload);
  return response.data;
};

export const checkOutAttendance = async () => {
  const response = await axiosInstance.post("/attendance/check-out");
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

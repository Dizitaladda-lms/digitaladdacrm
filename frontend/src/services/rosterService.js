import axiosInstance from "../api/axiosInstance";

/**
 * =====================================================
 * Employee Roster Frontend Service
 * =====================================================
 */

export const getMyMonthlyRoster = async (year, month) => {
  const response = await axiosInstance.get("/roster/my-roster", {
    params: { year, month },
  });
  return response.data;
};

export const saveMyMonthlyRoster = async (payload) => {
  const response = await axiosInstance.post("/roster/my-roster", payload);
  return response.data;
};

export const requestRosterChange = async (payload) => {
  const response = await axiosInstance.post("/roster/my-roster/request-change", payload);
  return response.data;
};

/**
 * =====================================================
 * HR / Super Admin Company Roster Management
 * =====================================================
 */

export const getHREmployeesRoster = async (params = {}) => {
  const response = await axiosInstance.get("/roster/company", {
    params,
  });
  return response.data;
};

export const reviewEmployeeRoster = async (id, payload) => {
  const response = await axiosInstance.put(`/roster/${id}/review`, payload);
  return response.data;
};

export const updateEmployeeRosterByHR = async (id, payload) => {
  const response = await axiosInstance.put(`/roster/${id}/edit`, payload);
  return response.data;
};

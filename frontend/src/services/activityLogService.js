import axiosInstance from "../api/axiosInstance";

/**
 * ============================================================================
 * Activity & Audit Log Service
 * ============================================================================
 */

export const getActivityLogs = async (params = {}) => {
  const response = await axiosInstance.get("/activity-logs", {
    params,
  });
  return response.data;
};

export const getActivityLogStats = async () => {
  const response = await axiosInstance.get("/activity-logs/stats");
  return response.data;
};

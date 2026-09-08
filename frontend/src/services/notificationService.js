import axiosInstance from "../api/axiosInstance";

export const getNotifications = async () => {
  try {
    const response = await axiosInstance.get("/notifications");
    return response.data;
  } catch (err) {
    console.warn("Could not fetch notifications:", err.message);
    return { data: { notifications: [], total_count: 0, unread_count: 0 } };
  }
};

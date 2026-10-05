import axiosInstance from "../api/axiosInstance";

/**
 * Team Chat API Services
 */

export const getUserChatGroups = async () => {
  const response = await axiosInstance.get("/chat/groups");
  return response.data;
};

export const getChatGroupDetails = async (groupId) => {
  const response = await axiosInstance.get(`/chat/groups/${groupId}`);
  return response.data;
};

export const createTeamChatGroup = async (payload) => {
  const response = await axiosInstance.post("/chat/groups", payload);
  return response.data;
};

export const getChatGroupMessages = async (groupId, params = {}) => {
  const response = await axiosInstance.get(`/chat/groups/${groupId}/messages`, { params });
  return response.data;
};

export const sendChatGroupMessage = async (groupId, payload) => {
  const response = await axiosInstance.post(`/chat/groups/${groupId}/messages`, payload);
  return response.data;
};

export const markChatGroupAsRead = async (groupId, messageId) => {
  const response = await axiosInstance.post(`/chat/groups/${groupId}/read`, { messageId });
  return response.data;
};

export const addMembersToChatGroup = async (groupId, employeeIds) => {
  const response = await axiosInstance.post(`/chat/groups/${groupId}/members`, { employeeIds });
  return response.data;
};

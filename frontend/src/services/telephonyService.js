import axiosInstance from "../api/axiosInstance";

/**
 * Initiate a click-to-call between counsellor and student
 */
export const initiateCall = async (leadId, customCallerNumber = null) => {
  const response = await axiosInstance.post("/telephony/call", {
    lead_id: leadId,
    custom_caller_number: customCallerNumber,
  });
  return response.data;
};

/**
 * Fetch call logs and recordings for a specific lead
 */
export const getLeadCallLogs = async (leadId) => {
  const response = await axiosInstance.get(`/telephony/lead/${leadId}`);
  return response.data;
};

/**
 * Fetch all call logs for admin
 */
export const getAllCallLogs = async (params = {}) => {
  const response = await axiosInstance.get("/telephony/logs", { params });
  return response.data;
};

/**
 * Test helper: simulate completed call with demo recording
 */
export const simulateMockComplete = async (callId, recordingUrl = null) => {
  const response = await axiosInstance.post(`/telephony/simulate-complete/${callId}`, {
    recording_url: recordingUrl,
  });
  return response.data;
};

import axiosInstance from "../api/axiosInstance";

/**
 * Send bulk WhatsApp broadcast (via API or log activities)
 */
export const sendBulkWhatsApp = async (payload) => {
  const response = await axiosInstance.post("/leads/bulk-whatsapp", payload);
  return response.data;
};

import axiosInstance from "../api/axiosInstance";

/**
 * Send bulk communication broadcast across WhatsApp, Email, or SMS
 */
export const sendBulkBroadcast = async ({
  channel, // "WHATSAPP" | "EMAIL" | "SMS"
  lead_ids,
  subject_template,
  message_template,
  media_url,
  send_via_api,
}) => {
  const response = await axiosInstance.post("/leads/bulk-broadcast", {
    channel,
    lead_ids,
    subject_template,
    message_template,
    media_url,
    send_via_api,
  });
  return response.data;
};

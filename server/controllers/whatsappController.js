import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { sendBulkWhatsAppService } from "../services/whatsappBroadcastService.js";

/**
 * Handle Bulk WhatsApp Broadcast
 */
export const handleBulkWhatsAppBroadcast = asyncHandler(async (req, res) => {
  const { lead_ids, message_template, media_url, send_via_api } = req.body;

  const result = await sendBulkWhatsAppService({
    leadIds: lead_ids,
    messageTemplate: message_template,
    mediaUrl: media_url,
    sendViaApi: Boolean(send_via_api),
    currentUser: req.user || {},
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Processed WhatsApp broadcast for ${result.processed_count} students.`
    )
  );
});

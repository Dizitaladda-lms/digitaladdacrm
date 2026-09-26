import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { sendBulkCommunicationService } from "../services/communicationBroadcastService.js";

/**
 * Handle Unified Bulk Broadcast (WhatsApp, Email, SMS)
 */
export const handleBulkBroadcast = asyncHandler(async (req, res) => {
  const { channel, lead_ids, subject_template, message_template, media_url, send_via_api } = req.body;

  const result = await sendBulkCommunicationService({
    channel,
    leadIds: lead_ids,
    subjectTemplate: subject_template,
    messageTemplate: message_template,
    mediaUrl: media_url,
    sendViaApi: Boolean(send_via_api),
    currentUser: req.user || {},
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Broadcast completed for ${result.processed_count} students via ${result.channel}.`
    )
  );
});

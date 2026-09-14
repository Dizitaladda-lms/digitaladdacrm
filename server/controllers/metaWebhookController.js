import asyncHandler from "../utils/asyncHandler.js";
import { handleMetaWebhookEvent } from "../services/metaWebhookService.js";

/**
 * GET /api/public/meta-webhook
 * Verification endpoint required by Meta Developers Webhook configuration.
 */
export const verifyMetaWebhook = (req, res) => {
  const mode = req.query["hub.mode"] || req.query.mode;
  const token = req.query["hub.verify_token"] || req.query.verify_token;
  const challenge = req.query["hub.challenge"] || req.query.challenge;

  const expectedToken = (
    process.env.META_VERIFY_TOKEN || "dizitaladda_meta_verify_token_2026"
  ).trim();

  if (mode === "subscribe" && token && token.trim() === expectedToken) {
    console.log("✅ Meta Webhook Verified Successfully!");
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  } else {
    console.warn(
      `❌ Meta Webhook Verification Failed. Expected: "${expectedToken}", Got: "${token}"`
    );
    return res.status(403).send("Forbidden");
  }
};

/**
 * POST /api/public/meta-webhook
 * Receive real-time lead events from Meta.
 */
export const receiveMetaWebhook = asyncHandler(async (req, res) => {
  // Always respond 200 OK immediately so Meta doesn't retry
  res.status(200).json({ success: true, message: "EVENT_RECEIVED" });

  try {
    await handleMetaWebhookEvent(req.body);
  } catch (error) {
    console.error("Error processing Meta webhook event:", error);
  }
});

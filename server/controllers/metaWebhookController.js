import asyncHandler from "../utils/asyncHandler.js";
import crypto from "crypto";
import { handleMetaWebhookEvent } from "../services/metaWebhookService.js";

/**
 * GET /api/public/meta-webhook
 * Verification endpoint required by Meta Developers Webhook configuration.
 */
export const verifyMetaWebhook = (req, res) => {
  const mode = req.query["hub.mode"] || req.query.mode;
  const token = req.query["hub.verify_token"] || req.query.verify_token;
  const challenge = req.query["hub.challenge"] || req.query.challenge;

  const expectedToken = (process.env.META_VERIFY_TOKEN || "").trim();

  if (expectedToken && mode === "subscribe" && token && token.trim() === expectedToken) {
    console.log("✅ Meta Webhook Verified Successfully!");
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  } else {
    console.warn("Meta webhook verification failed.");
    return res.status(403).send("Forbidden");
  }
};

/**
 * POST /api/public/meta-webhook
 * Receive real-time lead events from Meta.
 */
export const receiveMetaWebhook = asyncHandler(async (req, res) => {
  const appSecret = process.env.META_APP_SECRET;
  const signature = req.get("x-hub-signature-256");
  if (!appSecret || !signature?.startsWith("sha256=") || !req.rawBody) {
    return res.status(403).json({ success: false, message: "Invalid webhook signature." });
  }
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(req.rawBody).digest("hex")}`;
  const received = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  if (received.length !== calculated.length || !crypto.timingSafeEqual(received, calculated)) {
    return res.status(403).json({ success: false, message: "Invalid webhook signature." });
  }

  res.status(200).json({ success: true, message: "EVENT_RECEIVED" });

  try {
    await handleMetaWebhookEvent(req.body);
  } catch (error) {
    console.error("Error processing Meta webhook event:", error);
  }
});

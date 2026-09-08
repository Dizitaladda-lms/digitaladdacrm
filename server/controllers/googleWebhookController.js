import asyncHandler from "../utils/asyncHandler.js";
import { capturePublicLeadService } from "../services/leadCaptureService.js";
import logger from "../utils/logger.js";

/**
 * Parses user_column_data from Google Ads Lead Form webhook payload
 */
export const extractGoogleFields = (columnData = []) => {
  const fields = {};
  let course = "";
  let city = "";

  for (const col of columnData) {
    const id = (col.column_id || "").toUpperCase();
    const name = (col.column_name || "").toLowerCase();
    const val = col.string_value || "";

    if (id === "FULL_NAME" || name.includes("full name")) {
      fields.full_name = val;
    } else if (id === "FIRST_NAME" && !fields.full_name) {
      fields.first_name = val;
    } else if (id === "LAST_NAME" && !fields.full_name) {
      fields.last_name = val;
    } else if (id === "PHONE_NUMBER" || name.includes("phone") || name.includes("mobile")) {
      fields.mobile = val;
    } else if (id === "EMAIL" || name.includes("email")) {
      fields.email = val;
    } else if (name.includes("course") || name.includes("program") || name.includes("interested")) {
      course = val;
    } else if (name.includes("city") || name.includes("centre") || name.includes("location")) {
      city = val;
    } else if (name.includes("domain") || name.includes("brand")) {
      fields.domain = val;
    }
  }

  if (!fields.full_name && (fields.first_name || fields.last_name)) {
    fields.full_name = `${fields.first_name || ""} ${fields.last_name || ""}`.trim();
  }

  if (course) fields.interested_course = course;
  if (city) fields.preferred_centre = city;

  return fields;
};

/**
 * POST /api/public/google-webhook
 * Direct Google Ads Lead Form Asset Webhook Receiver
 */
export const receiveGoogleWebhook = asyncHandler(async (req, res) => {
  const expectedKey =
    process.env.GOOGLE_LEAD_KEY || "dizitaladda_google_lead_key_2026";

  const incomingKey = req.body?.google_key;

  // Verify google_key if configured
  if (expectedKey && incomingKey && incomingKey !== expectedKey) {
    logger.warn(`Invalid Google Lead key received: "${incomingKey}"`);
    return res.status(403).json({ error: "Invalid google_key" });
  }

  // Google Test Lead submission check
  if (req.body?.is_test) {
    logger.info("Received Google Ads test lead verification payload");
  }

  const columnData = Array.isArray(req.body?.user_column_data)
    ? req.body.user_column_data
    : [];

  const extracted = extractGoogleFields(columnData);

  // Clean phone number (strip +91 and retain 10 digits)
  const rawMobile = extracted.mobile || "";
  const cleanedMobile = String(rawMobile).replace(/\D/g, "");
  const finalMobile =
    cleanedMobile.length >= 10 ? cleanedMobile.slice(-10) : cleanedMobile;

  const leadPayload = {
    full_name: extracted.full_name || (req.body?.is_test ? "Google Test Lead" : "Google Lead"),
    mobile: finalMobile || (req.body?.is_test ? "9876543210" : "0000000000"),
    email: extracted.email || null,
    interested_course: extracted.interested_course || null,
    preferred_centre: extracted.preferred_centre || null,
    source: "GOOGLE",
    domain:
      extracted.domain ||
      process.env.GOOGLE_DEFAULT_DOMAIN ||
      "DizitalAdda",
    external_lead_id: req.body?.lead_id ? String(req.body.lead_id) : null,
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: req.body?.campaign_id
      ? `google_campaign_${req.body.campaign_id}`
      : "google_lead_form",
    campaign_id: null,
  };

  try {
    const saved = await capturePublicLeadService(leadPayload, {
      ip: req.ip || "google-webhook",
    });

    logger.info(
      `Google Ads lead captured successfully: ${saved.lead?.lead_code || req.body?.lead_id}`
    );

    return res.status(200).json({
      success: true,
      message: "Lead received successfully",
      leadCode: saved.lead?.lead_code,
    });
  } catch (error) {
    logger.error(`Failed to save Google Ads lead: ${error.message}`);
    // Respond 200 to prevent Google from disabling the webhook on minor validation errors
    return res.status(200).json({
      success: false,
      message: "Processed with warning",
      error: error.message,
    });
  }
});

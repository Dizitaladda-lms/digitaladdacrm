import express from "express";
import validate from "../middleware/validate.js";
import { capturePublicLeadValidator } from "../validators/leadCapture.validator.js";
import { capturePublicLead } from "../controllers/leadCaptureController.js";
import {
  verifyMetaWebhook,
  receiveMetaWebhook,
} from "../controllers/metaWebhookController.js";
import { receiveGoogleWebhook } from "../controllers/googleWebhookController.js";

const router = express.Router();

/**
 * Payload Normalizer for External Website / Public Form submissions
 * Maps camelCase fields (fullName, phoneNumber, course, centre, campaignId)
 * to DB snake_case columns (full_name, mobile, interested_course, preferred_centre, campaign_id).
 */
const normalizePublicLeadPayload = (req, res, next) => {
  if (req.body) {
    if (!req.body.full_name && req.body.fullName) {
      req.body.full_name = req.body.fullName;
    }
    if (!req.body.mobile) {
      req.body.mobile =
        req.body.phoneNumber || req.body.phone || req.body.mobileNumber || "";
    }
    if (req.body.mobile) {
      const cleaned = String(req.body.mobile).replace(/\D/g, "");
      req.body.mobile = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
    }
    if (!req.body.interested_course) {
      req.body.interested_course =
        req.body.course || req.body.interestedCourse || "";
    }
    if (!req.body.preferred_centre) {
      req.body.preferred_centre =
        req.body.centre || req.body.preferredCentre || "";
    }
    if (!req.body.campaign_id && req.body.campaignId) {
      req.body.campaign_id = req.body.campaignId;
    }
    if (!req.body.source && req.body.leadSource) {
      req.body.source = String(req.body.leadSource).toUpperCase();
    }
    if (req.body.source) {
      req.body.source = String(req.body.source).toUpperCase();
    } else {
      req.body.source = "META";
    }
    if (!req.body.domain) {
      req.body.domain =
        req.body.websiteDomain || req.body.sourceDomain || req.body.brand || req.body.domainName || "DizitalAdda";
    }
  }
  next();
};

/**
 * =====================================================
 * Meta (Facebook/Instagram) Lead Ads Webhook
 * =====================================================
 */
router.get("/meta-webhook", verifyMetaWebhook);
router.post("/meta-webhook", receiveMetaWebhook);

/**
 * =====================================================
 * Google Ads Lead Form Webhook
 * =====================================================
 */
router.post("/google-webhook", receiveGoogleWebhook);

/**
 * =====================================================
 * Public Lead Capture Endpoint (Forms / Webhooks / Zapier)
 * =====================================================
 */
router.post(
  "/leads",
  normalizePublicLeadPayload,
  capturePublicLeadValidator,
  validate,
  capturePublicLead
);

export default router;
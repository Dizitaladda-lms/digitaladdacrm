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
    if (!req.body.full_name && req.body.name) {
      req.body.full_name = req.body.name;
    }
    if (!req.body.full_name && req.body.fullName) {
      req.body.full_name = req.body.fullName;
    }
    if (!req.body.email && req.body.email_id) {
      req.body.email = req.body.email_id;
    }
    if (!req.body.mobile) {
      req.body.mobile =
        req.body.phoneNumber || req.body.phone || req.body.mobileNumber || req.body.contact || "";
    }
    if (req.body.mobile) {
      const cleaned = String(req.body.mobile).replace(/\D/g, "");
      req.body.mobile = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
    }
    if (!req.body.interested_course) {
      req.body.interested_course =
        req.body.course || req.body.interestedCourse || req.body.program || "";
    }
    if (!req.body.preferred_centre) {
      req.body.preferred_centre =
        req.body.centre || req.body.preferredCentre || req.body.campus || req.body.branch || "";
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
      req.body.source = "LANDING_PAGE";
    }
    if (!req.body.landing_page_url) {
      req.body.landing_page_url =
        req.body.page_url || req.body.pageUrl || req.body.url || req.headers.referer || null;
    }

    if (!req.body.domain) {
      const explicitDomain =
        req.body.websiteDomain || req.body.sourceDomain || req.body.brand || req.body.domainName || req.body.website;

      if (explicitDomain) {
        req.body.domain = explicitDomain;
      } else if (req.headers.referer || req.headers.origin) {
        try {
          const urlObj = new URL(req.headers.referer || req.headers.origin);
          const host = urlObj.hostname.replace(/^www\./i, "");
          req.body.domain = host;
        } catch {
          req.body.domain = "DizitalAdda";
        }
      } else {
        req.body.domain = "DizitalAdda";
      }
    }

    if (!req.body.redirect_url && req.body.redirect) {
      req.body.redirect_url = req.body.redirect;
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
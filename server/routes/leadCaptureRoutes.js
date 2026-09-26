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

const KNOWN_SOURCES = [
  "META",
  "GOOGLE",
  "WEBSITE",
  "LANDING_PAGE",
  "INSTAGRAM",
  "WHATSAPP",
  "REFERRAL",
  "OFFLINE",
  "CALL",
  "MANUAL",
  "DIRECT",
  "OTHER",
];

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

    // Source normalization: ensure it always matches accepted enum while keeping details
    const rawSource = String(
      req.body.source || req.body.leadSource || "LANDING_PAGE"
    ).trim();
    const upperSource = rawSource.toUpperCase();

    if (KNOWN_SOURCES.includes(upperSource)) {
      req.body.source = upperSource;
    } else if (
      upperSource.includes("META") ||
      upperSource.includes("FB") ||
      upperSource.includes("FACEBOOK")
    ) {
      req.body.source = "META";
    } else if (
      upperSource.includes("GOOGLE") ||
      upperSource.includes("GADS") ||
      upperSource.includes("ADWORDS")
    ) {
      req.body.source = "GOOGLE";
    } else if (upperSource.includes("INSTA")) {
      req.body.source = "INSTAGRAM";
    } else if (upperSource.includes("WHATSAPP")) {
      req.body.source = "WHATSAPP";
    } else {
      req.body.source = "LANDING_PAGE";
    }

    if (!req.body.landing_page_url) {
      req.body.landing_page_url =
        req.body.page_url || req.body.pageUrl || req.body.url || req.headers.referer || null;
    }

    // Domain normalization: automatically detect and normalize to registered DB domain
    let rawDomain =
      req.body.domain ||
      req.body.websiteDomain ||
      req.body.sourceDomain ||
      req.body.brand ||
      req.body.domainName ||
      req.body.website ||
      "";

    if (!rawDomain) {
      const urlCandidate =
        req.body.landing_page_url || req.headers.referer || req.headers.origin || "";
      if (urlCandidate) {
        try {
          const urlObj = new URL(
            urlCandidate.startsWith("http") ? urlCandidate : `https://${urlCandidate}`
          );
          rawDomain = urlObj.hostname.replace(/^www\./i, "");
        } catch {
          rawDomain = urlCandidate;
        }
      }
    }

    const domainLower = String(rawDomain).toLowerCase();
    if (domainLower.includes("nigape")) {
      req.body.domain = "Nigape";
    } else if (domainLower.includes("nidads")) {
      req.body.domain = "Nidads";
    } else if (domainLower.includes("nihacs")) {
      req.body.domain = "Nihacs";
    } else if (domainLower.includes("hackingvidya")) {
      req.body.domain = "HackingVidya";
    } else if (domainLower.includes("languagevidya")) {
      req.body.domain = "LanguageVidya";
    } else if (domainLower.includes("designingvidya")) {
      req.body.domain = "DesigningVidya";
    } else if (domainLower.includes("nifase")) {
      req.body.domain = "Nifase";
    } else if (domainLower.includes("iidad")) {
      req.body.domain = "IIDAD";
    } else if (domainLower.includes("dizitaladda")) {
      req.body.domain = "DizitalAdda";
    } else if (rawDomain) {
      req.body.domain = rawDomain;
    } else {
      req.body.domain = "DizitalAdda";
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
 * Supports /leads, /lead, and root /
 * =====================================================
 */
router.post(
  ["/leads", "/lead", "/"],
  normalizePublicLeadPayload,
  capturePublicLeadValidator,
  validate,
  capturePublicLead
);

export default router;
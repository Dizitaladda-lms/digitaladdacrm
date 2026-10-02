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
  "MAIN_WEBSITE",
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
    // Course normalization from multiple possible input formats / names
    const extractCourse = (obj) => {
      if (!obj || typeof obj !== "object") return "";
      const raw =
        obj.interested_course ||
        obj.interestedCourse ||
        obj.course ||
        obj.course_name ||
        obj.courseName ||
        obj.courses ||
        obj.selectedCourse ||
        obj.selected_course ||
        obj.select_course ||
        obj.selectCourse ||
        obj.choose_course ||
        obj.chooseCourse ||
        obj.program ||
        obj.programs ||
        obj.program_name ||
        obj.programName ||
        obj.subject ||
        obj.subjects ||
        obj.training ||
        obj.stream ||
        obj.service ||
        obj.service_name ||
        obj.serviceName ||
        obj.interest ||
        obj.interested_in ||
        obj.interestedIn ||
        obj.qualification ||
        "";

      if (Array.isArray(raw)) {
        return raw
          .map((item) => (typeof item === "object" ? item?.name || item?.label || item?.title || item?.value || "" : item))
          .filter(Boolean)
          .join(", ");
      }
      if (typeof raw === "object" && raw !== null) {
        return raw.name || raw.label || raw.title || raw.value || "";
      }
      return String(raw || "").trim();
    };

    let courseVal = extractCourse(req.body);
    if (!courseVal && req.body.formData) courseVal = extractCourse(req.body.formData);
    if (!courseVal && req.body.data) courseVal = extractCourse(req.body.data);
    if (!courseVal && req.body.fields) courseVal = extractCourse(req.body.fields);
    if (!courseVal && req.body.payload) courseVal = extractCourse(req.body.payload);
    if (!courseVal && req.query) courseVal = extractCourse(req.query);

    if (courseVal) {
      req.body.interested_course = courseVal;
      req.body.course = courseVal;
      req.body.course_name = courseVal;
    }

    if (!req.body.preferred_centre) {
      req.body.preferred_centre =
        req.body.centre || req.body.preferredCentre || req.body.campus || req.body.branch || "";
    }
    if (!req.body.campaign_id && req.body.campaignId) {
      req.body.campaign_id = req.body.campaignId;
    }

    if (!req.body.landing_page_url) {
      req.body.landing_page_url =
        req.body.page_url || req.body.pageUrl || req.body.url || req.headers.referer || null;
    }

    // 1. Domain normalization: identify main websites, agency, and registered brands
    let rawDomain =
      req.body.domain ||
      req.body.domains ||
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
          rawDomain = urlObj.hostname;
        } catch {
          rawDomain = urlCandidate;
        }
      }
    }

    const rawSource = String(
      req.body.source || req.body.leadSource || ""
    ).trim();

    const domainLower = String(rawDomain).toLowerCase();
    const sourceLower = rawSource.toLowerCase();

    const isAgency =
      domainLower.includes("client") ||
      domainLower.includes("dizitaladdaagency") ||
      sourceLower.includes("agency");

    let isMainWebsite = false;

    if (isAgency) {
      req.body.domain = "www.dizitaladdaagency.com";
      req.body.source = "AGENCY_WEBSITE";
      req.body.is_agency_lead = true;
    } else if (domainLower.includes("nidads")) {
      req.body.domain = "www.nidads.com";
      isMainWebsite = true;
    } else if (domainLower.includes("nipage") || domainLower.includes("nigape")) {
      req.body.domain = "www.nipage.com";
      isMainWebsite = true;
    } else if (domainLower.includes("iidad")) {
      req.body.domain = "www.iidad.com";
      isMainWebsite = true;
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
    } else if (domainLower.includes("dizitaladda")) {
      req.body.domain = "DizitalAdda";
    } else if (rawDomain) {
      req.body.domain = rawDomain;
    } else {
      req.body.domain = "DizitalAdda";
    }

    // Service, Budget, Message / Subject normalization for agency & client leads
    if (req.body.service) {
      req.body.service = String(req.body.service).trim();
      if (!req.body.interested_course) {
        req.body.interested_course = req.body.service;
      }
    }
    if (req.body.budget) {
      req.body.budget = String(req.body.budget).trim();
    }

    const msg = req.body.message || req.body.subject || req.body.remarks || req.body.notes || "";
    const extraDetails = [];
    if (req.body.service) extraDetails.push(`Service: ${req.body.service}`);
    if (req.body.budget) extraDetails.push(`Budget: ${req.body.budget}`);
    if (msg) extraDetails.push(`Inquiry: ${msg}`);

    if (extraDetails.length > 0 && !req.body.remarks) {
      req.body.remarks = extraDetails.join(" | ");
    }

    // 2. Source normalization: agency websites get "AGENCY_WEBSITE", main websites get "MAIN_WEBSITE"
    const upperSource = rawSource.toUpperCase().replace(/\s+/g, "_");

    if (isAgency) {
      req.body.source = "AGENCY_WEBSITE";
    } else if (
      isMainWebsite ||
      upperSource === "MAIN_WEBSITE" ||
      upperSource === "MAIN WEBSITE" ||
      rawSource.toLowerCase().includes("main website")
    ) {
      req.body.source = "MAIN_WEBSITE";
    } else if (KNOWN_SOURCES.includes(upperSource)) {
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
    } else if (upperSource.includes("WEB")) {
      req.body.source = isMainWebsite ? "MAIN_WEBSITE" : "WEBSITE";
    } else {
      req.body.source = isMainWebsite ? "MAIN_WEBSITE" : "LANDING_PAGE";
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
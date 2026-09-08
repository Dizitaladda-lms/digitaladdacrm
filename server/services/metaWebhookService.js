import { capturePublicLeadService } from "./leadCaptureService.js";
import logger from "../utils/logger.js";

/**
 * Extracts and maps field_data from Meta Lead Ads payload
 */
export const extractMetaFields = (fieldDataArray = []) => {
  const fields = {};
  let course = "";
  let city = "";

  for (const item of fieldDataArray) {
    const name = (item.name || "").toLowerCase().trim();
    const val =
      Array.isArray(item.values) && item.values.length > 0
        ? item.values[0]
        : item.value || "";

    if (name.includes("full_name") || name === "name") {
      fields.full_name = val;
    } else if (name.includes("first_name") && !fields.full_name) {
      fields.first_name = val;
    } else if (name.includes("last_name") && !fields.full_name) {
      fields.last_name = val;
    } else if (
      name.includes("phone") ||
      name.includes("mobile") ||
      name.includes("contact")
    ) {
      fields.mobile = val;
    } else if (name.includes("email")) {
      fields.email = val;
    } else if (
      name.includes("course") ||
      name.includes("program") ||
      name.includes("interested")
    ) {
      course = val;
    } else if (
      name.includes("city") ||
      name.includes("centre") ||
      name.includes("location")
    ) {
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
 * Fetch lead details from Meta Graph API using leadgen_id
 */
export const fetchMetaLeadDetails = async (leadgenId) => {
  const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!pageToken) {
    logger.warn(
      `META_PAGE_ACCESS_TOKEN not set. Cannot fetch Meta leadgen_id: ${leadgenId}`
    );
    return null;
  }

  const apiVersion = process.env.META_GRAPH_VERSION || "v21.0";
  const url = `https://graph.facebook.com/${apiVersion}/${leadgenId}?access_token=${pageToken}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.text();
      logger.error(
        `Meta Graph API lead fetch failed for ${leadgenId}: ${errorBody}`
      );
      return null;
    }
    return await res.json();
  } catch (err) {
    logger.error(`Network error calling Meta Graph API for ${leadgenId}: ${err.message}`);
    return null;
  }
};

/**
 * Process incoming Meta Webhook event
 */
export const handleMetaWebhookEvent = async (body) => {
  if (body?.object !== "page" || !Array.isArray(body?.entry)) {
    return { success: false, reason: "Not a page event" };
  }

  const results = [];

  for (const entry of body.entry) {
    if (!Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      if (change.field !== "leadgen" || !change.value) continue;

      const { leadgen_id, form_id, ad_id } = change.value;

      logger.info(`Processing Meta leadgen event for ID: ${leadgen_id}`);

      // 1. Fetch lead details from Meta Graph API
      const metaLead = await fetchMetaLeadDetails(leadgen_id);

      let mappedFields = {};
      if (metaLead && Array.isArray(metaLead.field_data)) {
        mappedFields = extractMetaFields(metaLead.field_data);
      } else if (Array.isArray(change.value.field_data)) {
        mappedFields = extractMetaFields(change.value.field_data);
      }

      const rawMobile = mappedFields.mobile || "";
      const cleanedMobile = String(rawMobile).replace(/\D/g, "");
      const finalMobile =
        cleanedMobile.length >= 10 ? cleanedMobile.slice(-10) : cleanedMobile;

      if (!finalMobile && !mappedFields.email && !mappedFields.full_name) {
        logger.warn(
          `No usable contact fields found for Meta leadgen ID: ${leadgen_id}. Make sure META_PAGE_ACCESS_TOKEN is set.`
        );
        continue;
      }

      const leadPayload = {
        full_name: mappedFields.full_name || "Meta Lead",
        mobile: finalMobile || "0000000000",
        email: mappedFields.email || null,
        interested_course: mappedFields.interested_course || null,
        preferred_centre: mappedFields.preferred_centre || null,
        source: "META",
        domain:
          mappedFields.domain ||
          process.env.META_DEFAULT_DOMAIN ||
          "DizitalAdda",
        external_lead_id: String(leadgen_id),
        utm_source: "meta",
        utm_medium: "paid_social",
        utm_campaign: form_id
          ? `meta_form_${form_id}`
          : ad_id
          ? `meta_ad_${ad_id}`
          : "meta_lead_ad",
        campaign_id: null,
      };

      try {
        const saved = await capturePublicLeadService(leadPayload, {
          ip: "meta-webhook",
        });
        results.push(saved);
        logger.info(
          `Successfully captured Meta lead into CRM: ${
            saved.lead?.lead_code || leadgen_id
          }`
        );
      } catch (err) {
        logger.error(
          `Failed to capture Meta lead ${leadgen_id}: ${err.message}`
        );
      }
    }
  }

  return { success: true, processedCount: results.length, results };
};

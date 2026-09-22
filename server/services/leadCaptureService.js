import pool from "../config/db.js";

import ApiError from "../utils/ApiError.js";
import auditLogger from "../utils/auditLogger.js";

import {
  getNextLeadCodeRepository,
  findLeadByMobileOrEmailRepository,
  createPublicLeadRepository,
  updateExistingLeadRepository,
  createLeadActivityRepository,
} from "../repositories/leadCaptureRepository.js";

import {
  findCampaignByIdRepository,
} from "../repositories/campaignRepository.js";
import { autoAssignLeadService } from "./leadRoutingService.js";

/**
 * =====================================================
 * Capture Public Lead
 * =====================================================
 */

export const capturePublicLeadService = async (

  leadData,

  req

) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    /**
     * Campaign Validation (Optional)
     */
    if (leadData.campaign_id) {
      const campaign =
        await findCampaignByIdRepository(
          leadData.campaign_id
        );

      if (!campaign) {
        throw new ApiError(
          404,
          "Campaign not found."
        );
      }
    } else {
      leadData.campaign_id = null;
    }

    /**
     * Duplicate Check
     */

    const existingLead =
      await findLeadByMobileOrEmailRepository(

        leadData.mobile,

        leadData.email

      );

    /**
     * Duplicate Lead
     */

    if (existingLead) {

      const newCount = (Number(existingLead.received_count) || 1) + 1;
      const firstSource = existingLead.first_source || existingLead.source || "UNKNOWN";
      const previousSource = existingLead.source || "UNKNOWN";
      const newSource = leadData.source || "UNKNOWN";

      // Parse existing source_history
      let history = [];
      try {
        if (typeof existingLead.source_history === "string") {
          history = JSON.parse(existingLead.source_history);
        } else if (Array.isArray(existingLead.source_history)) {
          history = [...existingLead.source_history];
        }
      } catch {
        history = [];
      }

      // If history was empty, seed the initial lead entry
      if (history.length === 0) {
        history.push({
          count: 1,
          source: firstSource,
          domain: existingLead.domain || null,
          course: existingLead.interested_course || null,
          captured_at: existingLead.created_at || existingLead.captured_at || new Date().toISOString(),
        });
      }

      history.push({
        count: newCount,
        source: newSource,
        domain: leadData.domain || existingLead.domain || null,
        course: leadData.interested_course || existingLead.interested_course || null,
        captured_at: new Date().toISOString(),
      });

      const updatedLead =
        await updateExistingLeadRepository(

          client,

          existingLead.id,

          {

            ...leadData,

            first_source: firstSource,

            previous_source: previousSource,

            source: newSource,

            received_count: newCount,

            source_history: JSON.stringify(history),

            updated_by: null,

          }

        );

      const reinquiryDesc = `Re-inquiry #${newCount} received from ${newSource} (1st source: ${firstSource}${previousSource !== firstSource ? `, previous: ${previousSource}` : ""}).`;

      await createLeadActivityRepository(

        client,

        {

          lead_id: existingLead.id,

          activity: "LEAD_REINQUIRY",

          description: reinquiryDesc,

          performed_by: null,

        }

      );

      await client.query("COMMIT");

      return {

        type: "UPDATED",

        lead: updatedLead,

      };

    }

    /**
     * Generate Lead Code
     */

    const sequence =
      await getNextLeadCodeRepository(client);

    const leadCode =

      `${process.env.LEAD_CODE_PREFIX || "LEAD"}${String(sequence).padStart(6, "0")}`;

    /**
     * Create Lead
     */

    const lead =
      await createPublicLeadRepository(

        client,

        {

          ...leadData,

          lead_code: leadCode,

          captured_at: new Date(),

          created_by: null,

        }

      );

    /**
     * Activity Log
     */

    const routing = await autoAssignLeadService(
      client,
      lead
    );

    await createLeadActivityRepository(

      client,

      {

        lead_id: lead.id,

        activity: "LEAD_CREATED",

        description:
          routing.assigned
            ? `Lead captured and auto-assigned to ${routing.employee.full_name}.`
            : `Lead captured from public source. ${routing.reason || ""}`.trim(),

        performed_by: null,

      }

    );

    /**
     * Audit Log
     */

    auditLogger({

      action: "PUBLIC_LEAD_CAPTURE",

      module: "LEAD",

      role: "PUBLIC",

      userId: null,

      entityId: lead.id,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return {

      type: "CREATED",

        lead: routing.lead || lead,
        routing,

    };

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

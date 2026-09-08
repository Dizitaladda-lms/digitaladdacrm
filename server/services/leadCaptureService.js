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

      const updatedLead =
        await updateExistingLeadRepository(

          client,

          existingLead.id,

          {

            ...leadData,

            updated_by: null,

          }

        );

      await createLeadActivityRepository(

        client,

        {

          lead_id: existingLead.id,

          activity: "LEAD_UPDATED",

          description:
            "Existing lead updated from public source.",

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

import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import auditLogger from "../utils/auditLogger.js";

import {

  getNextCampaignCodeRepository,
  createCampaignRepository,
  findCampaignByNameRepository,

} from "../repositories/campaignRepository.js";

import {

  getCampaignsRepository,
  getCampaignCountRepository,
  findCampaignByIdRepository,

} from "../repositories/campaignRepository.js";

import {
  updateCampaignRepository,
  deleteCampaignRepository,
  restoreCampaignRepository,
} from "../repositories/campaignRepository.js";

import {
  getCampaignStatisticsRepository,
} from "../repositories/campaignRepository.js";

export const createCampaignService = async (

  campaignData,

  currentUser,

  req

) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    /**
     * Duplicate Campaign
     */

    const existingCampaign =
      await findCampaignByNameRepository(
        campaignData.campaign_name
      );

    if (existingCampaign) {

      throw new ApiError(
        409,
        "Campaign already exists."
      );

    }

    /**
     * Campaign Code
     */

    const sequence =
      await getNextCampaignCodeRepository(client);

    const campaignCode =

      `${process.env.CAMPAIGN_CODE_PREFIX || "CAM"}${String(sequence).padStart(6, "0")}`;

    /**
     * Create Campaign
     */

    const campaign =
      await createCampaignRepository(client, {

        ...campaignData,

        campaign_code: campaignCode,

        created_by: currentUser.id,

      });

    /**
     * Audit Log
     */

    auditLogger({

      action: "CAMPAIGN_CREATED",

      module: "CAMPAIGN",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: campaign.id,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return campaign;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Get All Campaigns
 * =====================================================
 */

export const getAllCampaignsService = async (

  queryParams

) => {

  const page = Number(queryParams.page) || 1;

  const limit = Number(queryParams.limit) || 10;

  const search = queryParams.search || "";

  const status = queryParams.status || null;

  const platform = queryParams.platform || null;

  const campaigns =
    await getCampaignsRepository(

      page,

      limit,

      search,

      status,

      platform

    );

  const totalRecords =
    await getCampaignCountRepository(

      search,

      status,

      platform

    );

  return {

    campaigns,

    pagination: {

      page,

      limit,

      totalRecords,

      totalPages: Math.ceil(
        totalRecords / limit
      ),

    },

  };

};

/**
 * =====================================================
 * Get Campaign By ID
 * =====================================================
 */

export const getCampaignByIdService = async (

  id

) => {

  const campaign =
    await findCampaignByIdRepository(id);

  if (!campaign) {

    throw new ApiError(

      404,

      "Campaign not found."

    );

  }

  return campaign;

};

/**
 * =====================================================
 * Update Campaign
 * =====================================================
 */

export const updateCampaignService = async (

  id,

  campaignData,

  currentUser,

  req

) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const campaign =
      await findCampaignByIdRepository(id);

    if (!campaign) {

      throw new ApiError(
        404,
        "Campaign not found."
      );

    }

    const updatedCampaign =
      await updateCampaignRepository(
        client,
        id,
        {
          ...campaign,
          ...campaignData,
          updated_by: currentUser.id,
        }
      );

    auditLogger({

      action: "CAMPAIGN_UPDATED",

      module: "CAMPAIGN",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: id,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return updatedCampaign;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Delete Campaign
 * =====================================================
 */

export const deleteCampaignService = async (

  id,

  currentUser,

  req

) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const campaign =
      await findCampaignByIdRepository(id);

    if (!campaign) {

      throw new ApiError(
        404,
        "Campaign not found."
      );

    }

    const deletedCampaign =
      await deleteCampaignRepository(

        client,

        id,

        currentUser.id

      );

    auditLogger({

      action: "CAMPAIGN_DELETED",

      module: "CAMPAIGN",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: id,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return deletedCampaign;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Restore Campaign
 * =====================================================
 */

export const restoreCampaignService = async (

  id,

  currentUser,

  req

) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const campaign =
      await restoreCampaignRepository(

        client,

        id,

        currentUser.id

      );

    if (!campaign) {

      throw new ApiError(
        404,
        "Campaign not found."
      );

    }

    auditLogger({

      action: "CAMPAIGN_RESTORED",

      module: "CAMPAIGN",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: id,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return campaign;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Campaign Statistics
 * =====================================================
 */

export const getCampaignStatisticsService = async () => {

  return await getCampaignStatisticsRepository();

};
import pool from "../config/db.js";

export const getNextCampaignCodeRepository = async (
  client
) => {

  await client.query(`CREATE SEQUENCE IF NOT EXISTS campaign_code_seq START WITH 1001;`);

  const result = await client.query(`

    SELECT nextval(
      'campaign_code_seq'
    ) AS sequence;

  `);

  return result.rows[0].sequence;

};

export const createCampaignRepository = async (
  client,
  campaign
) => {

  const query = `

    INSERT INTO campaigns (

      campaign_code,
      campaign_name,
      platform,
      source,
      budget,
      landing_page_url,
      description,
      start_date,
      end_date,
      status,
      created_by

    )

    VALUES (

      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11

    )

    RETURNING *;

  `;

  const values = [

    campaign.campaign_code,
    campaign.campaign_name,
    campaign.platform || "META",
    campaign.source || null,
    campaign.budget ?? 0,
    campaign.landing_page_url || null,
    campaign.description || null,
    campaign.start_date || null,
    campaign.end_date || null,
    campaign.status || "ACTIVE",
    campaign.created_by,

  ];

  const result =
    await client.query(query, values);

  return result.rows[0];

};

export const findCampaignByIdRepository = async (
  id
) => {

  const result = await pool.query(

    `
      SELECT *

      FROM campaigns

      WHERE id = $1

      AND is_deleted = FALSE;
    `,

    [id]

  );

  return result.rows[0];

};

export const findCampaignByNameRepository = async (
  campaignName
) => {

  const result = await pool.query(

    `
      SELECT *

      FROM campaigns

      WHERE campaign_name = $1

      AND is_deleted = FALSE;
    `,

    [campaignName]

  );

  return result.rows[0];

};

export const getCampaignsRepository = async (

  page = 1,

  limit = 10,

  search = "",

  status,

  platform

) => {

  const offset = (page - 1) * limit;

  let query = `

    SELECT *

    FROM campaigns

    WHERE is_deleted = FALSE

  `;

  const values = [];

  let index = 1;

  /**
   * Search
   */

  if (search) {

    query += `

      AND (

        campaign_name ILIKE $${index}

        OR campaign_code ILIKE $${index}

      )

    `;

    values.push(`%${search}%`);

    index++;

  }

  /**
   * Status Filter
   */

  if (status) {

    query += `

      AND status = $${index}

    `;

    values.push(status);

    index++;

  }

  /**
   * Platform Filter
   */

  if (platform) {

    query += `

      AND platform = $${index}

    `;

    values.push(platform);

    index++;

  }

  query += `

    ORDER BY created_at DESC

    LIMIT $${index}

    OFFSET $${index + 1};

  `;

  values.push(limit);

  values.push(offset);

  const result = await pool.query(
    query,
    values
  );

  return result.rows;

};

export const getCampaignCountRepository = async (

  search = "",

  status,

  platform

) => {

  let query = `

    SELECT COUNT(*) AS total

    FROM campaigns

    WHERE is_deleted = FALSE

  `;

  const values = [];

  let index = 1;

  if (search) {

    query += `

      AND (

        campaign_name ILIKE $${index}

        OR campaign_code ILIKE $${index}

      )

    `;

    values.push(`%${search}%`);

    index++;

  }

  if (status) {

    query += `

      AND status = $${index}

    `;

    values.push(status);

    index++;

  }

  if (platform) {

    query += `

      AND platform = $${index}

    `;

    values.push(platform);

  }

  const result = await pool.query(
    query,
    values
  );

  return Number(result.rows[0].total);

};

export const updateCampaignRepository = async (
  client,
  id,
 campaign
) => {

  const query = `

    UPDATE campaigns

    SET

      campaign_name = $1,
      platform = $2,
      source = $3,
      budget = $4,
      landing_page_url = $5,
      description = $6,
      start_date = $7,
      end_date = $8,
      status = $9,
      updated_by = $10,
      updated_at = CURRENT_TIMESTAMP

    WHERE id = $11

    RETURNING *;

  `;

  const values = [

    campaign.campaign_name,
    campaign.platform,
    campaign.source,
    campaign.budget,
    campaign.landing_page_url,
    campaign.description,
    campaign.start_date,
    campaign.end_date,
    campaign.status,
    campaign.updated_by,
    id,

  ];

  const result = await client.query(
    query,
    values
  );

  return result.rows[0];

};

export const deleteCampaignRepository = async (
  client,
  id,
  updatedBy
) => {

  const query = `

    UPDATE campaigns

    SET

      is_deleted = TRUE,

      updated_by = $1,

      updated_at = CURRENT_TIMESTAMP

    WHERE id = $2

    RETURNING *;

  `;

  const result = await client.query(
    query,
    [
      updatedBy,
      id,
    ]
  );

  return result.rows[0];

};  

export const restoreCampaignRepository = async (
  client,
  id,
  updatedBy
) => {

  const query = `

    UPDATE campaigns

    SET

      is_deleted = FALSE,

      updated_by = $1,

      updated_at = CURRENT_TIMESTAMP

    WHERE id = $2

    RETURNING *;

  `;

  const result = await client.query(
    query,
    [
      updatedBy,
      id,
    ]
  );

  return result.rows[0];

};

export const getCampaignStatisticsRepository = async () => {

  const query = `

    SELECT

      COUNT(*) FILTER (
        WHERE is_deleted = FALSE
      ) AS total_campaigns,

      COUNT(*) FILTER (
        WHERE status = 'ACTIVE'
        AND is_deleted = FALSE
      ) AS active_campaigns,

      COUNT(*) FILTER (
        WHERE status = 'INACTIVE'
        AND is_deleted = FALSE
      ) AS inactive_campaigns,

      COUNT(*) FILTER (
        WHERE status = 'COMPLETED'
        AND is_deleted = FALSE
      ) AS completed_campaigns,

      COALESCE(
        SUM(budget) FILTER (
          WHERE is_deleted = FALSE
        ),
        0
      ) AS total_budget

    FROM campaigns;

  `;

  const result = await pool.query(query);

  return result.rows[0];

};
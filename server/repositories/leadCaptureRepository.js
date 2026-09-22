import pool from "../config/db.js";

export const findLeadByMobileRepository = async (mobile) => {
  const result = await pool.query(
    `
      SELECT *
      FROM leads
      WHERE mobile = $1
      AND is_deleted = FALSE;
    `,
    [mobile]
  );
  return result.rows[0];
};

export const findLeadByEmailRepository = async (email) => {
  const result = await pool.query(
    `
      SELECT *
      FROM leads
      WHERE email = $1
      AND is_deleted = FALSE;
    `,
    [email]
  );
  return result.rows[0];
};

export const createPublicLeadRepository = async (client, lead) => {
  const initialHistory = JSON.stringify([
    {
      count: 1,
      source: lead.source,
      domain: lead.domain || null,
      course: lead.interested_course || null,
      campaign_id: lead.campaign_id || null,
      captured_at: lead.captured_at || new Date().toISOString(),
    }
  ]);

  const query = `
    INSERT INTO leads (
      lead_code,
      campaign_id,
      full_name,
      mobile,
      email,
      source,
      first_source,
      received_count,
      source_history,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      external_lead_id,
      domain,
      interested_course,
      captured_at,
      status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19
    )
    RETURNING *;
  `;

  const values = [
    lead.lead_code,
    lead.campaign_id || null,
    lead.full_name,
    lead.mobile,
    lead.email || null,
    lead.source,
    lead.first_source || lead.source,
    1,
    initialHistory,
    lead.utm_source || null,
    lead.utm_medium || null,
    lead.utm_campaign || null,
    lead.utm_content || null,
    lead.utm_term || null,
    lead.external_lead_id || null,
    lead.domain || null,
    lead.interested_course || null,
    lead.captured_at || new Date(),
    "NEW"
  ];

  const result = await client.query(query, values);
  return result.rows[0];
};

export const createLeadActivityRepository = async (client, activity) => {
  const query = `
    INSERT INTO lead_activity_logs (
      lead_id,
      activity,
      description,
      performed_by
    )
    VALUES (
      $1, $2, $3, $4
    );
  `;

  await client.query(query, [
    activity.lead_id,
    activity.activity,
    activity.description,
    activity.performed_by || null
  ]);
};

export const updateExistingLeadRepository = async (client, id, lead) => {
  const query = `
    UPDATE leads
    SET
      campaign_id = COALESCE($1, campaign_id),
      source = $2,
      first_source = COALESCE(first_source, $3),
      previous_source = $4,
      received_count = $5,
      source_history = $6,
      utm_source = COALESCE($7, utm_source),
      utm_medium = COALESCE($8, utm_medium),
      utm_campaign = COALESCE($9, utm_campaign),
      utm_content = COALESCE($10, utm_content),
      utm_term = COALESCE($11, utm_term),
      external_lead_id = COALESCE($12, external_lead_id),
      domain = COALESCE($13, domain),
      interested_course = COALESCE($14, interested_course),
      is_duplicate = TRUE,
      last_received_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $15
    RETURNING *;
  `;

  const values = [
    lead.campaign_id || null,
    lead.source,
    lead.first_source,
    lead.previous_source,
    lead.received_count,
    lead.source_history,
    lead.utm_source || null,
    lead.utm_medium || null,
    lead.utm_campaign || null,
    lead.utm_content || null,
    lead.utm_term || null,
    lead.external_lead_id || null,
    lead.domain || null,
    lead.interested_course || null,
    id
  ];

  const result = await client.query(query, values);
  return result.rows[0];
};

export const findLeadByMobileOrEmailRepository = async (mobile, email) => {
  const result = await pool.query(
    `
      SELECT *
      FROM leads
      WHERE
      (
        ($1::VARCHAR IS NOT NULL AND mobile = $1)
        OR
        ($2::VARCHAR IS NOT NULL AND email = $2)
      )
      AND is_deleted = FALSE
      ORDER BY id ASC
      LIMIT 1;
    `,
    [mobile || null, email || null]
  );

  return result.rows[0];
};

export const getNextLeadCodeRepository = async (client) => {
  const result = await client.query(`
    SELECT nextval('lead_code_seq') AS sequence;
  `);
  return result.rows[0].sequence;
};

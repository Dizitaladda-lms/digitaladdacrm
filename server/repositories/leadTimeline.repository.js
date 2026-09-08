import pool from "../config/db.js";

/**
 * =====================================================
 * Add Timeline Event
 * =====================================================
 */
export const addTimelineEventRepository = async ({
  leadId,
  employeeId = null,
  activityType,
  title,
  description = null,
  oldValue = null,
  newValue = null,
}, clientOrPool = pool) => {
  const query = `
    INSERT INTO lead_timeline
    (
      lead_id,
      employee_id,
      activity_type,
      title,
      description,
      old_value,
      new_value
    )
    VALUES
    (
      $1, $2, $3, $4, $5, $6, $7
    )
    RETURNING *;
  `;

  const values = [
    leadId,
    employeeId,
    activityType,
    title,
    description,
    oldValue,
    newValue,
  ];

  const { rows } = await clientOrPool.query(query, values);

  return rows[0];
};

/**
 * =====================================================
 * Get Lead Timeline
 * =====================================================
 */
export const getLeadTimelineRepository = async (leadId) => {
  const query = `
    SELECT
      lt.id,
      lt.activity_type,
      lt.title,
      lt.description,
      lt.old_value,
      lt.new_value,
      lt.created_at,

      e.id AS employee_id,
      e.full_name AS employee_name

    FROM lead_timeline lt

    LEFT JOIN employees e
      ON lt.employee_id = e.id

    WHERE lt.lead_id = $1

    ORDER BY lt.created_at DESC;
  `;

  const { rows } = await pool.query(query, [leadId]);

  return rows;
};
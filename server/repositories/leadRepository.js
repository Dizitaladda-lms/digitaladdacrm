import pool from "../config/db.js";

/**
 * =====================================================
 * Generate Next Lead Code
 * =====================================================
 */
export const getNextLeadCodeRepository = async (client) => {
  await client.query(`CREATE SEQUENCE IF NOT EXISTS lead_code_seq START WITH 1001;`);
  const result = await client.query(`
    SELECT nextval('lead_code_seq') AS sequence;
  `);

  return result.rows[0].sequence;
};

/**
 * =====================================================
 * Create Lead
 * =====================================================
 */
export const createLeadRepository = async (
  client,
  lead
) => {

  const query = `
  INSERT INTO leads (

    lead_code,

    campaign_id,

    domain,

    full_name,

    mobile,

    alternate_mobile,

    email,

    city,

    state,

    country,

    interested_course,

    preferred_centre,

    source,

    platform,

    landing_page_url,

    utm_source,

    utm_medium,

    utm_campaign,

    utm_content,

    utm_term,

    external_lead_id,

    status,

    priority,

    assigned_to,

    remarks,

    next_followup,

    captured_at,

    created_by

)
  

VALUES (

$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
$11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
$21, $22, $23, $24, $25, $26, $27, $28

)

    RETURNING *;
  `;

 const values = [

    lead.lead_code,

    lead.campaign_id || null,

    lead.domain || null,

    lead.full_name,

    lead.mobile,

    lead.alternate_mobile || null,

    lead.email || null,

    lead.city || null,

    lead.state || null,

    lead.country || "India",

    lead.interested_course || null,

    lead.preferred_centre || null,

    lead.source || "MANUAL",

    lead.platform || null,

    lead.landing_page_url || null,

    lead.utm_source || null,

    lead.utm_medium || null,

    lead.utm_campaign || null,

    lead.utm_content || null,

    lead.utm_term || null,

    lead.external_lead_id || null,

    lead.status || "NEW",

    lead.priority || "MEDIUM",

    lead.assigned_to || null,

    lead.remarks || null,

    lead.next_followup || null,

    lead.captured_at || new Date(),

    lead.created_by || null,

];
  const result =
    await client.query(query, values);

  return result.rows[0];

};

/**
 * =====================================================
 * Find Lead By ID
 * =====================================================
 */
export const findLeadByIdRepository = async (
  id
) => {

  const result = await pool.query(

    `
      SELECT *
      FROM leads
      WHERE id = $1
      AND is_deleted = FALSE;
    `,

    [id]

  );

  return result.rows[0];

};

/**
 * =====================================================
 * Find Lead By Email
 * =====================================================
 */
export const findLeadByEmailRepository = async (
  email
) => {

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

/**
 * =====================================================
 * Find Lead By Mobile
 * =====================================================
 */
export const findLeadByMobileRepository = async (
  mobile
) => {

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

/**
 * =====================================================
 * Get All Leads
 * Search + Filter + Pagination + Sorting
 * =====================================================
 */
export const getLeadsRepository = async (filters) => {

  const {
    page = 1,
    limit = 10,
    search = "",
    source,
    status,
    priority,
    assigned_to,
    domain,
    sortBy = "created_at",
    order = "DESC",
  } = filters;

  const values = [];
  let index = 1;

  let whereClause = `
    WHERE l.is_deleted = FALSE
  `;

  // ==========================
  // Search
  // ==========================

  if (search) {

    whereClause += `
      AND (
        l.lead_code ILIKE $${index}
        OR l.full_name ILIKE $${index}
        OR l.email ILIKE $${index}
        OR l.mobile ILIKE $${index}
        OR l.domain ILIKE $${index}
      )
    `;

    values.push(`%${search}%`);
    index++;

  }

  // ==========================
  // Source Filter
  // ==========================

  // Source Filter
  if (source && String(source).toLowerCase() !== "all") {
    whereClause += `
      AND UPPER(l.source) = $${index}
    `;
    values.push(String(source).toUpperCase());
    index++;
  }

  // Status Filter
  if (status && String(status).toLowerCase() !== "all") {
    whereClause += `
      AND UPPER(l.status) = $${index}
    `;
    values.push(String(status).toUpperCase());
    index++;
  }

  // Priority Filter
  if (priority && String(priority).toLowerCase() !== "all") {
    whereClause += `
      AND UPPER(l.priority) = $${index}
    `;
    values.push(String(priority).toUpperCase());
    index++;
  }

  // Assigned Employee Filter
  if (assigned_to) {
    const assignedStr = String(assigned_to).toLowerCase();
    if (assignedStr === "unassigned") {
      whereClause += `
        AND l.assigned_to IS NULL
      `;
    } else if (assignedStr !== "all" && !isNaN(Number(assigned_to))) {
      whereClause += `
        AND l.assigned_to = $${index}
      `;
      values.push(Number(assigned_to));
      index++;
    }
  }

  // Domain Filter
  if (domain && String(domain).toLowerCase() !== "all") {
    whereClause += `
      AND UPPER(l.domain) = $${index}
    `;
    values.push(String(domain).toUpperCase());
    index++;
  }

  // ==========================
  // Count Query
  // ==========================

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM leads l
    ${whereClause}
  `;

  const countResult = await pool.query(
    countQuery,
    values
  );

  const totalRecords = Number(
    countResult.rows[0].total
  );

  // ==========================
  // Sorting
  // ==========================

  const allowedSort = [
    "created_at",
    "full_name",
    "lead_code",
    "status",
    "priority",
  ];

  const sortColumn = allowedSort.includes(sortBy)
    ? sortBy
    : "created_at";

  const sortOrder =
    order.toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  // ==========================
  // Main Query
  // ==========================

  const query = `
    SELECT
      l.*,
      e.full_name AS assigned_employee,
      cp.campaign_name AS course_name

    FROM leads l

    LEFT JOIN employees e
      ON l.assigned_to = e.id

    LEFT JOIN campaigns cp
      ON l.campaign_id = cp.id

    ${whereClause}

    ORDER BY l.${sortColumn} ${sortOrder}

    LIMIT $${index}

    OFFSET $${index + 1}
  `;

  values.push(Number(limit));

  values.push(
    (Number(page) - 1) * Number(limit)
  );

  const result = await pool.query(
    query,
    values
  );

  return {

    leads: result.rows,

    pagination: {

      page: Number(page),

      limit: Number(limit),

      totalRecords,

      totalPages:
        Math.ceil(totalRecords / Number(limit)) || 1,

    },

  };

};

/**
 * =====================================================
 * Get My Leads (Employee)
 * =====================================================
 */

export const getMyLeadsRepository = async (filters = {}) => {
  const {
    employeeId,
    page = 1,
    limit = 10,
    search = "",
    status,
    priority,
    domain,
    sortBy = "created_at",
    order = "DESC",
  } = filters;

  if (!employeeId) {
    return {
      leads: [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords: 0,
        totalPages: 0,
      },
    };
  }

  const values = [employeeId];
  let index = 2;


  let whereClause = `
    WHERE
      l.is_deleted = FALSE
      AND l.assigned_to = $1
  `;

  // ==========================
  // Search
  // ==========================

  if (search) {

    whereClause += `
      AND (
        l.lead_code ILIKE $${index}
        OR l.full_name ILIKE $${index}
        OR l.mobile ILIKE $${index}
        OR l.email ILIKE $${index}
        OR l.domain ILIKE $${index}
      )
    `;

    values.push(`%${search}%`);
    index++;

  }

  // Status
  if (status && String(status).toLowerCase() !== "all") {
    whereClause += `
      AND UPPER(l.status) = $${index}
    `;
    values.push(String(status).toUpperCase());
    index++;
  }

  // Priority
  if (priority && String(priority).toLowerCase() !== "all") {
    whereClause += `
      AND UPPER(l.priority) = $${index}
    `;
    values.push(String(priority).toUpperCase());
    index++;
  }

  // Domain
  if (domain && String(domain).toLowerCase() !== "all") {
    whereClause += `
      AND UPPER(l.domain) = $${index}
    `;
    values.push(String(domain).toUpperCase());
    index++;
  }


  // ==========================
  // Count
  // ==========================

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM leads l
    ${whereClause}
  `;

  const countResult = await pool.query(
    countQuery,
    values
  );

  const totalRecords = Number(
    countResult.rows[0].total
  );

  const allowedSort = [
    "created_at",
    "full_name",
    "lead_code",
    "status",
    "priority",
  ];

  const sortColumn = allowedSort.includes(sortBy)
    ? sortBy
    : "created_at";

  const sortOrder =
    order.toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  const query = `
    SELECT
      l.*,
      cp.campaign_name,
      e.full_name AS assigned_employee

    FROM leads l

    LEFT JOIN campaigns cp
      ON cp.id = l.campaign_id

    LEFT JOIN employees e
      ON e.id = l.assigned_to

    ${whereClause}

    ORDER BY l.${sortColumn} ${sortOrder}

    LIMIT $${index}

    OFFSET $${index + 1}
  `;

  values.push(Number(limit));

  values.push(
    (Number(page) - 1) * Number(limit)
  );

  const result = await pool.query(
    query,
    values
  );

  return {

    leads: result.rows,

    pagination: {

      page: Number(page),

      limit: Number(limit),

      totalRecords,

      totalPages:
        Math.ceil(totalRecords / Number(limit)) || 1,

    },

  };

};

/**
 * =====================================================
 * Update Lead
 * =====================================================
 */

export const updateLeadRepository = async (
  client,
  id,
  lead
) => {
  try {

    const query = `
      UPDATE leads
SET

full_name = $1,

mobile = $2,

alternate_mobile = $3,

email = $4,

city = $5,

state = $6,

country = $7,

interested_course = $8,

preferred_centre = $9,

campaign_id = $10,

source = $11,

platform = $12,

landing_page_url = $13,

utm_source = $14,

utm_medium = $15,

utm_campaign = $16,

utm_content = $17,

utm_term = $18,

external_lead_id = $19,

status = $20,

priority = $21,

assigned_to = $22,

remarks = $23,

next_followup = $24,

captured_at = $25,

updated_by = $26,

domain = $27,

updated_at = CURRENT_TIMESTAMP

WHERE id = $28

RETURNING *;
    `;

    const values = [

    lead.full_name,

    lead.mobile,

    lead.alternate_mobile || null,

    lead.email || null,

    lead.city || null,

    lead.state || null,

    lead.country || "India",

    lead.interested_course || null,

    lead.preferred_centre || null,

    lead.campaign_id || null,

    lead.source || "MANUAL",

    lead.platform || null,

    lead.landing_page_url || null,

    lead.utm_source || null,

    lead.utm_medium || null,

    lead.utm_campaign || null,

    lead.utm_content || null,

    lead.utm_term || null,

    lead.external_lead_id || null,

    lead.status || "NEW",

    lead.priority || "MEDIUM",

    lead.assigned_to || null,

    lead.remarks || null,

    lead.next_followup || null,

    lead.captured_at || null,

    lead.updated_by || null,

    lead.domain || null,

    id,

];

    const result = await client.query(query, values);

    return result.rows[0];

  } catch (err) {

    console.error("UPDATE LEAD ERROR:", err);

    throw err;

  }
};

/**
 * =====================================================
 * Soft Delete Lead
 * =====================================================
 */

export const deleteLeadRepository = async (
  client,
  id,
  updatedBy
) => {

  const query = `
    UPDATE leads

    SET

      is_deleted = TRUE,

      updated_by = $1,

      updated_at = CURRENT_TIMESTAMP

    WHERE id = $2

    RETURNING *;
  `;

  const result =
    await client.query(query, [

      updatedBy,

      id,

    ]);

  return result.rows[0];

};

/**
 * =====================================================
 * Restore Lead
 * =====================================================
 */

export const restoreLeadRepository = async (
  client,
  id,
  updatedBy
) => {

  const query = `
    UPDATE leads

    SET

      is_deleted = FALSE,

      updated_by = $1,

      updated_at = CURRENT_TIMESTAMP

    WHERE id = $2

    RETURNING *;
  `;

  const result =
    await client.query(query, [

      updatedBy,

      id,

    ]);

  return result.rows[0];

};

/**
 * =====================================================
 * Assign Lead
 * =====================================================
 */

export const assignLeadRepository = async (
  client,
  id,
  employeeId,
  updatedBy
) => {

  const query = `
    UPDATE leads

    SET

      assigned_to = $1,

      updated_by = $2,

      updated_at = CURRENT_TIMESTAMP

    WHERE id = $3

    RETURNING *;
  `;

  const result =
    await client.query(query, [

      employeeId,

      updatedBy,

      id,

    ]);

  return result.rows[0];

};

/**
 * =====================================================
 * Update Lead Status
 * =====================================================
 */

export const updateLeadStatusRepository = async (
  client,
  id,
  status,
  feedback,
  updatedBy
) => {

  const query = `
   UPDATE leads

SET

status = $1,

feedback = $2,

updated_by = $3,

updated_at = CURRENT_TIMESTAMP

WHERE id = $4

RETURNING *;
  `;

  const result = await client.query(query, [

  status,

  feedback || null,

  updatedBy,

  id,

]);

  return result.rows[0];

};

/**
 * =====================================================
 * Lead Statistics
 * =====================================================
 */

export const getLeadStatisticsRepository = async () => {

  const query = `
    SELECT

      COUNT(*) FILTER (
        WHERE is_deleted = FALSE
      ) AS total_leads,

      COUNT(*) FILTER (
        WHERE status = 'NEW'
        AND is_deleted = FALSE
      ) AS new_leads,

      COUNT(*) FILTER (
        WHERE status = 'CONTACTED'
        AND is_deleted = FALSE
      ) AS contacted_leads,

      COUNT(*) FILTER (
        WHERE status = 'FOLLOW_UP'
        AND is_deleted = FALSE
      ) AS followup_leads,

      COUNT(*) FILTER (
        WHERE status = 'QUALIFIED'
        AND is_deleted = FALSE
      ) AS qualified_leads,

      COUNT(*) FILTER (
        WHERE status = 'ADMISSION_DONE'
        AND is_deleted = FALSE
      ) AS admission_done,

      COUNT(*) FILTER (
        WHERE status = 'LOST'
        AND is_deleted = FALSE
      ) AS lost_leads

    FROM leads;
  `;

  const result = await pool.query(query);

  return result.rows[0];

};

/**
 * =====================================================
 * Add Lead Note
 * =====================================================
 */

export const addLeadNoteRepository = async (
  client,
  leadId,
  note,
  userId
) => {

  const query = `
    INSERT INTO lead_notes (

      lead_id,
      note,
      created_by

    )

    VALUES (

      $1,$2,$3

    )

    RETURNING *;
  `;

  const result = await client.query(

    query,

    [

      leadId,

      note,

      userId,

    ]

  );

  return result.rows[0];

};

/**
 * =====================================================
 * Get Lead Notes
 * =====================================================
 */

export const getLeadNotesRepository = async (
  leadId
) => {

  const query = `
    SELECT

      ln.*,

      e.full_name AS created_by_name

    FROM lead_notes ln

    LEFT JOIN employees e

      ON ln.created_by = e.id

    WHERE ln.lead_id = $1

    ORDER BY ln.created_at DESC;
  `;

  const result =
    await pool.query(

      query,

      [

        leadId,

      ]

    );

  return result.rows;

};

/**
 * =====================================================
 * Add Lead Timeline
 * =====================================================
 */

export const addLeadTimelineRepository = async (
  client,
  leadId,
  action,
  remarks,
  userId
) => {

  const query = `
    INSERT INTO lead_timeline (

      lead_id,
      action,
      remarks,
      created_by

    )

    VALUES (

      $1,$2,$3,$4

    )

    RETURNING *;
  `;

  const result = await client.query(

    query,

    [

      leadId,

      action,

      remarks,

      userId,

    ]

  );

  return result.rows[0];

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

  const result = await pool.query(query, [leadId]);

  return result.rows;
};

// =====================================================
// Bulk Assign Leads Repository
// =====================================================

export const assignBulkLeadsRepository = async (

  client,

  payload

) => {

  const {

    lead_ids,

    employee_id,

    updated_by,

  } = payload;

  const query = `

    UPDATE leads

    SET

      assigned_to = $1,

      updated_by = $2,

      updated_at = NOW()

    WHERE id = ANY($3::int[])

      AND is_deleted = FALSE

    RETURNING

      id,

      lead_code,

      full_name,

      assigned_to;

  `;

  const result = await client.query(

    query,

    [

      employee_id,

      updated_by,

      lead_ids,

    ]

  );

  return {

    assigned_count: result.rowCount,

    leads: result.rows,

  };

};
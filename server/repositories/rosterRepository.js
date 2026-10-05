import pool from "../config/db.js";

/**
 * =====================================================
 * Employee Roster Repository
 * =====================================================
 */

export const findRosterByIdRepository = async (id) => {
  const result = await pool.query(
    `
      SELECT 
        r.*,
        e.full_name AS employee_name,
        e.employee_code,
        e.designation,
        e.role,
        d.department_name,
        reviewer.full_name AS reviewed_by_name
      FROM employee_monthly_rosters r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      WHERE r.id = $1
      LIMIT 1;
    `,
    [id]
  );
  return result.rows[0] || null;
};

export const findEmployeeRosterByMonthRepository = async (employeeId, year, month) => {
  const result = await pool.query(
    `
      SELECT 
        r.*,
        e.full_name AS employee_name,
        e.employee_code,
        e.designation,
        e.role,
        COALESCE(e.shift_timing_type, 'DEFAULT') AS shift_timing_type,
        COALESCE(e.shift_start_time, '10:00') AS shift_start_time,
        COALESCE(e.shift_end_time, '18:00') AS shift_end_time,
        e.custom_shift_timings,
        d.department_name,
        reviewer.full_name AS reviewed_by_name
      FROM employee_monthly_rosters r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      WHERE r.employee_id = $1 AND r.year = $2 AND r.month = $3
      LIMIT 1;
    `,
    [employeeId, year, month]
  );
  return result.rows[0] || null;
};

export const upsertEmployeeRosterRepository = async ({
  employee_id,
  year,
  month,
  status = "DRAFT",
  total_working_days = 0,
  total_week_offs = 0,
  total_leaves = 0,
  total_half_days = 0,
  days_data = [],
  submission_note = null,
  submitted_at = null,
}) => {
  const query = `
    INSERT INTO employee_monthly_rosters (
      employee_id,
      year,
      month,
      status,
      total_working_days,
      total_week_offs,
      total_leaves,
      total_half_days,
      days_data,
      submission_note,
      submitted_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
    ON CONFLICT (employee_id, year, month)
    DO UPDATE SET
      status = EXCLUDED.status,
      total_working_days = EXCLUDED.total_working_days,
      total_week_offs = EXCLUDED.total_week_offs,
      total_leaves = EXCLUDED.total_leaves,
      total_half_days = EXCLUDED.total_half_days,
      days_data = EXCLUDED.days_data,
      submission_note = COALESCE(EXCLUDED.submission_note, employee_monthly_rosters.submission_note),
      submitted_at = COALESCE(EXCLUDED.submitted_at, employee_monthly_rosters.submitted_at),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const values = [
    employee_id,
    year,
    month,
    status,
    total_working_days,
    total_week_offs,
    total_leaves,
    total_half_days,
    JSON.stringify(days_data),
    submission_note,
    submitted_at,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const updateRosterStatusRepository = async (id, { status, reviewed_by, review_remarks }) => {
  const result = await pool.query(
    `
      UPDATE employee_monthly_rosters
      SET 
        status = $1,
        reviewed_by = $2,
        review_remarks = $3,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `,
    [status, reviewed_by, review_remarks || null, id]
  );
  return result.rows[0] || null;
};

export const updateRosterByHRRepository = async (
  id,
  {
    days_data,
    total_working_days,
    total_week_offs,
    total_leaves,
    total_half_days,
    status,
    review_remarks,
    reviewed_by,
  }
) => {
  const result = await pool.query(
    `
      UPDATE employee_monthly_rosters
      SET
        days_data = $1,
        total_working_days = $2,
        total_week_offs = $3,
        total_leaves = $4,
        total_half_days = $5,
        status = COALESCE($6, status),
        review_remarks = COALESCE($7, review_remarks),
        reviewed_by = COALESCE($8, reviewed_by),
        reviewed_at = CASE WHEN $8 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `,
    [
      JSON.stringify(days_data),
      total_working_days,
      total_week_offs,
      total_leaves,
      total_half_days,
      status || null,
      review_remarks || null,
      reviewed_by || null,
      id,
    ]
  );
  return result.rows[0] || null;
};

export const requestRosterChangeRepository = async (id, change_request_note) => {
  const result = await pool.query(
    `
      UPDATE employee_monthly_rosters
      SET
        status = 'CHANGE_REQUESTED',
        change_request_note = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `,
    [change_request_note || null, id]
  );
  return result.rows[0] || null;
};

export const getAllEmployeesRosterForMonthRepository = async ({
  year,
  month,
  department_id,
  status,
  search,
}) => {
  const values = [Number(year), Number(month)];
  let idx = 3;
  let whereConditions = [`e.status = 'ACTIVE'`, `e.is_deleted = FALSE`];

  if (department_id && String(department_id).toUpperCase() !== "ALL") {
    whereConditions.push(`e.department_id = $${idx++}`);
    values.push(Number(department_id));
  }

  if (status && String(status).toUpperCase() !== "ALL") {
    const normStatus = String(status).toUpperCase();
    if (normStatus === "NOT_SUBMITTED") {
      whereConditions.push(`(r.id IS NULL OR r.status = 'DRAFT')`);
    } else {
      whereConditions.push(`UPPER(r.status) = $${idx++}`);
      values.push(normStatus);
    }
  }

  if (search && search.trim()) {
    whereConditions.push(`(
      e.full_name ILIKE $${idx}
      OR e.employee_code ILIKE $${idx}
      OR e.designation ILIKE $${idx}
      OR d.department_name ILIKE $${idx}
    )`);
    values.push(`%${search.trim()}%`);
    idx++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const query = `
    SELECT 
      e.id AS employee_id,
      e.full_name AS employee_name,
      e.employee_code,
      e.designation,
      e.role,
      e.profile_image,
      d.id AS department_id,
      d.department_name,
      COALESCE(e.shift_timing_type, 'DEFAULT') AS shift_timing_type,
      COALESCE(e.shift_start_time, '10:00') AS shift_start_time,
      COALESCE(e.shift_end_time, '18:00') AS shift_end_time,
      e.custom_shift_timings,
      r.id AS roster_id,
      $1::int AS year,
      $2::int AS month,
      COALESCE(r.status, 'NOT_SUBMITTED') AS status,
      COALESCE(r.total_working_days, 0) AS total_working_days,
      COALESCE(r.total_week_offs, 0) AS total_week_offs,
      COALESCE(r.total_leaves, 0) AS total_leaves,
      COALESCE(r.total_half_days, 0) AS total_half_days,
      r.days_data,
      r.submission_note,
      r.submitted_at,
      r.reviewed_by,
      reviewer.full_name AS reviewed_by_name,
      r.reviewed_at,
      r.review_remarks,
      r.change_request_note,
      r.updated_at
    FROM employees e
    LEFT JOIN employee_monthly_rosters r ON r.employee_id = e.id AND r.year = $1 AND r.month = $2
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
    ${whereClause}
    ORDER BY 
      CASE 
        WHEN r.status = 'CHANGE_REQUESTED' THEN 0
        WHEN r.status = 'SUBMITTED' THEN 1
        WHEN r.status = 'DRAFT' THEN 2
        WHEN r.status = 'APPROVED' THEN 3
        WHEN r.status = 'REJECTED' THEN 4
        ELSE 5 
      END,
      e.full_name ASC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

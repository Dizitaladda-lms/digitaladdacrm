import pool from "../config/db.js";

/**
 * Create a new Admission record
 */
export const createAdmissionRepository = async (clientOrPool, data) => {
  const db = clientOrPool || pool;
  const {
    lead_id,
    student_name,
    mobile,
    email,
    course_name,
    campus_centre,
    total_fee = 0,
    paid_fee = 0,
    receipt_no = null,
    payment_mode = "CASH",
    next_due_date = null,
    status = "ENROLLED",
    assigned_to = null,
    remarks = null,
  } = data;

  const totalNum = Number(total_fee) || 0;
  const paidNum = Number(paid_fee) || 0;
  const pendingNum = Math.max(0, totalNum - paidNum);

  // Generate admission_code e.g. ADM1001
  const countRes = await db.query("SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(admission_code, '[^0-9]', '', 'g') AS INTEGER)), 1001) + 1 AS next_num FROM admissions;");
  const admissionCode = `ADM${countRes.rows[0].next_num}`;

  const query = `
    INSERT INTO admissions (
      admission_code, lead_id, student_name, mobile, email,
      course_name, campus_centre, total_fee, paid_fee, pending_fee,
      receipt_no, payment_mode, next_due_date, status, assigned_to, remarks
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *;
  `;

  const values = [
    admissionCode,
    lead_id || null,
    student_name,
    mobile,
    email || null,
    course_name || "BCA",
    campus_centre || null,
    totalNum,
    paidNum,
    pendingNum,
    receipt_no,
    payment_mode,
    next_due_date || null,
    status,
    assigned_to || null,
    remarks,
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * Get Admissions list with filters, search, metrics & pagination
 */
export const getAdmissionsRepository = async (filters = {}) => {
  const {
    employeeId,
    search = "",
    status,
    course,
    page = 1,
    limit = 20,
  } = filters;

  const values = [];
  let index = 1;
  let whereClause = "WHERE 1=1";

  if (employeeId) {
    whereClause += ` AND a.assigned_to = $${index}`;
    values.push(employeeId);
    index++;
  }

  if (search) {
    whereClause += ` AND (
      a.student_name ILIKE $${index}
      OR a.mobile ILIKE $${index}
      OR a.admission_code ILIKE $${index}
      OR a.receipt_no ILIKE $${index}
    )`;
    values.push(`%${search}%`);
    index++;
  }

  if (status && status !== "ALL") {
    whereClause += ` AND UPPER(a.status) = $${index}`;
    values.push(status.toUpperCase());
    index++;
  }

  if (course && course !== "ALL") {
    whereClause += ` AND UPPER(a.course_name) ILIKE $${index}`;
    values.push(`%${course}%`);
    index++;
  }

  // Count Query
  const countQuery = `SELECT COUNT(*) AS total FROM admissions a ${whereClause};`;
  const countRes = await pool.query(countQuery, values);
  const totalRecords = Number(countRes.rows[0].total || 0);

  // Summary Metrics Query
  const summaryQuery = `
    SELECT
      COUNT(*)::INT AS total_admissions,
      COALESCE(SUM(a.total_fee), 0)::NUMERIC AS total_revenue,
      COALESCE(SUM(a.paid_fee), 0)::NUMERIC AS total_paid,
      COALESCE(SUM(a.pending_fee), 0)::NUMERIC AS total_pending
    FROM admissions a
    ${whereClause};
  `;
  const summaryRes = await pool.query(summaryQuery, values);
  const summary = summaryRes.rows[0] || {
    total_admissions: 0,
    total_revenue: 0,
    total_paid: 0,
    total_pending: 0,
  };

  // Main Data Query
  const offset = (Number(page) - 1) * Number(limit);
  const query = `
    SELECT
      a.*,
      e.full_name AS counsellor_name
    FROM admissions a
    LEFT JOIN employees e ON e.id = a.assigned_to
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${index} OFFSET $${index + 1};
  `;

  values.push(Number(limit), offset);
  const { rows } = await pool.query(query, values);

  return {
    admissions: rows,
    summary,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalRecords,
      totalPages: Math.ceil(totalRecords / Number(limit)) || 1,
    },
  };
};

/**
 * Record fee installment payment for an admission
 */
export const collectFeeRepository = async (admissionId, installmentData) => {
  const {
    amount_paid,
    receipt_no,
    payment_mode = "CASH",
    next_due_date = null,
    remarks = null,
  } = installmentData;

  const currentRes = await pool.query(
    "SELECT * FROM admissions WHERE id = $1;",
    [admissionId]
  );
  const current = currentRes.rows[0];
  if (!current) return null;

  const newPaid = Number(current.paid_fee) + Number(amount_paid);
  const total = Number(current.total_fee);
  const newPending = Math.max(0, total - newPaid);
  const newStatus = newPending === 0 ? "COMPLETED" : "ENROLLED";

  const query = `
    UPDATE admissions
    SET
      paid_fee = $1,
      pending_fee = $2,
      receipt_no = COALESCE($3, receipt_no),
      payment_mode = $4,
      next_due_date = $5,
      status = $6,
      remarks = COALESCE($7, remarks),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    newPaid,
    newPending,
    receipt_no || null,
    payment_mode,
    next_due_date || null,
    newStatus,
    remarks || null,
    admissionId,
  ]);

  return rows[0];
};

/**
 * Get single Admission record by ID
 */
export const getAdmissionByIdRepository = async (id) => {
  const query = `
    SELECT a.*, e.full_name AS counsellor_name
    FROM admissions a
    LEFT JOIN employees e ON e.id = a.assigned_to
    WHERE a.id = $1;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

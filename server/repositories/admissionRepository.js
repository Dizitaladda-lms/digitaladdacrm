import pool from "../config/db.js";

export const generateReceiptNumber = (domain) => {
  const prefix = (domain || "").toLowerCase().includes("nipage") || (domain || "").toLowerCase().includes("nigape")
    ? "ECGAIPE - "
    : (domain || "").toLowerCase().includes("nidads")
    ? "NIDADS - "
    : "DA - ";
  const datePart = new Date().toISOString().slice(2, 4); // e.g. "26"
  const randPart = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `${prefix}${datePart}${randPart}`;
};

/**
 * Create a new Admission record
 */
export const createAdmissionRepository = async (clientOrPool, data) => {
  const db = clientOrPool || pool;
  const {
    lead_id,
    student_name,
    father_name = null,
    domain = "DizitalAdda",
    mobile,
    email,
    course_name,
    campus_centre,
    total_fee = 0,
    paid_fee = 0,
    receipt_no = null,
    payment_mode = "CASH",
    transaction_id = null,
    proof_image_url = null,
    fee_month = null,
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
  const generatedReceipt = receipt_no || (paidNum > 0 ? generateReceiptNumber(domain) : null);

  const query = `
    INSERT INTO admissions (
      admission_code, lead_id, student_name, father_name, domain, mobile, email,
      course_name, campus_centre, total_fee, paid_fee, pending_fee,
      receipt_no, payment_mode, next_due_date, status, assigned_to, remarks
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *;
  `;

  const values = [
    admissionCode,
    lead_id || null,
    student_name,
    father_name,
    domain || "DizitalAdda",
    mobile,
    email || null,
    course_name || "BCA",
    campus_centre || null,
    totalNum,
    paidNum,
    pendingNum,
    generatedReceipt,
    payment_mode,
    next_due_date || null,
    status,
    assigned_to || null,
    remarks,
  ];

  const { rows } = await db.query(query, values);
  const admission = rows[0];

  // If initial payment was made, log into admission_payments
  if (paidNum > 0 && admission?.id) {
    try {
      const paymentInsert = `
        INSERT INTO admission_payments (
          admission_id, receipt_no, amount, payment_mode,
          transaction_id, proof_image_url, payment_date,
          fee_month, remarks, recorded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9)
        RETURNING *;
      `;
      const payRes = await db.query(paymentInsert, [
        admission.id,
        generatedReceipt,
        paidNum,
        payment_mode,
        transaction_id || null,
        proof_image_url || null,
        fee_month || null,
        remarks || "Initial Enrollment Fee",
        assigned_to || null,
      ]);
      admission.latest_payment = payRes.rows[0];
    } catch (payErr) {
      console.error("Error creating initial payment log:", payErr);
    }
  }

  return admission;
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
export const collectFeeRepository = async (admissionId, installmentData, recordedBy = null) => {
  const {
    amount_paid,
    amount,
    receipt_no,
    receipt_number,
    payment_mode = "ONLINE",
    transaction_id = null,
    proof_image_url = null,
    payment_date = null,
    fee_month = null,
    next_due_date = null,
    remarks = null,
    father_name = null,
    domain = null,
  } = installmentData;

  const currentRes = await pool.query(
    "SELECT * FROM admissions WHERE id = $1;",
    [admissionId]
  );
  const current = currentRes.rows[0];
  if (!current) return null;

  const collectedAmount = Number(amount_paid || amount || 0);
  const newPaid = Number(current.paid_fee) + collectedAmount;
  const total = Number(current.total_fee);
  const newPending = Math.max(0, total - newPaid);
  const newStatus = newPending === 0 ? "COMPLETED" : "ENROLLED";

  const studentDomain = domain || current.domain || "DizitalAdda";
  const finalReceiptNo = receipt_no || receipt_number || generateReceiptNumber(studentDomain);

  const query = `
    UPDATE admissions
    SET
      paid_fee = $1,
      pending_fee = $2,
      receipt_no = $3,
      payment_mode = $4,
      next_due_date = $5,
      status = $6,
      remarks = COALESCE($7, remarks),
      father_name = COALESCE($8, father_name),
      domain = COALESCE($9, domain),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    newPaid,
    newPending,
    finalReceiptNo,
    payment_mode,
    next_due_date || null,
    newStatus,
    remarks || null,
    father_name || null,
    domain || null,
    admissionId,
  ]);

  const updatedAdmission = rows[0];

  // Insert payment record into admission_payments
  const paymentQuery = `
    INSERT INTO admission_payments (
      admission_id, receipt_no, amount, payment_mode,
      transaction_id, proof_image_url, payment_date,
      fee_month, remarks, recorded_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const payDate = payment_date || new Date().toISOString().slice(0, 10);
  const paymentValues = [
    admissionId,
    finalReceiptNo,
    collectedAmount,
    payment_mode,
    transaction_id || null,
    proof_image_url || null,
    payDate,
    fee_month || null,
    remarks || null,
    recordedBy || null,
  ];

  const payRes = await pool.query(paymentQuery, paymentValues);
  updatedAdmission.latest_payment = payRes.rows[0];

  return updatedAdmission;
};

/**
 * Get single Admission record by ID (with complete payment ledger)
 */
export const getAdmissionByIdRepository = async (id) => {
  const query = `
    SELECT a.*, e.full_name AS counsellor_name
    FROM admissions a
    LEFT JOIN employees e ON e.id = a.assigned_to
    WHERE a.id = $1;
  `;
  const { rows } = await pool.query(query, [id]);
  if (!rows[0]) return null;

  const admission = rows[0];

  // Fetch all payment installments for this student
  const paymentsQuery = `
    SELECT p.*, e.full_name AS recorded_by_name
    FROM admission_payments p
    LEFT JOIN employees e ON e.id = p.recorded_by
    WHERE p.admission_id = $1
    ORDER BY p.payment_date DESC, p.id DESC;
  `;
  const paymentsRes = await pool.query(paymentsQuery, [id]);
  admission.payments = paymentsRes.rows || [];

  return admission;
};

/**
 * Get specific Admission Payment receipt by Payment ID
 */
export const getAdmissionPaymentByIdRepository = async (paymentId) => {
  const query = `
    SELECT p.*, a.student_name, a.mobile, a.email, a.course_name, a.campus_centre,
           a.total_fee, a.paid_fee, a.pending_fee, a.admission_code, a.father_name, a.domain,
           e.full_name AS counsellor_name
    FROM admission_payments p
    JOIN admissions a ON a.id = p.admission_id
    LEFT JOIN employees e ON e.id = a.assigned_to
    WHERE p.id = $1;
  `;
  const { rows } = await pool.query(query, [paymentId]);
  return rows[0] || null;
};

/**
 * Get Admission record by Lead ID or Lead Mobile (with complete payment ledger and proofs)
 */
export const getAdmissionByLeadIdRepository = async (leadId, leadMobile = null) => {
  let query = `
    SELECT a.*, e.full_name AS counsellor_name
    FROM admissions a
    LEFT JOIN employees e ON e.id = a.assigned_to
    WHERE a.lead_id = $1
  `;
  const values = [leadId];

  if (leadMobile) {
    query += ` OR (a.mobile IS NOT NULL AND a.mobile = $2)`;
    values.push(leadMobile);
  }

  query += ` ORDER BY a.id DESC LIMIT 1;`;

  const { rows } = await pool.query(query, values);
  if (!rows[0]) return null;

  const admission = rows[0];

  const paymentsQuery = `
    SELECT p.*, e.full_name AS recorded_by_name
    FROM admission_payments p
    LEFT JOIN employees e ON e.id = p.recorded_by
    WHERE p.admission_id = $1
    ORDER BY p.payment_date DESC, p.id DESC;
  `;
  const paymentsRes = await pool.query(paymentsQuery, [admission.id]);
  admission.payments = paymentsRes.rows || [];

  return admission;
};


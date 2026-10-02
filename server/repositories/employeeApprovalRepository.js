import pool from "../config/db.js";

export const createEmployeeApprovalRequestRepository = async (
  client,
  requestedBy,
  employeeData,
  passwordHash
) => {
  const result = await client.query(
    `INSERT INTO employee_approval_requests (requested_by, employee_data, password_hash)
     VALUES ($1, $2::jsonb, $3)
     RETURNING id, status, employee_data, created_at;`,
    [requestedBy, JSON.stringify(employeeData), passwordHash]
  );

  return result.rows[0];
};

export const listPendingEmployeeApprovalRequestsRepository = async () => {
  const result = await pool.query(`
    SELECT
      request.id,
      request.employee_data,
      request.status,
      request.created_at,
      requester.full_name AS requester_name
    FROM employee_approval_requests request
    JOIN users requester ON requester.id = request.requested_by
    WHERE request.status = 'PENDING'
    ORDER BY request.created_at ASC, request.id ASC;
  `);

  return result.rows;
};

export const findEmployeeApprovalRequestForUpdateRepository = async (client, id) => {
  const result = await client.query(
    `SELECT * FROM employee_approval_requests WHERE id = $1 FOR UPDATE;`,
    [id]
  );

  return result.rows[0] || null;
};

export const reviewEmployeeApprovalRequestRepository = async (
  client,
  id,
  reviewerId,
  status,
  reviewNote = null
) => {
  const result = await client.query(
    `UPDATE employee_approval_requests
     SET status = $1,
         reviewed_by = $2,
         reviewed_at = CURRENT_TIMESTAMP,
         review_note = $3,
       password_hash = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND status = 'PENDING'
     RETURNING id, status, reviewed_at;`,
    [status, reviewerId, reviewNote, id]
  );

  return result.rows[0] || null;
};
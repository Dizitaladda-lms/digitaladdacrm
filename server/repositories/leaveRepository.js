import pool, { withTransaction } from "../config/db.js";

const leaveRequestSelect = `
  SELECT lr.id, lr.user_id, lr.employee_id, lr.department_id, lr.leave_type,
         lr.start_date, lr.end_date, lr.reason, lr.status, lr.rejection_reason,
         lr.manager_approval_proof_public_id, lr.manager_approval_proof_filename,
         lr.manager_approval_proof_mime_type, lr.manager_approval_proof_size_bytes,
         lr.manager_approval_proof_resource_type, lr.manager_approval_proof_version,
         lr.created_at, lr.updated_at, lr.department_head_reviewed_at, lr.hr_reviewed_at,
         employee.full_name AS employee_name, employee.employee_code,
         department.department_name
  FROM employee_leave_requests lr
  JOIN employees employee ON employee.id = lr.employee_id
  LEFT JOIN departments department ON department.id = lr.department_id
`;

export const findEmployeeLeaveDetailsRepository = async (userId) => {
  const result = await pool.query(
    `SELECT id, department_id, role, designation
     FROM employees
     WHERE user_id = $1 AND is_deleted = FALSE AND UPPER(status) = 'ACTIVE'
     LIMIT 1;`,
    [userId]
  );
  return result.rows[0] || null;
};

export const findDepartmentHeadRepository = async (departmentId, excludingUserId) => {
  const result = await pool.query(
    `SELECT e.user_id
     FROM employees e
     JOIN users u ON u.id = e.user_id
     WHERE e.is_deleted = FALSE
       AND UPPER(e.status) = 'ACTIVE'
       AND u.is_active = TRUE
       AND e.user_id <> $2
       AND (
         UPPER(COALESCE(e.role, '')) IN ('MANAGER', 'ADMIN')
         OR LOWER(COALESCE(e.designation, '')) LIKE '%department head%'
         OR LOWER(COALESCE(e.designation, '')) LIKE '%head of department%'
       )
       AND (
         e.department_id = $1
         OR COALESCE(e.managed_department_ids, '[]'::jsonb) @> jsonb_build_array($1::bigint)
       )
     ORDER BY CASE WHEN e.department_id = $1 THEN 0 ELSE 1 END, e.id
     LIMIT 1;`,
    [departmentId, excludingUserId]
  );
  return result.rows[0] || null;
};

export const createLeaveRequestRepository = async (data) => {
  const result = await pool.query(
    `INSERT INTO employee_leave_requests (
       user_id, employee_id, department_id, leave_type, start_date, end_date, reason, status,
       manager_approval_proof_public_id, manager_approval_proof_resource_type,
       manager_approval_proof_version, manager_approval_proof_filename,
       manager_approval_proof_mime_type, manager_approval_proof_size_bytes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *;`,
    [
      data.userId,
      data.employeeId,
      data.departmentId,
      data.leaveType,
      data.startDate,
      data.endDate,
      data.reason,
      data.status,
      data.managerApprovalProof?.publicId || null,
      data.managerApprovalProof?.resourceType || null,
      data.managerApprovalProof?.version || null,
      data.managerApprovalProof?.filename || null,
      data.managerApprovalProof?.mimeType || null,
      data.managerApprovalProof?.sizeBytes || null,
    ]
  );
  return result.rows[0];
};

export const getMyLeaveRequestsRepository = async (userId) => {
  const result = await pool.query(
    `${leaveRequestSelect}
     WHERE lr.user_id = $1
     ORDER BY lr.created_at DESC, lr.id DESC;`,
    [userId]
  );
  return result.rows;
};

export const getPendingDepartmentHeadLeaveRequestsRepository = async (userId) => {
  const result = await pool.query(
    `${leaveRequestSelect}
     JOIN employees approver ON approver.user_id = $1 AND approver.is_deleted = FALSE
     WHERE lr.status = 'PENDING_DEPARTMENT_HEAD'
       AND lr.leave_type = 'PLANNED'
       AND lr.user_id <> $1
       AND (
         UPPER(COALESCE(approver.role, '')) IN ('MANAGER', 'ADMIN')
         OR LOWER(COALESCE(approver.designation, '')) LIKE '%department head%'
         OR LOWER(COALESCE(approver.designation, '')) LIKE '%head of department%'
       )
       AND (
         approver.department_id = lr.department_id
         OR COALESCE(approver.managed_department_ids, '[]'::jsonb) @> jsonb_build_array(lr.department_id)
       )
     ORDER BY lr.created_at ASC, lr.id ASC;`,
    [userId]
  );
  return result.rows;
};

export const isDepartmentHeadRepository = async (userId) => {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM employees
       WHERE user_id = $1
         AND is_deleted = FALSE
         AND UPPER(status) = 'ACTIVE'
         AND (
           UPPER(COALESCE(role, '')) IN ('MANAGER', 'ADMIN')
           OR LOWER(COALESCE(designation, '')) LIKE '%department head%'
           OR LOWER(COALESCE(designation, '')) LIKE '%head of department%'
         )
     ) AS allowed;`,
    [userId]
  );
  return Boolean(result.rows[0]?.allowed);
};

export const getPendingHRLeaveRequestsRepository = async () => {
  const result = await pool.query(
    `${leaveRequestSelect}
     WHERE lr.status = 'PENDING_HR_APPROVAL'
     ORDER BY lr.created_at ASC, lr.id ASC;`
  );
  return result.rows;
};

export const findLeaveApprovalProofForUserRepository = async (id, user) => {
  const result = await pool.query(
    `SELECT lr.manager_approval_proof_public_id, lr.manager_approval_proof_resource_type,
            lr.manager_approval_proof_version, lr.manager_approval_proof_filename,
            lr.manager_approval_proof_mime_type
     FROM employee_leave_requests lr
     WHERE lr.id = $1
       AND lr.manager_approval_proof_public_id IS NOT NULL
       AND (
         lr.user_id = $2
         OR $3 IN ('HR', 'SUPER_ADMIN')
         OR EXISTS (
           SELECT 1
           FROM employees approver
           WHERE approver.user_id = $2
             AND approver.is_deleted = FALSE
             AND UPPER(approver.status) = 'ACTIVE'
             AND (
               UPPER(COALESCE(approver.role, '')) IN ('MANAGER', 'ADMIN')
               OR LOWER(COALESCE(approver.designation, '')) LIKE '%department head%'
               OR LOWER(COALESCE(approver.designation, '')) LIKE '%head of department%'
             )
             AND (
               approver.department_id = lr.department_id
               OR COALESCE(approver.managed_department_ids, '[]'::jsonb) @> jsonb_build_array(lr.department_id)
             )
         )
       )
     LIMIT 1;`,
    [id, user.id, String(user.role || '').toUpperCase()]
  );
  return result.rows[0] || null;
};

export const decideLeaveRequestRepository = async ({ id, user, decision, reason }) =>
  withTransaction(async (client) => {
    const requestResult = await client.query(
      `SELECT lr.*, requester.user_id AS requester_user_id
       FROM employee_leave_requests lr
       JOIN employees requester ON requester.id = lr.employee_id
       WHERE lr.id = $1
       FOR UPDATE OF lr;`,
      [id]
    );
    const request = requestResult.rows[0];
    if (!request) return null;
    if (Number(request.user_id) === Number(user.id)) {
      return { forbidden: true };
    }

    const isDepartmentHeadStep = request.status === "PENDING_DEPARTMENT_HEAD";
    if (isDepartmentHeadStep) {
      const authorization = await client.query(
        `SELECT EXISTS (
           SELECT 1
           FROM employees approver
           WHERE approver.user_id = $1
             AND approver.is_deleted = FALSE
             AND UPPER(approver.status) = 'ACTIVE'
             AND (
               UPPER(COALESCE(approver.role, '')) IN ('MANAGER', 'ADMIN')
               OR LOWER(COALESCE(approver.designation, '')) LIKE '%department head%'
               OR LOWER(COALESCE(approver.designation, '')) LIKE '%head of department%'
             )
             AND (
               approver.department_id = $2
               OR COALESCE(approver.managed_department_ids, '[]'::jsonb) @> jsonb_build_array($2::bigint)
             )
         ) AS allowed;`,
        [user.id, request.department_id]
      );
      if (!authorization.rows[0]?.allowed) return { forbidden: true };

      const nextStatus = decision === "APPROVE" ? "PENDING_HR_APPROVAL" : "REJECTED";
      const updateResult = await client.query(
        `UPDATE employee_leave_requests
         SET status = $2,
             department_head_id = $3,
             department_head_reviewed_at = CURRENT_TIMESTAMP,
             rejection_reason = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *;`,
        [id, nextStatus, user.id, decision === "REJECT" ? reason : null]
      );
      return updateResult.rows[0];
    }

    if (request.status !== "PENDING_HR_APPROVAL") return { conflict: true };
    if (!["HR", "SUPER_ADMIN"].includes(String(user.role || "").toUpperCase())) {
      return { forbidden: true };
    }

    const nextStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const updateResult = await client.query(
      `UPDATE employee_leave_requests
       SET status = $2,
           hr_id = $3,
           hr_reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *;`,
      [id, nextStatus, user.id, decision === "REJECT" ? reason : null]
    );

    if (decision === "APPROVE") {
      const datesRes = await client.query(
        `SELECT d::date AS leave_date
         FROM generate_series($1::date, $2::date, '1 day'::interval) d;`,
        [request.start_date, request.end_date]
      );

      for (const row of datesRes.rows) {
        const leaveDate = row.leave_date;

        await client.query(
          `INSERT INTO daily_attendance (
             employee_id,
             date,
             status,
             check_in_location,
             is_office_wifi,
             total_hours
           )
           VALUES ($1, $2, 'ON_LEAVE', 'Approved Leave', FALSE, 0.00)
           ON CONFLICT (employee_id, date)
           DO UPDATE SET
             status = 'ON_LEAVE',
             check_in_location = 'Approved Leave'
           WHERE daily_attendance.check_in_time IS NULL;`,
          [request.employee_id, leaveDate]
        );

        await client.query(
          `INSERT INTO daily_employee_presence_overrides (
             employee_id, presence_date, status, updated_by
           )
           VALUES ($1, $2, 'ON_LEAVE', $3)
           ON CONFLICT (employee_id, presence_date)
           DO UPDATE SET
             status = 'ON_LEAVE',
             updated_by = EXCLUDED.updated_by,
             updated_at = CURRENT_TIMESTAMP;`,
          [request.employee_id, leaveDate, user.id]
        );
      }
    }

    return updateResult.rows[0];
  });

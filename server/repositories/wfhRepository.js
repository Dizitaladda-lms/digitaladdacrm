import pool from "../config/db.js";

const wfhRequestSelect = `
  SELECT
    wfh.id,
    wfh.user_id,
    wfh.employee_id,
    wfh.department_id,
    wfh.start_date,
    wfh.end_date,
    wfh.reason,
    wfh.status,
    wfh.hr_id,
    wfh.hr_reviewed_at,
    wfh.rejection_reason,
    wfh.created_at,
    wfh.updated_at,
    e.full_name AS employee_name,
    e.employee_code,
    e.role AS employee_role,
    e.designation AS employee_designation,
    d.department_name,
    hr_user.full_name AS hr_name
  FROM employee_wfh_requests wfh
  JOIN employees e ON e.id = wfh.employee_id
  LEFT JOIN departments d ON d.id = wfh.department_id
  LEFT JOIN users hr_user ON hr_user.id = wfh.hr_id
`;

export const createWfhRequestRepository = async ({
  userId,
  employeeId,
  departmentId,
  startDate,
  endDate,
  reason,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO employee_wfh_requests (
       user_id,
       employee_id,
       department_id,
       start_date,
       end_date,
       reason,
       status
     )
     VALUES ($1, $2, $3, $4::date, $5::date, $6, 'PENDING_HR')
     RETURNING *;`,
    [userId, employeeId, departmentId || null, startDate, endDate, reason]
  );
  return rows[0];
};

export const getMyWfhRequestsRepository = async (userId) => {
  const { rows } = await pool.query(
    `${wfhRequestSelect}
     WHERE wfh.user_id = $1
     ORDER BY wfh.created_at DESC;`,
    [userId]
  );
  return rows;
};

export const getPendingHRWfhRequestsRepository = async () => {
  const { rows } = await pool.query(
    `${wfhRequestSelect}
     WHERE wfh.status = 'PENDING_HR'
     ORDER BY wfh.created_at ASC;`
  );
  return rows;
};

export const decideWfhRequestRepository = async ({ id, user, decision, reason }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: requestRows } = await client.query(
      `SELECT * FROM employee_wfh_requests WHERE id = $1 FOR UPDATE;`,
      [id]
    );
    const request = requestRows[0];
    if (!request) {
      await client.query("ROLLBACK");
      return null;
    }

    if (request.status !== "PENDING_HR") {
      await client.query("ROLLBACK");
      return { conflict: true };
    }

    const nextStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const { rows: updatedRows } = await client.query(
      `UPDATE employee_wfh_requests
       SET status = $2,
           hr_id = $3,
           hr_reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *;`,
      [id, nextStatus, user.id, decision === "REJECT" ? reason : null]
    );
    const updated = updatedRows[0];

    // If APPROVED, update work mode and attendance for every day in range
    if (decision === "APPROVE") {
      const datesRes = await client.query(
        `SELECT d::date AS work_date
         FROM generate_series($1::date, $2::date, '1 day'::interval) d;`,
        [request.start_date, request.end_date]
      );

      for (const row of datesRes.rows) {
        const targetDate = row.work_date;

        // 1. Set daily work mode to WFH
        await client.query(
          `INSERT INTO daily_employee_work_modes (
             employee_id, work_date, work_mode, updated_by
           )
           VALUES ($1, $2, 'WFH', $3)
           ON CONFLICT (employee_id, work_date)
           DO UPDATE SET
             work_mode = 'WFH',
             updated_by = EXCLUDED.updated_by,
             updated_at = CURRENT_TIMESTAMP;`,
          [request.employee_id, targetDate, user.id]
        );

        // 2. Mark attendance as PRESENT (WFH)
        await client.query(
          `INSERT INTO daily_attendance (
             employee_id,
             date,
             check_in_time,
             status,
             check_in_location,
             is_office_wifi,
             verification_method,
             total_hours
           )
           VALUES (
             $1,
             $2,
             CURRENT_TIMESTAMP,
             'PRESENT',
             'Work From Home (Approved)',
             FALSE,
             'WFH',
             8.00
           )
           ON CONFLICT (employee_id, date)
           DO UPDATE SET
             status = 'PRESENT',
             check_in_location = COALESCE(daily_attendance.check_in_location, 'Work From Home (Approved)'),
             verification_method = COALESCE(daily_attendance.verification_method, 'WFH'),
             total_hours = CASE
               WHEN daily_attendance.total_hours > 0 THEN daily_attendance.total_hours
               ELSE 8.00
             END;`,
          [request.employee_id, targetDate]
        );
      }
    }

    await client.query("COMMIT");
    return updated;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

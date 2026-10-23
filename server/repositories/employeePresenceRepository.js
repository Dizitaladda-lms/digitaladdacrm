import pool from "../config/db.js";

export const getCompanyPresenceRepository = async (targetDate) => {
  const { rows } = await pool.query(
    `SELECT
       e.id AS employee_id,
       e.full_name,
       e.employee_code,
       e.role,
       e.designation,
       e.employment_type,
       d.department_name,
       a.id AS attendance_id,
       a.check_in_time,
       a.check_out_time,
       a.status AS raw_attendance_status,
       COALESCE(e.shift_timing_type, 'DEFAULT') AS shift_timing_type,
       COALESCE(e.shift_start_time, '10:00') AS shift_start_time,
       COALESCE(e.shift_end_time, '18:00') AS shift_end_time,
       presence_override.status AS presence_override,
       CASE
         WHEN presence_override.status = 'ON_LEAVE' THEN 'ON_LEAVE'
         WHEN a.check_in_time IS NOT NULL THEN 'PRESENT'
         WHEN UPPER(COALESCE(a.status, '')) IN ('PRESENT', 'LATE', 'HALF_DAY') THEN 'PRESENT'
         WHEN UPPER(COALESCE(a.status, '')) = 'ON_LEAVE'
           OR e.status = 'ON_LEAVE'
           OR UPPER(COALESCE(roster_day.status, '')) IN ('LEAVE', 'PLANNED_LEAVE')
           THEN 'ON_LEAVE'
         ELSE 'ABSENT'
       END AS attendance_status,
       COALESCE(work_mode.work_mode, 'OFFICE') AS work_mode
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN daily_employee_presence_overrides presence_override
       ON presence_override.employee_id = e.id
      AND presence_override.presence_date = $1::date
     LEFT JOIN daily_attendance a
       ON a.employee_id = e.id AND a.date = $1::date
     LEFT JOIN employee_monthly_rosters roster
       ON roster.employee_id = e.id
      AND roster.year = EXTRACT(YEAR FROM $1::date)::int
      AND roster.month = EXTRACT(MONTH FROM $1::date)::int
       AND roster.status = 'APPROVED'
     LEFT JOIN LATERAL (
       SELECT day_entry->>'status' AS status
       FROM jsonb_array_elements(COALESCE(roster.days_data, '[]'::jsonb)) AS day_entry
       WHERE (day_entry->>'day')::int = EXTRACT(DAY FROM $1::date)::int
       LIMIT 1
     ) roster_day ON TRUE
     LEFT JOIN daily_employee_work_modes work_mode
       ON work_mode.employee_id = e.id AND work_mode.work_date = $1::date
     WHERE e.is_deleted = FALSE
       AND e.status IN ('ACTIVE', 'ON_LEAVE')
       AND UPPER(COALESCE(e.role, '')) <> 'SUPER_ADMIN'
       AND UPPER(COALESCE(e.designation, '')) NOT LIKE '%SUPER ADMIN%'
       AND NOT EXISTS (
         SELECT 1
         FROM users super_admin
         WHERE super_admin.id = e.user_id
           AND UPPER(COALESCE(super_admin.role, '')) = 'SUPER_ADMIN'
       )
     ORDER BY
       CASE
         WHEN UPPER(COALESCE(e.employment_type, '')) = 'INTERN'
           OR UPPER(COALESCE(e.role, '')) = 'INTERN'
           OR LOWER(COALESCE(e.designation, '')) LIKE '%intern%'
           THEN 1
         ELSE 0
       END,
       e.full_name ASC;`,
    [targetDate]
  );

  return rows;
};

export const setEmployeeWorkModeRepository = async (employeeId, workMode, adminUserId) => {
  const { rows } = await pool.query(
    `INSERT INTO daily_employee_work_modes (
       employee_id, work_date, work_mode, updated_by
     )
     SELECT e.id, CURRENT_DATE, $2, $3
     FROM employees e
     WHERE e.id = $1
       AND e.is_deleted = FALSE
       AND e.status IN ('ACTIVE', 'ON_LEAVE')
       AND UPPER(COALESCE(e.role, '')) <> 'SUPER_ADMIN'
       AND UPPER(COALESCE(e.designation, '')) NOT LIKE '%SUPER ADMIN%'
       AND NOT EXISTS (
         SELECT 1
         FROM users super_admin
         WHERE super_admin.id = e.user_id
           AND UPPER(COALESCE(super_admin.role, '')) = 'SUPER_ADMIN'
       )
     ON CONFLICT (employee_id, work_date)
     DO UPDATE SET
       work_mode = EXCLUDED.work_mode,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP
     RETURNING employee_id, work_date, work_mode, updated_at;`,
    [employeeId, workMode, adminUserId]
  );
  return rows[0] || null;
};

export const setEmployeePresenceStatusRepository = async (employeeId, status, adminUserId) => {
  if (status === "ON_LEAVE") {
    const { rows } = await pool.query(
      `INSERT INTO daily_employee_presence_overrides (
         employee_id, presence_date, status, updated_by
       )
       SELECT e.id, CURRENT_DATE, $2, $3
       FROM employees e
       WHERE e.id = $1
         AND e.is_deleted = FALSE
         AND e.status IN ('ACTIVE', 'ON_LEAVE')
         AND UPPER(COALESCE(e.role, '')) <> 'SUPER_ADMIN'
         AND UPPER(COALESCE(e.designation, '')) NOT LIKE '%SUPER ADMIN%'
         AND NOT EXISTS (
           SELECT 1
           FROM users super_admin
           WHERE super_admin.id = e.user_id
             AND UPPER(COALESCE(super_admin.role, '')) = 'SUPER_ADMIN'
         )
       ON CONFLICT (employee_id, presence_date)
       DO UPDATE SET
         status = EXCLUDED.status,
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING employee_id, presence_date, status, updated_at;`,
      [employeeId, status, adminUserId]
    );
    return rows[0] || null;
  }

  const { rows } = await pool.query(
    `WITH eligible_employee AS (
       SELECT e.id
       FROM employees e
       WHERE e.id = $1
         AND e.is_deleted = FALSE
         AND e.status IN ('ACTIVE', 'ON_LEAVE')
         AND UPPER(COALESCE(e.role, '')) <> 'SUPER_ADMIN'
         AND UPPER(COALESCE(e.designation, '')) NOT LIKE '%SUPER ADMIN%'
         AND NOT EXISTS (
           SELECT 1
           FROM users super_admin
           WHERE super_admin.id = e.user_id
             AND UPPER(COALESCE(super_admin.role, '')) = 'SUPER_ADMIN'
         )
     ),
     removed_override AS (
       DELETE FROM daily_employee_presence_overrides override
       USING eligible_employee employee
       WHERE override.employee_id = employee.id
         AND override.presence_date = CURRENT_DATE
       RETURNING override.employee_id
     )
     SELECT employee.id AS employee_id, 'AUTO' AS status
     FROM eligible_employee employee;`,
    [employeeId]
  );
  return rows[0] || null;
};

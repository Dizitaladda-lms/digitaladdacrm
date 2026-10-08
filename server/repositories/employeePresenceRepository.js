import pool from "../config/db.js";

export const getCompanyPresenceRepository = async () => {
  const { rows } = await pool.query(
    `SELECT
       e.id AS employee_id,
       e.full_name,
       e.employee_code,
       e.role,
       e.designation,
       e.employment_type,
       d.department_name,
       CASE
         WHEN a.check_in_time IS NOT NULL THEN 'PRESENT'
         WHEN UPPER(COALESCE(a.status, '')) = 'ON_LEAVE'
           OR e.status = 'ON_LEAVE'
           OR UPPER(COALESCE(roster_day.status, '')) IN ('LEAVE', 'PLANNED_LEAVE')
           THEN 'ON_LEAVE'
         ELSE 'ABSENT'
       END AS attendance_status,
       COALESCE(work_mode.work_mode, 'OFFICE') AS work_mode
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN daily_attendance a
       ON a.employee_id = e.id AND a.date = CURRENT_DATE
     LEFT JOIN employee_monthly_rosters roster
       ON roster.employee_id = e.id
      AND roster.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
      AND roster.month = EXTRACT(MONTH FROM CURRENT_DATE)::int
       AND roster.status = 'APPROVED'
     LEFT JOIN LATERAL (
       SELECT day_entry->>'status' AS status
       FROM jsonb_array_elements(COALESCE(roster.days_data, '[]'::jsonb)) AS day_entry
       WHERE (day_entry->>'day')::int = EXTRACT(DAY FROM CURRENT_DATE)::int
       LIMIT 1
     ) roster_day ON TRUE
     LEFT JOIN daily_employee_work_modes work_mode
       ON work_mode.employee_id = e.id AND work_mode.work_date = CURRENT_DATE
     WHERE e.is_deleted = FALSE
       AND e.status IN ('ACTIVE', 'ON_LEAVE')
     ORDER BY
       CASE
         WHEN UPPER(COALESCE(e.employment_type, '')) = 'INTERN'
           OR UPPER(COALESCE(e.role, '')) = 'INTERN'
           OR LOWER(COALESCE(e.designation, '')) LIKE '%intern%'
           THEN 1
         ELSE 0
       END,
       e.full_name ASC;`
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

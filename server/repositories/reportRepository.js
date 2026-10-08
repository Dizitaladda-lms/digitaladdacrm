import pool, { withTransaction } from "../config/db.js";

/* ==========================================================
   DAILY WORK REPORT REPOSITORY
   Multi-Tier Operations & HR Daily Reporting System
   ========================================================== */

/**
 * Upsert (Create or Update) Daily Work Report
 */
export const upsertDailyReportRepository = async (clientOrPool, data) => {
  const executor = clientOrPool || pool;

  const query = `
    INSERT INTO daily_work_reports (
      user_id,
      employee_id,
      department_id,
      report_date,
      role_type,
      work_title,
      tasks_summary,
      total_hours_worked,
      work_status,
      deliverable_links,
      blockers,
      interns_work_summary,
      next_day_plan,
      took_class,
      status,
      tl_id,
      tl_reviewed_at,
      hr_id,
      hr_reviewed_at,
      super_admin_id,
      super_admin_reviewed_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, report_date)
    DO UPDATE SET
      department_id = COALESCE(EXCLUDED.department_id, daily_work_reports.department_id),
      role_type = EXCLUDED.role_type,
      work_title = EXCLUDED.work_title,
      tasks_summary = EXCLUDED.tasks_summary,
      total_hours_worked = EXCLUDED.total_hours_worked,
      work_status = EXCLUDED.work_status,
      deliverable_links = EXCLUDED.deliverable_links,
      blockers = EXCLUDED.blockers,
      interns_work_summary = EXCLUDED.interns_work_summary,
      next_day_plan = EXCLUDED.next_day_plan,
      took_class = EXCLUDED.took_class,
      status = CASE 
        WHEN daily_work_reports.status IN ('HR_APPROVED', 'SUPER_ADMIN_APPROVED') THEN daily_work_reports.status
        ELSE EXCLUDED.status
      END,
      tl_id = COALESCE(EXCLUDED.tl_id, daily_work_reports.tl_id),
      tl_reviewed_at = COALESCE(EXCLUDED.tl_reviewed_at, daily_work_reports.tl_reviewed_at),
      hr_id = COALESCE(EXCLUDED.hr_id, daily_work_reports.hr_id),
      hr_reviewed_at = COALESCE(EXCLUDED.hr_reviewed_at, daily_work_reports.hr_reviewed_at),
      super_admin_id = COALESCE(EXCLUDED.super_admin_id, daily_work_reports.super_admin_id),
      super_admin_reviewed_at = COALESCE(EXCLUDED.super_admin_reviewed_at, daily_work_reports.super_admin_reviewed_at),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const values = [
    data.user_id,
    data.employee_id || null,
    data.department_id || null,
    data.report_date,
    data.role_type || "EMPLOYEE",
    data.work_title || null,
    data.tasks_summary,
    data.total_hours_worked != null ? Number(data.total_hours_worked) : 0.0,
    data.work_status || "COMPLETED",
    data.deliverable_links || null,
    data.blockers || null,
    data.interns_work_summary || null,
    data.next_day_plan || null,
    Boolean(data.took_class),
    data.status || "SUBMITTED",
    data.tl_id || null,
    data.tl_reviewed_at || null,
    data.hr_id || null,
    data.hr_reviewed_at || null,
    data.super_admin_id || null,
    data.super_admin_reviewed_at || null,
  ];

  const result = await executor.query(query, values);
  return result.rows[0];
};

/**
 * Sync (Replace) Classes for a given Report
 */
export const syncReportClassesRepository = async (clientOrPool, reportId, userId, classesList = []) => {
  const executor = clientOrPool || pool;

  // 1. Remove existing class rows for this report
  await executor.query(`DELETE FROM work_report_classes WHERE report_id = $1;`, [reportId]);

  if (!classesList || classesList.length === 0) {
    return [];
  }

  // 2. Insert each class log
  const insertedClasses = [];
  const insertQuery = `
    INSERT INTO work_report_classes (
      report_id,
      user_id,
      batch_name,
      course_name,
      topic_covered,
      class_time_start,
      class_time_end,
      duration_minutes,
      students_count,
      video_recording_url,
      materials_url,
      remarks
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;

  for (const item of classesList) {
    const values = [
      reportId,
      userId,
      item.batch_name || "General Batch",
      item.course_name || null,
      item.topic_covered,
      item.class_time_start || null,
      item.class_time_end || null,
      Number(item.duration_minutes) || 60,
      Number(item.students_count) || 0,
      item.video_recording_url || null,
      item.materials_url || null,
      item.remarks || null,
    ];
    const res = await executor.query(insertQuery, values);
    insertedClasses.push(res.rows[0]);
  }

  return insertedClasses;
};

/**
 * Get Report by ID with details and classes
 */
export const findReportByIdRepository = async (reportId) => {
  const reportQuery = `
    SELECT 
      r.id,
      r.user_id,
      r.employee_id,
      r.department_id,
      r.report_date,
      r.role_type,
      r.work_title,
      r.tasks_summary,
      r.work_status,
      r.deliverable_links,
      r.blockers,
      r.interns_work_summary,
      r.next_day_plan,
      r.took_class,
      r.status,
      r.tl_id,
      r.tl_reviewed_at,
      r.hr_id,
      r.hr_reviewed_at,
      r.super_admin_id,
      r.super_admin_reviewed_at,
      r.rejection_reason,
      r.created_at,
      r.updated_at,
      ROUND(
        COALESCE(
          CASE 
            WHEN da.check_out_time IS NOT NULL THEN
              COALESCE(NULLIF(da.total_hours, 0.00), (EXTRACT(EPOCH FROM (da.check_out_time - da.check_in_time))/3600.0)::numeric)
            WHEN da.check_in_time IS NOT NULL THEN
              CASE 
                WHEN da.date = CURRENT_DATE THEN
                  GREATEST(0.00, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - da.check_in_time))/3600.0)::numeric)
                ELSE COALESCE(NULLIF(da.total_hours, 0.00), 0.00)
              END
            ELSE NULL
          END,
          r.total_hours_worked,
          0.00
        ),
        2
      ) AS total_hours_worked,
      u.full_name AS user_name,
      u.email AS user_email,
      u.role AS user_role,
      e.employee_code,
      e.designation,
      e.employment_type,
      d.department_name,
      tl_u.full_name AS tl_name,
      hr_u.full_name AS hr_name,
      sa_u.full_name AS super_admin_name
    FROM daily_work_reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN employees e ON (r.employee_id = e.id OR e.user_id = r.user_id)
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users tl_u ON r.tl_id = tl_u.id
    LEFT JOIN users hr_u ON r.hr_id = hr_u.id
    LEFT JOIN users sa_u ON r.super_admin_id = sa_u.id
    LEFT JOIN daily_attendance da ON (da.employee_id = r.employee_id OR da.employee_id = e.id) AND da.date = r.report_date
    WHERE r.id = $1
    LIMIT 1;
  `;

  const reportRes = await pool.query(reportQuery, [reportId]);
  if (reportRes.rows.length === 0) return null;

  const report = reportRes.rows[0];

  // Fetch classes
  const classesRes = await pool.query(
    `SELECT * FROM work_report_classes WHERE report_id = $1 ORDER BY id ASC;`,
    [reportId]
  );
  report.classes = classesRes.rows;

  return report;
};

/**
 * Get My Report for Today (or specific date)
 */
export const findMyReportByDateRepository = async (userId, reportDate) => {
  const query = `
    SELECT 
      r.id,
      r.user_id,
      r.employee_id,
      r.department_id,
      r.report_date,
      r.role_type,
      r.work_title,
      r.tasks_summary,
      r.work_status,
      r.deliverable_links,
      r.blockers,
      r.interns_work_summary,
      r.next_day_plan,
      r.took_class,
      r.status,
      r.tl_id,
      r.tl_reviewed_at,
      r.hr_id,
      r.hr_reviewed_at,
      r.super_admin_id,
      r.super_admin_reviewed_at,
      r.rejection_reason,
      r.created_at,
      r.updated_at,
      ROUND(
        COALESCE(
          CASE 
            WHEN da.check_out_time IS NOT NULL THEN
              COALESCE(NULLIF(da.total_hours, 0.00), (EXTRACT(EPOCH FROM (da.check_out_time - da.check_in_time))/3600.0)::numeric)
            WHEN da.check_in_time IS NOT NULL THEN
              CASE 
                WHEN da.date = CURRENT_DATE THEN
                  GREATEST(0.00, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - da.check_in_time))/3600.0)::numeric)
                ELSE COALESCE(NULLIF(da.total_hours, 0.00), 0.00)
              END
            ELSE NULL
          END,
          r.total_hours_worked,
          0.00
        ),
        2
      ) AS total_hours_worked,
      d.department_name,
      tl_u.full_name AS tl_name,
      hr_u.full_name AS hr_name
    FROM daily_work_reports r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users tl_u ON r.tl_id = tl_u.id
    LEFT JOIN users hr_u ON r.hr_id = hr_u.id
    LEFT JOIN daily_attendance da ON (da.employee_id = r.employee_id OR da.employee_id = (SELECT id FROM employees WHERE user_id = r.user_id LIMIT 1)) AND da.date = r.report_date
    WHERE r.user_id = $1 AND r.report_date = $2
    LIMIT 1;
  `;

  const res = await pool.query(query, [userId, reportDate]);
  if (res.rows.length === 0) return null;

  const report = res.rows[0];
  const classesRes = await pool.query(
    `SELECT * FROM work_report_classes WHERE report_id = $1 ORDER BY id ASC;`,
    [report.id]
  );
  report.classes = classesRes.rows;

  return report;
};

/**
 * Get My Reports History (Paginated)
 */
export const findMyReportsHistoryRepository = async (userId, { page = 1, limit = 15, startDate, endDate, status } = {}) => {
  const offset = (page - 1) * limit;
  const whereClauses = [`r.user_id = $1`];
  const values = [userId];
  let paramIdx = 2;

  if (startDate) {
    whereClauses.push(`r.report_date >= $${paramIdx++}`);
    values.push(startDate);
  }
  if (endDate) {
    whereClauses.push(`r.report_date <= $${paramIdx++}`);
    values.push(endDate);
  }
  if (status) {
    whereClauses.push(`r.status = $${paramIdx++}`);
    values.push(status);
  }

  const whereStr = whereClauses.join(" AND ");

  const countQuery = `SELECT COUNT(*) AS total FROM daily_work_reports r WHERE ${whereStr};`;
  const countRes = await pool.query(countQuery, values);
  const total = parseInt(countRes.rows[0].total, 10);

  const query = `
    SELECT 
      r.id,
      r.user_id,
      r.employee_id,
      r.department_id,
      r.report_date,
      r.role_type,
      r.work_title,
      r.tasks_summary,
      r.work_status,
      r.deliverable_links,
      r.blockers,
      r.interns_work_summary,
      r.next_day_plan,
      r.took_class,
      r.status,
      r.tl_id,
      r.tl_reviewed_at,
      r.hr_id,
      r.hr_reviewed_at,
      r.super_admin_id,
      r.super_admin_reviewed_at,
      r.rejection_reason,
      r.created_at,
      r.updated_at,
      ROUND(
        COALESCE(
          CASE 
            WHEN da.check_out_time IS NOT NULL THEN
              COALESCE(NULLIF(da.total_hours, 0.00), (EXTRACT(EPOCH FROM (da.check_out_time - da.check_in_time))/3600.0)::numeric)
            WHEN da.check_in_time IS NOT NULL THEN
              CASE 
                WHEN da.date = CURRENT_DATE THEN
                  GREATEST(0.00, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - da.check_in_time))/3600.0)::numeric)
                ELSE COALESCE(NULLIF(da.total_hours, 0.00), 0.00)
              END
            ELSE NULL
          END,
          r.total_hours_worked,
          0.00
        ),
        2
      ) AS total_hours_worked,
      d.department_name,
      tl_u.full_name AS tl_name,
      hr_u.full_name AS hr_name,
      (SELECT COUNT(*) FROM work_report_classes c WHERE c.report_id = r.id) AS classes_count,
      (SELECT JSON_AGG(c.*) FROM (
        SELECT id, batch_name, topic_covered, duration_minutes, video_recording_url 
        FROM work_report_classes 
        WHERE report_id = r.id
      ) c) AS classes
    FROM daily_work_reports r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users tl_u ON r.tl_id = tl_u.id
    LEFT JOIN users hr_u ON r.hr_id = hr_u.id
    LEFT JOIN daily_attendance da ON (da.employee_id = r.employee_id OR da.employee_id = (SELECT id FROM employees WHERE user_id = r.user_id LIMIT 1)) AND da.date = r.report_date
    WHERE ${whereStr}
    ORDER BY r.report_date DESC, r.id DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  values.push(limit, offset);

  const result = await pool.query(query, values);

  return {
    reports: result.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * For Team Lead (TL): Get reports of team members
 */
export const findTeamReportsRepository = async ({
  tlUserId,
  tlEmployeeId,
  departmentId,
  allowedDepartmentIds = null,
  date,
  startDate,
  endDate,
  roleType,
  status,
  search,
  isSuperAdminOrHR,
  page = 1,
  limit = 25,
}) => {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const values = [];
  let paramIdx = 1;

  // Department filter (support specific department ID, multiple allowed departments for TL, or all for SuperAdmin/HR)
  if (departmentId && departmentId !== "ALL") {
    if (!isSuperAdminOrHR && tlEmployeeId) {
      whereClauses.push(`(
        r.department_id = $${paramIdx} OR
        e.department_id = $${paramIdx} OR
        e.reporting_manager_id = $${paramIdx + 1}
      )`);
      values.push(departmentId, tlEmployeeId);
      paramIdx += 2;
    } else {
      whereClauses.push(`(r.department_id = $${paramIdx++} OR e.department_id = $${paramIdx - 1})`);
      values.push(departmentId);
    }
  } else if (!isSuperAdminOrHR) {
    if (Array.isArray(allowedDepartmentIds) && allowedDepartmentIds.length > 0) {
      if (tlEmployeeId) {
        whereClauses.push(`(
          r.department_id = ANY($${paramIdx++}::bigint[]) OR 
          e.department_id = ANY($${paramIdx - 1}::bigint[]) OR 
          e.reporting_manager_id = $${paramIdx++}
        )`);
        values.push(allowedDepartmentIds);
        values.push(tlEmployeeId);
      } else {
        whereClauses.push(`(
          r.department_id = ANY($${paramIdx++}::bigint[]) OR 
          e.department_id = ANY($${paramIdx - 1}::bigint[])
        )`);
        values.push(allowedDepartmentIds);
      }
    } else if (tlEmployeeId) {
      // Fallback if no specific allowed departments configured
      whereClauses.push(`(
        e.reporting_manager_id = $${paramIdx++} OR 
        r.department_id = (SELECT department_id FROM employees WHERE id = $${paramIdx - 1}) OR 
        e.department_id = (SELECT department_id FROM employees WHERE id = $${paramIdx - 1})
      )`);
      values.push(tlEmployeeId);
    } else {
      whereClauses.push(`1 = 0`);
    }
  }

  if (date) {
    whereClauses.push(`r.report_date = $${paramIdx++}`);
    values.push(date);
  }
  if (startDate) {
    whereClauses.push(`r.report_date >= $${paramIdx++}`);
    values.push(startDate);
  }
  if (endDate) {
    whereClauses.push(`r.report_date <= $${paramIdx++}`);
    values.push(endDate);
  }
  if (roleType && roleType !== "ALL") {
    whereClauses.push(`r.role_type = $${paramIdx++}`);
    values.push(roleType);
  }
  if (status && status !== "ALL") {
    whereClauses.push(`r.status = $${paramIdx++}`);
    values.push(status);
  }
  if (search && search.trim()) {
    whereClauses.push(`(
      u.full_name ILIKE $${paramIdx} OR
      u.email ILIKE $${paramIdx} OR
      e.employee_code ILIKE $${paramIdx} OR
      e.designation ILIKE $${paramIdx} OR
      r.work_title ILIKE $${paramIdx} OR
      r.tasks_summary ILIKE $${paramIdx}
    )`);
    values.push(`%${search.trim()}%`);
    paramIdx++;
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(*) AS total 
    FROM daily_work_reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN employees e ON r.employee_id = e.id
    ${whereStr};
  `;
  const countRes = await pool.query(countQuery, values);
  const total = parseInt(countRes.rows[0].total, 10);

  const directParamIdx = tlEmployeeId ? paramIdx++ : null;
  if (tlEmployeeId) {
    values.push(tlEmployeeId);
  }

  const query = `
    SELECT 
      r.id,
      r.user_id,
      r.employee_id,
      r.department_id,
      r.report_date,
      r.role_type,
      r.work_title,
      r.tasks_summary,
      r.work_status,
      r.deliverable_links,
      r.blockers,
      r.interns_work_summary,
      r.next_day_plan,
      r.took_class,
      r.status,
      r.tl_id,
      r.tl_reviewed_at,
      r.hr_id,
      r.hr_reviewed_at,
      r.super_admin_id,
      r.super_admin_reviewed_at,
      r.rejection_reason,
      r.created_at,
      r.updated_at,
      ROUND(
        COALESCE(
          CASE 
            WHEN da.check_out_time IS NOT NULL THEN
              COALESCE(NULLIF(da.total_hours, 0.00), (EXTRACT(EPOCH FROM (da.check_out_time - da.check_in_time))/3600.0)::numeric)
            WHEN da.check_in_time IS NOT NULL THEN
              CASE 
                WHEN da.date = CURRENT_DATE THEN
                  GREATEST(0.00, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - da.check_in_time))/3600.0)::numeric)
                ELSE COALESCE(NULLIF(da.total_hours, 0.00), 0.00)
              END
            ELSE NULL
          END,
          r.total_hours_worked,
          0.00
        ),
        2
      ) AS total_hours_worked,
      u.full_name AS user_name,
      u.email AS user_email,
      e.employee_code,
      e.designation,
      e.employment_type,
      e.role AS employee_role,
      e.reporting_manager_id,
      m.full_name AS mentor_name,
      ${directParamIdx ? `(e.reporting_manager_id = $${directParamIdx})` : `false`} AS is_direct_intern,
      COALESCE(d.department_name, 'General') AS department_name,
      tl_u.full_name AS tl_name,
      hr_u.full_name AS hr_name,
      super_u.full_name AS super_admin_name,
      (SELECT JSON_AGG(c.*) FROM (
        SELECT id, batch_name, topic_covered, duration_minutes, video_recording_url 
        FROM work_report_classes 
        WHERE report_id = r.id
      ) c) AS classes
    FROM daily_work_reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN employees e ON r.employee_id = e.id
    LEFT JOIN employees m ON e.reporting_manager_id = m.id
    LEFT JOIN departments d ON COALESCE(r.department_id, e.department_id) = d.id
    LEFT JOIN users tl_u ON r.tl_id = tl_u.id
    LEFT JOIN users hr_u ON r.hr_id = hr_u.id
    LEFT JOIN users super_u ON r.super_admin_id = super_u.id
    LEFT JOIN daily_attendance da ON (da.employee_id = r.employee_id OR da.employee_id = e.id) AND da.date = r.report_date
    ${whereStr}
    ORDER BY 
      CASE WHEN r.status = 'SUBMITTED' THEN 0 
           WHEN r.status = 'TL_REVIEWED' THEN 1 
           WHEN r.status = 'REVISION_REQUESTED' THEN 2 
           ELSE 3 END,
      r.report_date DESC, 
      r.id DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  const salesMetrics = isSuperAdminOrHR
    ? await getSalesTeamMetricsRepository({ date, startDate, endDate })
    : null;

  return {
    reports: result.rows,
    salesMetrics,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get Sales Team Live Analytics & Metrics
 */
export const getSalesTeamMetricsRepository = async ({ date, startDate, endDate }) => {
  const targetStartDate = startDate || date || null;
  const targetEndDate = endDate || date || null;

  const query = `
    SELECT 
      e.id AS employee_id,
      e.full_name AS employee_name,
      e.employee_code,
      e.email,
      e.role,
      e.designation,
      d.department_name,
      COALESCE(da.status, 'NOT_CHECKED_IN') AS today_attendance_status,
      da.check_in_time AS today_check_in_time,
      ROUND(
        COALESCE(
          da.total_hours, 
          CASE WHEN da.check_in_time IS NOT NULL THEN EXTRACT(EPOCH FROM (COALESCE(da.check_out_time, CURRENT_TIMESTAMP) - da.check_in_time))/3600.0 ELSE 0 END
        ), 
        2
      ) AS today_hours,

      (
        SELECT COUNT(*) 
        FROM leads l 
        WHERE (l.assigned_to::text = e.id::text OR l.assigned_to::text = e.user_id::text)
          AND (l.is_agency_lead = FALSE OR l.is_agency_lead IS NULL)
          AND ($1::date IS NULL OR l.created_at::date >= $1::date)
          AND ($2::date IS NULL OR l.created_at::date <= $2::date)
      ) AS assigned_leads_count,

      (
        SELECT COUNT(*) 
        FROM lead_followups f 
        WHERE (f.employee_id::text = e.id::text OR f.employee_id::text = e.user_id::text)
          AND f.is_deleted = FALSE
          AND ($1::date IS NULL OR f.created_at::date >= $1::date)
          AND ($2::date IS NULL OR f.created_at::date <= $2::date)
      ) AS total_calls_count,

      (
        SELECT COUNT(*) 
        FROM lead_followups f 
        WHERE (f.employee_id::text = e.id::text OR f.employee_id::text = e.user_id::text)
          AND f.is_deleted = FALSE
          AND f.status = 'COMPLETED'
          AND ($1::date IS NULL OR f.updated_at::date >= $1::date)
          AND ($2::date IS NULL OR f.updated_at::date <= $2::date)
      ) AS connected_calls_count,

      (
        SELECT COUNT(*) 
        FROM leads l 
        WHERE (l.assigned_to::text = e.id::text OR l.assigned_to::text = e.user_id::text)
          AND UPPER(l.status) IN ('ENROLLED', 'CLOSED', 'ADMISSION', 'ADMITTED', 'CONVERTED')
          AND ($1::date IS NULL OR l.updated_at::date >= $1::date)
          AND ($2::date IS NULL OR l.updated_at::date <= $2::date)
      ) AS admissions_count,

      (
        SELECT COALESCE(SUM(COALESCE(CAST(l.budget AS numeric), 0)), 0)
        FROM leads l 
        WHERE (l.assigned_to::text = e.id::text OR l.assigned_to::text = e.user_id::text)
          AND UPPER(l.status) IN ('ENROLLED', 'CLOSED', 'ADMISSION', 'ADMITTED', 'CONVERTED')
          AND ($1::date IS NULL OR l.updated_at::date >= $1::date)
          AND ($2::date IS NULL OR l.updated_at::date <= $2::date)
      ) AS total_revenue

    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN daily_attendance da ON da.employee_id = e.id AND da.date = CURRENT_DATE
    WHERE e.status = 'ACTIVE' 
      AND e.is_deleted = FALSE
      AND (
        UPPER(COALESCE(e.role, '')) = 'COUNSELLOR'
        OR e.designation ILIKE '%counsellor%'
        OR (
          e.department_id = 1 
          AND UPPER(COALESCE(e.role, '')) NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HEAD', 'HR', 'TRAINER')
          AND UPPER(COALESCE(e.designation, '')) NOT ILIKE '%manager%'
          AND UPPER(COALESCE(e.designation, '')) NOT ILIKE '%head%'
          AND UPPER(COALESCE(e.designation, '')) NOT ILIKE '%admin%'
          AND UPPER(COALESCE(e.designation, '')) NOT ILIKE '%hr%'
          AND UPPER(COALESCE(e.designation, '')) NOT ILIKE '%trainer%'
        )
      )
      AND UPPER(COALESCE(e.role, '')) != 'SUPER_ADMIN'
      AND UPPER(COALESCE(u.role, '')) != 'SUPER_ADMIN'
    ORDER BY admissions_count DESC, total_calls_count DESC, e.full_name ASC;
  `;

  const { rows } = await pool.query(query, [targetStartDate, targetEndDate]);

  let sumLeads = 0;
  let sumCalls = 0;
  let sumConnected = 0;
  let sumAdmissions = 0;
  let sumRevenue = 0;

  const counsellors = rows.map((row) => {
    const leads = Number(row.assigned_leads_count || 0);
    const calls = Number(row.total_calls_count || 0);
    const connected = Number(row.connected_calls_count || 0);
    const admissions = Number(row.admissions_count || 0);
    const revenue = Number(row.total_revenue || 0);

    sumLeads += leads;
    sumCalls += calls;
    sumConnected += connected;
    sumAdmissions += admissions;
    sumRevenue += revenue;

    const conversionRate = leads > 0 ? ((admissions / leads) * 100).toFixed(1) : "0.0";

    return {
      ...row,
      assigned_leads_count: leads,
      total_calls_count: calls,
      connected_calls_count: connected,
      admissions_count: admissions,
      total_revenue: revenue,
      conversion_rate: conversionRate,
    };
  });

  return {
    kpi: {
      totalLeads: sumLeads,
      totalCalls: sumCalls,
      connectedCalls: sumConnected,
      totalAdmissions: sumAdmissions,
      totalRevenue: sumRevenue,
    },
    counsellors,
  };
};

/**
 * Department Head / TL Review Report
 */
export const reviewReportAsTLRepository = async (reportId, tlUserId, feedback, status = "TL_REVIEWED") => {
  const query = `
    UPDATE daily_work_reports
    SET 
      tl_id = $1,
      tl_feedback = $2,
      tl_reviewed_at = CURRENT_TIMESTAMP,
      status = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [tlUserId, feedback, status, reportId]);
  return result.rows[0];
};

/**
 * HR Review / Approve Report
 */
export const reviewReportAsHRRepository = async (reportId, hrUserId, feedback, status = "HR_APPROVED") => {
  const query = `
    UPDATE daily_work_reports
    SET 
      hr_id = $1,
      hr_feedback = $2,
      hr_reviewed_at = CURRENT_TIMESTAMP,
      status = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [hrUserId, feedback, status, reportId]);
  return result.rows[0];
};

/**
 * Super Admin Review / Final Approve Report
 */
export const reviewReportAsSuperAdminRepository = async (reportId, superAdminUserId, feedback, status = "SUPER_ADMIN_APPROVED") => {
  const query = `
    UPDATE daily_work_reports
    SET 
      super_admin_id = $1,
      super_admin_feedback = $2,
      super_admin_reviewed_at = CURRENT_TIMESTAMP,
      status = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [superAdminUserId, feedback, status, reportId]);
  return result.rows[0];
};

/**
 * HR Overview / Compliance Dashboard
 */
export const findHROverviewRepository = async (targetDate) => {
  const dateStr = targetDate || new Date().toISOString().split("T")[0];

  // 1. Total Active Staff
  const totalStaffRes = await pool.query(`
    SELECT COUNT(*) AS total
    FROM employees
    WHERE status = 'ACTIVE' AND is_deleted = FALSE;
  `);
  const totalStaff = parseInt(totalStaffRes.rows[0]?.total || 0, 10);

  // 2. Reports submitted on dateStr
  const submittedRes = await pool.query(`
    SELECT 
      COUNT(*) AS total_submitted,
      COUNT(CASE WHEN took_class = TRUE THEN 1 END) AS total_classes_reports,
      COALESCE(SUM(total_hours_worked), 0) AS total_hours_logged,
      COUNT(CASE WHEN status = 'HR_APPROVED' THEN 1 END) AS approved_count,
      COUNT(CASE WHEN status = 'TL_REVIEWED' THEN 1 END) AS tl_reviewed_count,
      COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END) AS pending_review_count
    FROM daily_work_reports
    WHERE report_date = $1;
  `, [dateStr]);
  const metrics = submittedRes.rows[0];

  // 3. Classes Count & Video Proofs Count
  const classesRes = await pool.query(`
    SELECT 
      COUNT(*) AS total_classes,
      COUNT(CASE WHEN video_recording_url IS NOT NULL AND TRIM(video_recording_url) != '' THEN 1 END) AS video_proofs_count,
      COALESCE(SUM(duration_minutes), 0) AS total_class_minutes
    FROM work_report_classes c
    JOIN daily_work_reports r ON c.report_id = r.id
    WHERE r.report_date = $1;
  `, [dateStr]);
  const classMetrics = classesRes.rows[0];

  // 4. Department Breakdown for target date
  const deptBreakdownRes = await pool.query(`
    SELECT 
      d.id,
      d.department_name,
      COUNT(DISTINCT e.id) AS total_employees,
      COUNT(DISTINCT r.id) AS submitted_count,
      COUNT(DISTINCT CASE WHEN r.took_class = TRUE THEN r.id END) AS classes_taken
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE' AND e.is_deleted = FALSE
    LEFT JOIN daily_work_reports r ON r.department_id = d.id AND r.report_date = $1
    WHERE d.status = TRUE
    GROUP BY d.id, d.department_name
    ORDER BY d.id ASC;
  `, [dateStr]);

  // 5. Employees Pending Submission for target date
  const pendingStaffRes = await pool.query(`
    SELECT 
      e.id,
      e.full_name,
      e.email,
      e.mobile,
      e.designation,
      e.employment_type,
      d.department_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.status = 'ACTIVE' 
      AND e.is_deleted = FALSE
      AND e.user_id NOT IN (
        SELECT user_id FROM daily_work_reports WHERE report_date = $1
      )
    ORDER BY d.department_name ASC, e.full_name ASC
    LIMIT 100;
  `, [dateStr]);

  return {
    date: dateStr,
    totalStaff,
    submittedToday: parseInt(metrics.total_submitted, 10),
    pendingToday: Math.max(0, totalStaff - parseInt(metrics.total_submitted, 10)),
    totalHoursLogged: parseFloat(metrics.total_hours_logged),
    totalClassesToday: parseInt(classMetrics.total_classes, 10),
    totalVideoProofs: parseInt(classMetrics.video_proofs_count, 10),
    totalClassMinutes: parseInt(classMetrics.total_class_minutes, 10),
    approvedCount: parseInt(metrics.approved_count, 10),
    tlReviewedCount: parseInt(metrics.tl_reviewed_count, 10),
    pendingReviewCount: parseInt(metrics.pending_review_count, 10),
    departments: deptBreakdownRes.rows,
    pendingEmployees: pendingStaffRes.rows,
  };
};

/**
 * Company-wide All Reports Filter (HR & Super Admin)
 */
export const findAllCompanyReportsRepository = async ({
  departmentId,
  employeeId,
  date,
  startDate,
  endDate,
  roleType,
  status,
  tookClass,
  search,
  page = 1,
  limit = 20,
}) => {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const values = [];
  let paramIdx = 1;

  if (departmentId) {
    whereClauses.push(`r.department_id = $${paramIdx++}`);
    values.push(departmentId);
  }
  if (employeeId) {
    whereClauses.push(`r.employee_id = $${paramIdx++}`);
    values.push(employeeId);
  }
  if (date) {
    whereClauses.push(`r.report_date = $${paramIdx++}`);
    values.push(date);
  }
  if (startDate) {
    whereClauses.push(`r.report_date >= $${paramIdx++}`);
    values.push(startDate);
  }
  if (endDate) {
    whereClauses.push(`r.report_date <= $${paramIdx++}`);
    values.push(endDate);
  }
  if (roleType) {
    whereClauses.push(`r.role_type = $${paramIdx++}`);
    values.push(roleType);
  }
  if (status) {
    whereClauses.push(`r.status = $${paramIdx++}`);
    values.push(status);
  }
  if (tookClass !== undefined && tookClass !== null && tookClass !== "") {
    whereClauses.push(`r.took_class = $${paramIdx++}`);
    values.push(tookClass === "true" || tookClass === true);
  }
  if (search) {
    whereClauses.push(`(u.full_name ILIKE $${paramIdx} OR e.employee_code ILIKE $${paramIdx} OR r.tasks_summary ILIKE $${paramIdx})`);
    values.push(`%${search}%`);
    paramIdx++;
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(*) AS total 
    FROM daily_work_reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN employees e ON r.employee_id = e.id
    ${whereStr};
  `;
  const countRes = await pool.query(countQuery, values);
  const total = parseInt(countRes.rows[0].total, 10);

  const query = `
    SELECT 
      r.*,
      u.full_name AS user_name,
      u.email AS user_email,
      e.employee_code,
      e.designation,
      e.employment_type,
      d.department_name,
      tl_u.full_name AS tl_name,
      hr_u.full_name AS hr_name,
      (SELECT JSON_AGG(c.*) FROM (
        SELECT id, batch_name, topic_covered, duration_minutes, video_recording_url, students_count 
        FROM work_report_classes 
        WHERE report_id = r.id
      ) c) AS classes
    FROM daily_work_reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN employees e ON r.employee_id = e.id
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users tl_u ON r.tl_id = tl_u.id
    LEFT JOIN users hr_u ON r.hr_id = hr_u.id
    ${whereStr}
    ORDER BY r.report_date DESC, r.id DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  values.push(limit, offset);

  const result = await pool.query(query, values);

  return {
    reports: result.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Classes Video Audit Feed (Super Admin & HR)
 */
export const findClassesAuditRepository = async ({
  departmentId,
  date,
  startDate,
  endDate,
  search,
  page = 1,
  limit = 20,
}) => {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const values = [];
  let paramIdx = 1;

  if (departmentId) {
    whereClauses.push(`r.department_id = $${paramIdx++}`);
    values.push(departmentId);
  }
  if (date) {
    whereClauses.push(`r.report_date = $${paramIdx++}`);
    values.push(date);
  }
  if (startDate) {
    whereClauses.push(`r.report_date >= $${paramIdx++}`);
    values.push(startDate);
  }
  if (endDate) {
    whereClauses.push(`r.report_date <= $${paramIdx++}`);
    values.push(endDate);
  }
  if (search) {
    whereClauses.push(`(c.batch_name ILIKE $${paramIdx} OR c.topic_covered ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx})`);
    values.push(`%${search}%`);
    paramIdx++;
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM work_report_classes c
    JOIN daily_work_reports r ON c.report_id = r.id
    LEFT JOIN users u ON c.user_id = u.id
    ${whereStr};
  `;
  const countRes = await pool.query(countQuery, values);
  const total = parseInt(countRes.rows[0].total, 10);

  const query = `
    SELECT 
      c.*,
      r.report_date,
      r.role_type,
      r.status AS report_status,
      u.full_name AS trainer_name,
      u.email AS trainer_email,
      e.employee_code,
      e.designation,
      d.department_name
    FROM work_report_classes c
    JOIN daily_work_reports r ON c.report_id = r.id
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN employees e ON r.employee_id = e.id
    LEFT JOIN departments d ON r.department_id = d.id
    ${whereStr}
    ORDER BY r.report_date DESC, c.id DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  values.push(limit, offset);

  const result = await pool.query(query, values);

  return {
    classes: result.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

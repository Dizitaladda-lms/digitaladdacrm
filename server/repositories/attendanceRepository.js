import pool from "../config/db.js";

// ==========================================
// Office Wi-Fi Whitelisted IPs
// ==========================================

export const getWhitelistedIPsRepository = async () => {
  const result = await pool.query(
    `SELECT * FROM office_wifi_ips WHERE is_active = TRUE ORDER BY id ASC;`
  );
  return result.rows;
};

export const addWhitelistedIPRepository = async (ip_address, label = "Office Wi-Fi") => {
  const result = await pool.query(
    `
      INSERT INTO office_wifi_ips (ip_address, label, is_active)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (ip_address) DO UPDATE SET is_active = TRUE, label = $2
      RETURNING *;
    `,
    [ip_address.trim(), label.trim()]
  );
  return result.rows[0];
};

export const deleteWhitelistedIPRepository = async (id) => {
  const result = await pool.query(
    `DELETE FROM office_wifi_ips WHERE id = $1 RETURNING *;`,
    [id]
  );
  return result.rows[0];
};

// ==========================================
// Biometric Credentials
// ==========================================

export const findEmployeeBiometricRepository = async (employee_id) => {
  const result = await pool.query(
    `SELECT * FROM employee_biometrics WHERE employee_id = $1 LIMIT 1;`,
    [employee_id]
  );
  return result.rows[0];
};

export const saveEmployeeBiometricRepository = async (client, {
  employee_id,
  credential_id,
  public_key,
  sign_count,
  authenticator_transports,
  device_info,
  face_template,
}) => {
  const dbClient = client || pool;
  const result = await dbClient.query(
    `
      INSERT INTO employee_biometrics (
        employee_id, credential_id, public_key, sign_count, authenticator_transports,
        device_info, face_template_encrypted, face_template_iv, face_template_tag,
        face_consent_at, is_locked, approval_status, approved_by, approved_at, registered_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP,
        TRUE, 'APPROVED', NULL, NULL, CURRENT_TIMESTAMP)
      ON CONFLICT (employee_id) DO UPDATE SET
        credential_id = EXCLUDED.credential_id,
        public_key = EXCLUDED.public_key,
        sign_count = EXCLUDED.sign_count,
        authenticator_transports = EXCLUDED.authenticator_transports,
        device_info = EXCLUDED.device_info,
        face_template_encrypted = EXCLUDED.face_template_encrypted,
        face_template_iv = EXCLUDED.face_template_iv,
        face_template_tag = EXCLUDED.face_template_tag,
        face_consent_at = EXCLUDED.face_consent_at,
        face_image_url = NULL,
        approval_status = 'APPROVED',
        approved_by = NULL,
        approved_at = NULL,
        rejection_reason = NULL,
        is_locked = TRUE,
        registered_at = CURRENT_TIMESTAMP
      WHERE employee_biometrics.approval_status = 'RE_ENROLL_REQUIRED'
        AND COALESCE(employee_biometrics.public_key, '') = ''
      RETURNING *;
    `,
    [
      employee_id,
      credential_id,
      public_key,
      Number(sign_count) || 0,
      authenticator_transports || [],
      device_info || "Platform Passkey",
      face_template?.encrypted || null,
      face_template?.iv || null,
      face_template?.tag || null,
    ]
  );
  return result.rows[0] || null;
};

export const saveEmployeeBiometricChallengeRepository = async (
  employeeId,
  purpose,
  challenge
) => {
  const result = await pool.query(
    `INSERT INTO employee_biometric_challenges (employee_id, purpose, challenge, expires_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '5 minutes')
     ON CONFLICT (employee_id, purpose)
     DO UPDATE SET challenge = EXCLUDED.challenge,
                   expires_at = EXCLUDED.expires_at,
                   created_at = CURRENT_TIMESTAMP
     RETURNING challenge;`,
    [employeeId, purpose, challenge]
  );
  return result.rows[0]?.challenge;
};

export const consumeEmployeeBiometricChallengeRepository = async (employeeId, purpose) => {
  const result = await pool.query(
    `DELETE FROM employee_biometric_challenges
     WHERE employee_id = $1 AND purpose = $2 AND expires_at > CURRENT_TIMESTAMP
     RETURNING challenge;`,
    [employeeId, purpose]
  );
  return result.rows[0]?.challenge || null;
};

export const updateEmployeeBiometricCounterRepository = async ({
  employee_id,
  credential_id,
  previous_count,
  sign_count,
}) => {
  const result = await pool.query(
    `UPDATE employee_biometrics
     SET sign_count = $1
     WHERE employee_id = $2
       AND credential_id = $3
       AND sign_count = $4
       AND approval_status = 'APPROVED'
     RETURNING id;`,
    [Number(sign_count) || 0, employee_id, credential_id, Number(previous_count) || 0]
  );
  return result.rowCount === 1;
};

export const deleteEmployeeBiometricRepository = async (employee_id) => {
  const result = await pool.query(
    `WITH deleted_challenges AS (
      DELETE FROM employee_biometric_challenges
      WHERE employee_id = $1
      RETURNING employee_id
    )
     DELETE FROM employee_biometrics WHERE employee_id = $1 RETURNING *;`,
    [employee_id]
  );
  return result.rows[0];
};

export const getPendingBiometricApprovalsRepository = async () => {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.employee_id,
        b.device_info,
        b.is_locked,
        b.approval_status,
        b.approved_by,
        b.approved_at,
        b.registered_at,
        b.face_image_url,
        b.rejection_reason,
        (COALESCE(b.public_key, '') <> '') AS passkey_ready,
        e.full_name AS employee_name,
        e.employee_code,
        e.designation,
        e.role,
        d.department_name,
        u.email AS employee_email,
        approver.full_name AS approved_by_name
      FROM employee_biometrics b
      JOIN employees e ON b.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users approver ON b.approved_by = approver.id
      ORDER BY 
        CASE WHEN b.approval_status = 'PENDING_APPROVAL' THEN 0 ELSE 1 END,
        b.registered_at DESC;
    `
  );
  return result.rows;
};

export const approveBiometricRepository = async (id, approvedByUserId) => {
  const result = await pool.query(
    `
      UPDATE employee_biometrics
      SET 
        approval_status = 'APPROVED',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = NULL
      WHERE id = $2
      RETURNING *;
    `,
    [approvedByUserId, id]
  );
  return result.rows[0];
};

export const rejectBiometricRepository = async (id, reason) => {
  const result = await pool.query(
    `
      UPDATE employee_biometrics
      SET 
        approval_status = 'REJECTED',
        rejection_reason = $1,
        approved_by = NULL,
        approved_at = NULL
      WHERE id = $2
      RETURNING *;
    `,
    [reason || "Passkey registration rejected by HR. Please re-register.", id]
  );
  return result.rows[0];
};

// ==========================================
// Daily Attendance Tracking
// ==========================================

export const findTodayAttendanceRepository = async (employee_id, dateStr) => {
  const targetDate = dateStr || new Date().toISOString().split("T")[0];
  const result = await pool.query(
    `SELECT 
       a.*,
       ROUND(
         CASE 
           WHEN a.check_out_time IS NOT NULL THEN
             COALESCE(NULLIF(a.total_hours, 0.00), (EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600.0)::numeric)
           WHEN a.check_in_time IS NOT NULL THEN
             GREATEST(0.00, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.check_in_time))/3600.0)::numeric)
           ELSE 0.00
         END,
         2
       ) AS live_hours
     FROM daily_attendance a
     WHERE a.employee_id = $1 AND a.date = $2 
     LIMIT 1;`,
    [employee_id, targetDate]
  );
  return result.rows[0];
};

export const createAttendanceCheckInRepository = async (client, {
  employee_id, date, ip_address, is_office_wifi, status,
  check_in_lat, check_in_lng, check_in_location
}) => {
  const dbClient = client || pool;
  const targetDate = date || new Date().toISOString().split("T")[0];
  const result = await dbClient.query(
    `
      INSERT INTO daily_attendance (
        employee_id, date, check_in_time, ip_address, is_office_wifi, status,
        check_in_lat, check_in_lng, check_in_location
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id, date) 
      DO UPDATE SET 
        check_in_time = COALESCE(daily_attendance.check_in_time, CURRENT_TIMESTAMP),
        ip_address = $3,
        check_in_lat = COALESCE(EXCLUDED.check_in_lat, daily_attendance.check_in_lat),
        check_in_lng = COALESCE(EXCLUDED.check_in_lng, daily_attendance.check_in_lng),
        check_in_location = COALESCE(EXCLUDED.check_in_location, daily_attendance.check_in_location),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `,
    [
      employee_id,
      targetDate,
      ip_address || null,
      is_office_wifi !== false,
      status || "PRESENT",
      check_in_lat || null,
      check_in_lng || null,
      check_in_location || null
    ]
  );
  return result.rows[0];
};

export const updateAttendanceCheckOutRepository = async (client, {
  id, total_hours, check_out_lat, check_out_lng, check_out_location
}) => {
  const dbClient = client || pool;
  const result = await dbClient.query(
    `
      UPDATE daily_attendance
      SET 
        check_out_time = CURRENT_TIMESTAMP,
        total_hours = COALESCE($1, ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in_time))/3600.0, 2)),
        check_out_lat = $2,
        check_out_lng = $3,
        check_out_location = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `,
    [
      total_hours || null,
      check_out_lat || null,
      check_out_lng || null,
      check_out_location || null,
      id
    ]
  );
  return result.rows[0];
};

// ==========================================
// Employee Read-Only Attendance History
// ==========================================

export const getMyAttendanceHistoryRepository = async ({ employee_id, page = 1, limit = 15 }) => {
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM daily_attendance WHERE employee_id = $1;`,
    [employee_id]
  );
  const totalRecords = Number(countResult.rows[0]?.total || 0);

  const result = await pool.query(
    `
      SELECT 
        a.*,
        COALESCE(e.shift_timing_type, 'DEFAULT') AS shift_timing_type,
        COALESCE(e.shift_start_time, '10:00') AS shift_start_time,
        COALESCE(e.shift_end_time, '18:00') AS shift_end_time,
        e.custom_shift_timings,
        ROUND(
          CASE 
            WHEN a.check_out_time IS NOT NULL THEN
              COALESCE(NULLIF(a.total_hours, 0.00), (EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600.0)::numeric)
            WHEN a.check_in_time IS NOT NULL THEN
              CASE 
                WHEN a.date = CURRENT_DATE THEN
                  GREATEST(0.00, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.check_in_time))/3600.0)::numeric)
                ELSE COALESCE(NULLIF(a.total_hours, 0.00), 0.00)
              END
            ELSE 0.00
          END,
          2
        ) AS live_hours
      FROM daily_attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.employee_id = $1
      ORDER BY a.date DESC
      LIMIT $2 OFFSET $3;
    `,
    [employee_id, Number(limit), offset]
  );

  return {
    attendance: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalRecords,
      totalPages: Math.ceil(totalRecords / Number(limit)) || 1,
    }
  };
};

// ==========================================
// HR & Super Admin Reports
// ==========================================

export const getHRAttendanceReportsRepository = async (filters = {}) => {
  const {
    page = 1,
    limit = 15,
    search = "",
    status,
    date_from,
    date_to,
  } = filters;

  const values = [];
  let index = 1;

  const targetDate = date_from || new Date().toISOString().split("T")[0];
  const isSingleDateMode = !date_from || (date_from && date_to && date_from === date_to);

  if (isSingleDateMode) {
    let whereClause = ` WHERE e.status = 'ACTIVE' AND e.is_deleted = FALSE `;

    if (search) {
      whereClause += `
        AND (
          e.full_name ILIKE $${index}
          OR e.employee_code ILIKE $${index}
          OR u.email ILIKE $${index}
        )
      `;
      values.push(`%${search}%`);
      index++;
    }

    values.push(targetDate);
    const dateParamIndex = index;
    index++;

    if (status && String(status).toUpperCase() !== "ALL") {
      const upperStatus = String(status).toUpperCase();
      if (upperStatus === "ABSENT" || upperStatus === "NOT_CHECKED_IN") {
        whereClause += ` AND (a.id IS NULL OR UPPER(a.status) = 'ABSENT') `;
      } else {
        whereClause += ` AND UPPER(a.status) = $${index} `;
        values.push(upperStatus);
        index++;
      }
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN daily_attendance a ON a.employee_id = e.id AND a.date = $${dateParamIndex}::date
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, values);
    const totalRecords = Number(countResult.rows[0]?.total || 0);

    const query = `
      SELECT 
        COALESCE(a.id, 0) AS id,
        e.id AS employee_id,
        $${dateParamIndex}::date AS date,
        a.check_in_time,
        a.check_out_time,
        a.ip_address,
        COALESCE(a.is_office_wifi, false) AS is_office_wifi,
        COALESCE(a.status, 'NOT_CHECKED_IN') AS status,
        a.check_in_lat,
        a.check_in_lng,
        a.check_in_location,
        a.check_out_lat,
        a.check_out_lng,
        a.check_out_location,
        e.full_name AS employee_name,
        e.employee_code,
        e.designation,
        e.role,
        COALESCE(e.shift_timing_type, 'DEFAULT') AS shift_timing_type,
        COALESCE(e.shift_start_time, '10:00') AS shift_start_time,
        COALESCE(e.shift_end_time, '18:00') AS shift_end_time,
        e.custom_shift_timings,
        d.department_name,
        ROUND(
          CASE 
            WHEN a.check_out_time IS NOT NULL THEN
              COALESCE(NULLIF(a.total_hours, 0.00), (EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600.0)::numeric)
            WHEN a.check_in_time IS NOT NULL THEN
              CASE 
                WHEN a.date = CURRENT_DATE THEN
                  GREATEST(0.00, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.check_in_time))/3600.0)::numeric)
                ELSE COALESCE(NULLIF(a.total_hours, 0.00), 0.00)
              END
            ELSE 0.00
          END, 
          2
        ) AS live_hours
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN daily_attendance a ON a.employee_id = e.id AND a.date = $${dateParamIndex}::date
      ${whereClause}
      ORDER BY 
        CASE WHEN a.check_in_time IS NOT NULL THEN 0 ELSE 1 END,
        a.check_in_time DESC,
        e.full_name ASC
      LIMIT $${index} OFFSET $${index + 1};
    `;

    values.push(Number(limit));
    values.push((Number(page) - 1) * Number(limit));

    const result = await pool.query(query, values);

    return {
      attendance: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages: Math.ceil(totalRecords / Number(limit)) || 1,
      }
    };
  } else {
    let whereClause = ` WHERE e.is_deleted = FALSE `;

    if (search) {
      whereClause += `
        AND (
          e.full_name ILIKE $${index}
          OR e.employee_code ILIKE $${index}
          OR u.email ILIKE $${index}
        )
      `;
      values.push(`%${search}%`);
      index++;
    }

    if (status && String(status).toUpperCase() !== "ALL") {
      whereClause += ` AND UPPER(a.status) = $${index} `;
      values.push(String(status).toUpperCase());
      index++;
    }

    if (date_from) {
      whereClause += ` AND a.date >= $${index}::date `;
      values.push(date_from);
      index++;
    }

    if (date_to) {
      whereClause += ` AND a.date <= $${index}::date `;
      values.push(date_to);
      index++;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM daily_attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, values);
    const totalRecords = Number(countResult.rows[0]?.total || 0);

    const query = `
      SELECT 
        a.*,
        e.full_name AS employee_name,
        e.employee_code,
        e.designation,
        e.role,
        COALESCE(e.shift_timing_type, 'DEFAULT') AS shift_timing_type,
        COALESCE(e.shift_start_time, '10:00') AS shift_start_time,
        COALESCE(e.shift_end_time, '18:00') AS shift_end_time,
        e.custom_shift_timings,
        d.department_name,
        ROUND(
          CASE 
            WHEN a.check_out_time IS NOT NULL THEN
              COALESCE(NULLIF(a.total_hours, 0.00), (EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600.0)::numeric)
            WHEN a.check_in_time IS NOT NULL THEN
              CASE 
                WHEN a.date = CURRENT_DATE THEN
                  GREATEST(0.00, (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.check_in_time))/3600.0)::numeric)
                ELSE COALESCE(NULLIF(a.total_hours, 0.00), 0.00)
              END
            ELSE 0.00
          END, 
          2
        ) AS live_hours
      FROM daily_attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY a.date DESC, a.check_in_time DESC
      LIMIT $${index} OFFSET $${index + 1};
    `;

    values.push(Number(limit));
    values.push((Number(page) - 1) * Number(limit));

    const result = await pool.query(query, values);

    return {
      attendance: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages: Math.ceil(totalRecords / Number(limit)) || 1,
      }
    };
  }
};

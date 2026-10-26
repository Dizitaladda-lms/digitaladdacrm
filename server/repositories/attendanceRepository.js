import pool from "../config/db.js";

// ==========================================
// Office Wi-Fi Whitelisted IPs
// ==========================================

export const getAttendanceSettingsRepository = async () => {
  try {
    const result = await pool.query(
      `SELECT key, value FROM attendance_settings;`
    );
    return result.rows || [];
  } catch {
    return [];
  }
};

export const upsertAttendanceSettingRepository = async (key, value, description = null) => {
  const result = await pool.query(
    `INSERT INTO attendance_settings (key, value, description, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value,
                   description = COALESCE(EXCLUDED.description, attendance_settings.description),
                   updated_at = CURRENT_TIMESTAMP
     RETURNING *;`,
    [key, String(value), description]
  );
  return result.rows[0];
};

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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
        CASE WHEN $7::TEXT IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END,
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
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
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
  sign_count,
}) => {
  const result = await pool.query(
    `UPDATE employee_biometrics
     SET sign_count = GREATEST(COALESCE(sign_count, 0), $1)
     WHERE employee_id = $2
       AND credential_id = $3
       AND approval_status = 'APPROVED'
     RETURNING id;`,
    [Number(sign_count) || 0, employee_id, credential_id]
  );
  return result.rowCount >= 1;
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

const getTodayISTDateString = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const findTodayAttendanceRepository = async (employee_id, dateStr) => {
  const targetDate = dateStr || getTodayISTDateString();
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
     WHERE a.employee_id = $1
       AND (
         a.date = $2::date
         OR ($3::boolean = TRUE AND a.date = CURRENT_DATE)
         OR ($3::boolean = TRUE AND a.check_in_time IS NOT NULL AND a.check_out_time IS NULL AND a.date >= ($2::date - INTERVAL '1 day'))
       )
     ORDER BY
       CASE WHEN a.date = $2::date THEN 0 WHEN a.check_out_time IS NULL THEN 1 ELSE 2 END,
       a.date DESC,
       a.id DESC
     LIMIT 1;`,
    [employee_id, targetDate, !dateStr]
  );
  return result.rows[0];
};

export const createAttendanceCheckInRepository = async (client, {
  employee_id, date, ip_address, is_office_wifi, status,
  check_in_lat, check_in_lng, check_in_location, check_in_time,
  check_in_accuracy, check_in_distance, verification_method
}) => {
  const dbClient = client || pool;
  const targetDate = date || getTodayISTDateString();
  try {
    const result = await dbClient.query(
      `
        INSERT INTO daily_attendance (
          employee_id, date, check_in_time, ip_address, is_office_wifi, status,
          check_in_lat, check_in_lng, check_in_location,
          check_in_accuracy, check_in_distance, verification_method
        )
        VALUES ($1, $2::date, COALESCE($9::timestamptz, CURRENT_TIMESTAMP), $3, $4, $5, $6, $7, $8, $10, $11, $12)
        ON CONFLICT (employee_id, date) 
        DO UPDATE SET 
          check_in_time = COALESCE(daily_attendance.check_in_time, EXCLUDED.check_in_time, CURRENT_TIMESTAMP),
          status = CASE
            WHEN daily_attendance.check_in_time IS NULL THEN EXCLUDED.status
            ELSE daily_attendance.status
          END,
          ip_address = COALESCE($3, daily_attendance.ip_address),
          check_in_lat = COALESCE(EXCLUDED.check_in_lat, daily_attendance.check_in_lat),
          check_in_lng = COALESCE(EXCLUDED.check_in_lng, daily_attendance.check_in_lng),
          check_in_location = COALESCE(EXCLUDED.check_in_location, daily_attendance.check_in_location),
          check_in_accuracy = COALESCE(EXCLUDED.check_in_accuracy, daily_attendance.check_in_accuracy),
          check_in_distance = COALESCE(EXCLUDED.check_in_distance, daily_attendance.check_in_distance),
          verification_method = COALESCE(EXCLUDED.verification_method, daily_attendance.verification_method),
          updated_at = CURRENT_TIMESTAMP
        RETURNING
          *,
          ROUND(
            GREATEST(
              0.00,
              ((EXTRACT(EPOCH FROM (COALESCE(check_out_time, CURRENT_TIMESTAMP) - COALESCE(check_in_time, CURRENT_TIMESTAMP))) / 3600.0)::numeric)
            ),
            2
          ) AS live_hours;
      `,
      [
        employee_id,
        targetDate,
        ip_address || null,
        is_office_wifi !== false,
        status || "PRESENT",
        check_in_lat ?? null,
        check_in_lng ?? null,
        check_in_location || null,
        check_in_time || null,
        check_in_accuracy ?? null,
        check_in_distance ?? null,
        verification_method || (is_office_wifi ? "IP" : "GPS")
      ]
    );
    return result.rows[0];
  } catch (err) {
    if (err?.code === "42703") {
      const fallbackResult = await dbClient.query(
        `
          INSERT INTO daily_attendance (
            employee_id, date, check_in_time, ip_address, is_office_wifi, status,
            check_in_lat, check_in_lng, check_in_location
          )
          VALUES ($1, $2::date, COALESCE($9::timestamptz, CURRENT_TIMESTAMP), $3, $4, $5, $6, $7, $8)
          ON CONFLICT (employee_id, date) 
          DO UPDATE SET 
            check_in_time = COALESCE(daily_attendance.check_in_time, EXCLUDED.check_in_time, CURRENT_TIMESTAMP),
            status = CASE
              WHEN daily_attendance.check_in_time IS NULL THEN EXCLUDED.status
              ELSE daily_attendance.status
            END,
            ip_address = COALESCE($3, daily_attendance.ip_address),
            check_in_lat = COALESCE(EXCLUDED.check_in_lat, daily_attendance.check_in_lat),
            check_in_lng = COALESCE(EXCLUDED.check_in_lng, daily_attendance.check_in_lng),
            check_in_location = COALESCE(EXCLUDED.check_in_location, daily_attendance.check_in_location),
            updated_at = CURRENT_TIMESTAMP
          RETURNING
            *,
            ROUND(
              GREATEST(
                0.00,
                ((EXTRACT(EPOCH FROM (COALESCE(check_out_time, CURRENT_TIMESTAMP) - COALESCE(check_in_time, CURRENT_TIMESTAMP))) / 3600.0)::numeric)
              ),
              2
            ) AS live_hours;
        `,
        [
          employee_id,
          targetDate,
          ip_address || null,
          is_office_wifi !== false,
          status || "PRESENT",
          check_in_lat ?? null,
          check_in_lng ?? null,
          check_in_location || null,
          check_in_time || null
        ]
      );
      return fallbackResult.rows[0];
    }
    throw err;
  }
};

export const updateAttendanceCheckOutRepository = async (client, {
  id, total_hours, check_out_lat, check_out_lng, check_out_location, check_out_time,
  check_out_accuracy, check_out_distance, verification_method
}) => {
  const dbClient = client || pool;
  try {
    const result = await dbClient.query(
      `
        UPDATE daily_attendance
        SET 
          check_out_time = COALESCE($6::timestamptz, CURRENT_TIMESTAMP),
          total_hours = COALESCE(
            $1::numeric,
            ROUND(
              GREATEST(
                0.00,
                ((EXTRACT(EPOCH FROM (COALESCE($6::timestamptz, CURRENT_TIMESTAMP) - COALESCE(check_in_time, CURRENT_TIMESTAMP))) / 3600.0)::numeric)
              ),
              2
            )
          ),
          check_out_lat = COALESCE($2, check_out_lat, check_in_lat),
          check_out_lng = COALESCE($3, check_out_lng, check_in_lng),
          check_out_location = COALESCE($4, check_out_location, check_in_location, 'Dizital Adda Office Premises'),
          check_out_accuracy = COALESCE($7, check_out_accuracy),
          check_out_distance = COALESCE($8, check_out_distance),
          verification_method = COALESCE($9, verification_method, daily_attendance.verification_method),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING
          *,
          ROUND(
            GREATEST(
              0.00,
              ((EXTRACT(EPOCH FROM (COALESCE(check_out_time, CURRENT_TIMESTAMP) - COALESCE(check_in_time, CURRENT_TIMESTAMP))) / 3600.0)::numeric)
            ),
            2
          ) AS live_hours;
      `,
      [
        total_hours != null ? Number(total_hours) : null,
        check_out_lat ?? null,
        check_out_lng ?? null,
        check_out_location || null,
        id,
        check_out_time || null,
        check_out_accuracy ?? null,
        check_out_distance ?? null,
        verification_method || null
      ]
    );
    return result.rows[0];
  } catch (err) {
    if (err?.code === "42703") {
      const fallbackResult = await dbClient.query(
        `
          UPDATE daily_attendance
          SET 
            check_out_time = COALESCE($6::timestamptz, CURRENT_TIMESTAMP),
            total_hours = COALESCE(
              $1::numeric,
              ROUND(
                GREATEST(
                  0.00,
                  ((EXTRACT(EPOCH FROM (COALESCE($6::timestamptz, CURRENT_TIMESTAMP) - COALESCE(check_in_time, CURRENT_TIMESTAMP))) / 3600.0)::numeric)
                ),
                2
              )
            ),
            check_out_lat = COALESCE($2, check_out_lat, check_in_lat),
            check_out_lng = COALESCE($3, check_out_lng, check_in_lng),
            check_out_location = COALESCE($4, check_out_location, check_in_location, 'Dizital Adda Office Premises'),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING
            *,
            ROUND(
              GREATEST(
                0.00,
                ((EXTRACT(EPOCH FROM (COALESCE(check_out_time, CURRENT_TIMESTAMP) - COALESCE(check_in_time, CURRENT_TIMESTAMP))) / 3600.0)::numeric)
              ),
              2
            ) AS live_hours;
        `,
        [
          total_hours != null ? Number(total_hours) : null,
          check_out_lat ?? null,
          check_out_lng ?? null,
          check_out_location || null,
          id,
          check_out_time || null
        ]
      );
      return fallbackResult.rows[0];
    }
    throw err;
  }
};

// Close only still-open records for the current IST date. The WHERE condition
// makes this safe if more than one server instance runs the scheduled job.
export const autoCheckOutOpenAttendancesRepository = async ({ date, checkOutTime }) => {
  const result = await pool.query(
    `
      UPDATE daily_attendance
      SET
        check_out_time = $2::timestamptz,
        total_hours = ROUND(
          GREATEST(
            0.00,
            (EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(check_in_time, $2::timestamptz))) / 3600.0)::numeric
          ),
          2
        ),
        check_out_lat = COALESCE(check_out_lat, check_in_lat),
        check_out_lng = COALESCE(check_out_lng, check_in_lng),
        check_out_location = 'System auto-checkout at 7:00 PM (IST)',
        updated_at = CURRENT_TIMESTAMP
      WHERE date = $1::date
        AND check_in_time IS NOT NULL
        AND check_out_time IS NULL
      RETURNING id, employee_id, date, check_in_time, check_out_time, total_hours;
    `,
    [date, checkOutTime]
  );
  return result.rows;
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

  const targetDate = date_from || getTodayISTDateString();
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

export const findEmployeeByIdForAttendanceRepository = async (employeeId) => {
  const result = await pool.query(
    `SELECT * FROM employees WHERE id = $1 AND is_deleted = FALSE LIMIT 1;`,
    [employeeId]
  );
  return result.rows[0] || null;
};

export const upsertEmployeeAttendanceByHRRepository = async ({
  employee_id,
  date,
  check_in_time,
  check_out_time,
  status,
  total_hours,
  ip_address,
  location_label,
}) => {
  const result = await pool.query(
    `
      INSERT INTO daily_attendance (
        employee_id,
        date,
        check_in_time,
        check_out_time,
        total_hours,
        ip_address,
        is_office_wifi,
        status,
        check_in_location,
        check_out_location,
        updated_at
      )
      VALUES (
        $1,
        $2::date,
        $3::timestamptz,
        $4::timestamptz,
        $5,
        $6,
        TRUE,
        $7,
        CASE WHEN $3::timestamptz IS NOT NULL THEN $8 ELSE NULL END,
        CASE WHEN $4::timestamptz IS NOT NULL THEN $8 ELSE NULL END,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (employee_id, date)
      DO UPDATE SET
        check_in_time = $3::timestamptz,
        check_out_time = $4::timestamptz,
        total_hours = $5,
        status = $7,
        check_in_location = CASE
          WHEN $3::timestamptz IS NOT NULL THEN COALESCE(daily_attendance.check_in_location, $8)
          ELSE NULL
        END,
        check_out_location = CASE
          WHEN $4::timestamptz IS NOT NULL THEN COALESCE(daily_attendance.check_out_location, $8)
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `,
    [
      employee_id,
      date,
      check_in_time || null,
      check_out_time || null,
      total_hours ?? 0,
      ip_address || null,
      status || "PRESENT",
      location_label || "Dizital Adda Office Premises",
    ]
  );

  if (status === "ON_LEAVE") {
    await pool.query(
      `INSERT INTO daily_employee_presence_overrides (employee_id, presence_date, status)
       VALUES ($1, $2::date, 'ON_LEAVE')
       ON CONFLICT (employee_id, presence_date)
       DO UPDATE SET status = 'ON_LEAVE', updated_at = CURRENT_TIMESTAMP;`,
      [employee_id, date]
    ).catch(() => {});
  } else {
    await pool.query(
      `DELETE FROM daily_employee_presence_overrides
       WHERE employee_id = $1 AND presence_date = $2::date;`,
      [employee_id, date]
    ).catch(() => {});
  }

  return result.rows[0];
};

export const getEmployeeAttendanceQuotaSummaryRepository = async (employeeId, targetDateStr) => {
  const dateObj = targetDateStr ? new Date(targetDateStr) : new Date();
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1; // 1-12

  const monthPad = String(month).padStart(2, "0");
  const monthStart = `${year}-${monthPad}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${monthPad}-${String(lastDay).padStart(2, "0")}`;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  // 1. Check monthly roster if exists for this employee, year, month
  const rosterResult = await pool.query(
    `SELECT total_week_offs, status
     FROM employee_monthly_rosters
     WHERE employee_id = $1 AND year = $2 AND month = $3
     LIMIT 1;`,
    [employeeId, year, month]
  );

  let allowedWeekOffs = 4; // default monthly week off allocation
  let rosterConfigured = false;
  if (rosterResult.rows.length > 0 && Number(rosterResult.rows[0].total_week_offs) > 0) {
    allowedWeekOffs = Number(rosterResult.rows[0].total_week_offs);
    rosterConfigured = true;
  }

  // 2. Count used week offs in this month
  const usedWeekOffsResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM daily_attendance
     WHERE employee_id = $1
       AND date >= $2::date AND date <= $3::date
       AND UPPER(status) IN ('WEEK_OFF', 'OFF');`,
    [employeeId, monthStart, monthEnd]
  );
  const usedWeekOffs = Number(usedWeekOffsResult.rows[0]?.count || 0);
  const remainingWeekOffs = Math.max(0, allowedWeekOffs - usedWeekOffs);

  // 3. Yearly leaves (standard 12 days per calendar year)
  const allowedYearlyLeaves = 12;
  const usedYearlyLeavesResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM daily_attendance
     WHERE employee_id = $1
       AND date >= $2::date AND date <= $3::date
       AND UPPER(status) IN ('ON_LEAVE', 'LEAVE');`,
    [employeeId, yearStart, yearEnd]
  );
  const usedYearlyLeaves = Number(usedYearlyLeavesResult.rows[0]?.count || 0);
  const remainingYearlyLeaves = Math.max(0, allowedYearlyLeaves - usedYearlyLeaves);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = `${monthNames[month - 1]} ${year}`;

  return {
    employee_id: Number(employeeId),
    date: targetDateStr || `${year}-${monthPad}-${String(dateObj.getDate()).padStart(2, "0")}`,
    year,
    month,
    month_name: monthName,
    monthly_week_offs: {
      allowed: allowedWeekOffs,
      used: usedWeekOffs,
      remaining: remainingWeekOffs,
      is_roster_configured: rosterConfigured,
    },
    yearly_leaves: {
      allowed: allowedYearlyLeaves,
      used: usedYearlyLeaves,
      remaining: remainingYearlyLeaves,
    },
  };
};

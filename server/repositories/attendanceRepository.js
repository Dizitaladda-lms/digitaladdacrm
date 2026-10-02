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

export const saveEmployeeBiometricRepository = async (client, { employee_id, credential_id, public_key, device_info }) => {
  const dbClient = client || pool;
  const result = await dbClient.query(
    `
      INSERT INTO employee_biometrics (employee_id, credential_id, public_key, device_info, is_locked)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *;
    `,
    [employee_id, credential_id, public_key, device_info || "Mobile Biometric Device"]
  );
  return result.rows[0];
};

// ==========================================
// Daily Attendance Tracking
// ==========================================

export const findTodayAttendanceRepository = async (employee_id, dateStr) => {
  const targetDate = dateStr || new Date().toISOString().split("T")[0];
  const result = await pool.query(
    `SELECT * FROM daily_attendance WHERE employee_id = $1 AND date = $2 LIMIT 1;`,
    [employee_id, targetDate]
  );
  return result.rows[0];
};

export const createAttendanceCheckInRepository = async (client, { employee_id, date, ip_address, is_office_wifi, status }) => {
  const dbClient = client || pool;
  const targetDate = date || new Date().toISOString().split("T")[0];
  const result = await dbClient.query(
    `
      INSERT INTO daily_attendance (employee_id, date, check_in_time, ip_address, is_office_wifi, status)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)
      ON CONFLICT (employee_id, date) 
      DO UPDATE SET 
        check_in_time = COALESCE(daily_attendance.check_in_time, CURRENT_TIMESTAMP),
        ip_address = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `,
    [employee_id, targetDate, ip_address || null, is_office_wifi !== false, status || "PRESENT"]
  );
  return result.rows[0];
};

export const updateAttendanceCheckOutRepository = async (client, { id, total_hours }) => {
  const dbClient = client || pool;
  const result = await dbClient.query(
    `
      UPDATE daily_attendance
      SET 
        check_out_time = CURRENT_TIMESTAMP,
        total_hours = COALESCE($1, ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in_time))/3600.0, 2)),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `,
    [total_hours || null, id]
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
        ROUND(
          COALESCE(
            a.total_hours, 
            EXTRACT(EPOCH FROM (COALESCE(a.check_out_time, CURRENT_TIMESTAMP) - a.check_in_time))/3600.0
          ), 
          2
        ) AS live_hours
      FROM daily_attendance a
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

  let whereClause = ` WHERE 1=1 `;

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
      d.department_name,
      ROUND(
        COALESCE(
          a.total_hours, 
          EXTRACT(EPOCH FROM (COALESCE(a.check_out_time, CURRENT_TIMESTAMP) - a.check_in_time))/3600.0
        ), 
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
};

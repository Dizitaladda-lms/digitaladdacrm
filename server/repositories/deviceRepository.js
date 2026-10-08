import pool from "../config/db.js";

export const lockUserDeviceSlots = async (client, userId) => {
  await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE;", [userId]);
};

export const findUserDeviceRepository = async (client, userId, deviceId) => {
  const { rows } = await client.query(
    `SELECT id, user_id, device_id, device_type, device_name, status
     FROM user_devices
     WHERE user_id = $1 AND device_id = $2
     FOR UPDATE;`,
    [userId, deviceId]
  );
  return rows[0] || null;
};

export const findApprovedDeviceSlotRepository = async (client, userId, deviceType) => {
  const { rows } = await client.query(
    `SELECT id, device_id, device_name
     FROM user_devices
     WHERE user_id = $1 AND device_type = $2 AND status = 'approved'
     LIMIT 1
     FOR UPDATE;`,
    [userId, deviceType]
  );
  return rows[0] || null;
};

export const approveUserDeviceRepository = async (client, device) => {
  const { rows } = await client.query(
    `INSERT INTO user_devices (
       user_id, device_id, device_type, device_name, user_agent, ip_address
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, device_id, device_type, device_name, status;`,
    [
      device.userId,
      device.deviceId,
      device.deviceType,
      device.deviceName,
      device.userAgent,
      device.ipAddress,
    ]
  );
  return rows[0];
};

export const touchUserDeviceRepository = async (client, userId, deviceId, device) => {
  await client.query(
    `UPDATE user_devices
     SET last_seen = CURRENT_TIMESTAMP,
         user_agent = $3,
         ip_address = $4
     WHERE user_id = $1 AND device_id = $2 AND status = 'approved';`,
    [userId, deviceId, device.userAgent, device.ipAddress]
  );
};

export const recordBlockedDeviceAttemptRepository = async (device) => {
  await pool.query(
    `INSERT INTO blocked_attempts
       (user_id, device_id, device_type, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5);`,
    [device.userId, device.deviceId, device.deviceType, device.ipAddress, device.userAgent]
  );
};

export const findApprovedUserDeviceRepository = async (userId, deviceId, client = pool) => {
  const { rows } = await client.query(
    `SELECT id, device_type, device_name, status
     FROM user_devices
     WHERE user_id = $1 AND device_id = $2 AND status = 'approved'
     LIMIT 1
     FOR UPDATE;`,
    [userId, deviceId]
  );
  return rows[0] || null;
};

export const updateDeviceLastSeenRepository = async (userId, deviceId, client = pool) => {
  await client.query(
    `UPDATE user_devices SET last_seen = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND device_id = $2 AND status = 'approved'
       AND last_seen < CURRENT_TIMESTAMP - INTERVAL '5 minutes';`,
    [userId, deviceId]
  );
};

export const createBlockedDeviceAttemptRepository = async (client, device) => {
  await client.query(
    `INSERT INTO blocked_attempts
       (user_id, device_id, device_type, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5);`,
    [device.userId, device.deviceId, device.deviceType, device.ipAddress, device.userAgent]
  );
};

export const listEmployeeDevicesRepository = async (employeeId) => {
  const { rows } = await pool.query(
    `SELECT d.id, d.device_id, d.device_type, d.device_name, d.user_agent,
            d.ip_address, d.status, d.first_seen, d.last_seen, d.revoked_at,
            u.id AS user_id, u.full_name
     FROM employees e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN user_devices d ON d.user_id = u.id
     WHERE e.id = $1 AND e.is_deleted = FALSE
     ORDER BY d.device_type, d.first_seen DESC;`,
    [employeeId]
  );
  return rows;
};

export const listEmployeeBlockedAttemptsRepository = async (employeeId) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.device_id, b.device_type, b.ip_address, b.user_agent, b.attempted_at
     FROM employees e
     JOIN blocked_attempts b ON b.user_id = e.user_id
     WHERE e.id = $1 AND e.is_deleted = FALSE
     ORDER BY b.attempted_at DESC
     LIMIT 100;`,
    [employeeId]
  );
  return rows;
};

export const findEmployeeUserIdRepository = async (client, employeeId) => {
  const { rows } = await client.query(
    `SELECT user_id FROM employees
     WHERE id = $1 AND is_deleted = FALSE
     FOR UPDATE;`,
    [employeeId]
  );
  return rows[0]?.user_id || null;
};

export const insertDeviceAdminAuditLogRepository = async (client, audit) => {
  await client.query(
    `INSERT INTO device_admin_audit_logs
       (admin_user_id, employee_user_id, action, device_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6);`,
    [
      audit.adminUserId,
      audit.employeeUserId,
      audit.action,
      audit.deviceId || null,
      JSON.stringify(audit.details || {}),
      audit.ipAddress,
    ]
  );
};

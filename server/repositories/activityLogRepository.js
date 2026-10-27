import pool from "../config/db.js";

/**
 * ============================================================================
 * Activity & Audit Log Repository
 * ============================================================================
 */

export const insertActivityLogRepository = async (clientOrPool = pool, log) => {
  const query = `
    INSERT INTO activity_logs (
      user_id,
      user_name,
      user_email,
      role,
      action,
      module,
      entity_type,
      entity_id,
      entity_name,
      description,
      details,
      ip_address,
      user_agent,
      device_name,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *;
  `;

  const values = [
    log.userId ?? null,
    log.userName ? String(log.userName).slice(0, 150) : null,
    log.userEmail ? String(log.userEmail).slice(0, 255) : null,
    log.role ? String(log.role).slice(0, 50) : null,
    String(log.action || "UNKNOWN").slice(0, 100),
    String(log.module || "SYSTEM").slice(0, 50),
    log.entityType ? String(log.entityType).slice(0, 50) : null,
    log.entityId ? String(log.entityId).slice(0, 100) : null,
    log.entityName ? String(log.entityName).slice(0, 255) : null,
    log.description ? String(log.description).slice(0, 1000) : null,
    log.details ? (typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details)) : "{}",
    log.ipAddress ? String(log.ipAddress).slice(0, 100) : null,
    log.userAgent ? String(log.userAgent).slice(0, 500) : null,
    log.deviceName ? String(log.deviceName).slice(0, 150) : null,
    log.status ? String(log.status).slice(0, 20) : "SUCCESS",
  ];

  const db = clientOrPool || pool;
  const { rows } = await db.query(query, values);
  return rows[0];
};

export const findActivityLogsRepository = async ({
  page = 1,
  limit = 25,
  module = "",
  action = "",
  status = "",
  userId = null,
  search = "",
  startDate = "",
  endDate = "",
} = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const offset = (safePage - 1) * safeLimit;

  const conditions = [];
  const values = [];

  if (module && module.trim() !== "ALL") {
    values.push(module.trim().toUpperCase());
    conditions.push(`module = $${values.length}`);
  }

  if (action && action.trim() !== "ALL") {
    values.push(action.trim().toUpperCase());
    conditions.push(`action = $${values.length}`);
  }

  if (status && status.trim() !== "ALL") {
    values.push(status.trim().toUpperCase());
    conditions.push(`status = $${values.length}`);
  }

  if (userId) {
    values.push(Number(userId));
    conditions.push(`user_id = $${values.length}`);
  }

  if (search && search.trim()) {
    values.push(`%${search.trim()}%`);
    const sIdx = values.length;
    conditions.push(`(
      user_name ILIKE $${sIdx} OR
      user_email ILIKE $${sIdx} OR
      description ILIKE $${sIdx} OR
      entity_name ILIKE $${sIdx} OR
      ip_address ILIKE $${sIdx}
    )`);
  }

  if (startDate) {
    values.push(startDate);
    conditions.push(`created_at >= $${values.length}::timestamp`);
  }

  if (endDate) {
    values.push(`${endDate} 23:59:59.999`);
    conditions.push(`created_at <= $${values.length}::timestamp`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // 1. Total count
  const countQuery = `SELECT COUNT(*) AS total FROM activity_logs ${whereClause};`;
  const countResult = await pool.query(countQuery, values);
  const total = Number(countResult.rows[0]?.total || 0);

  // 2. Paginated rows
  values.push(safeLimit);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const dataQuery = `
    SELECT
      id,
      user_id,
      user_name,
      user_email,
      role,
      action,
      module,
      entity_type,
      entity_id,
      entity_name,
      description,
      details,
      ip_address,
      user_agent,
      device_name,
      status,
      created_at
    FROM activity_logs
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows } = await pool.query(dataQuery, values);

  return {
    logs: rows,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
};

export const getActivityLogStatsRepository = async () => {
  const query = `
    SELECT
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS total_today,
      COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCESS' AND created_at >= CURRENT_DATE) AS logins_today,
      COUNT(*) FILTER (WHERE action = 'LOGIN_FAILED' AND created_at >= CURRENT_DATE) AS failed_logins_today,
      COUNT(*) FILTER (WHERE action NOT IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT') AND created_at >= CURRENT_DATE) AS changes_today,
      COUNT(DISTINCT user_id) FILTER (WHERE created_at >= CURRENT_DATE AND user_id IS NOT NULL) AS active_users_today
    FROM activity_logs;
  `;

  const recentLoginsQuery = `
    SELECT id, user_name, user_email, role, ip_address, device_name, status, created_at, description
    FROM activity_logs
    WHERE action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED')
    ORDER BY created_at DESC
    LIMIT 6;
  `;

  const [statsRes, loginsRes] = await Promise.all([
    pool.query(query),
    pool.query(recentLoginsQuery),
  ]);

  const s = statsRes.rows[0] || {};
  return {
    total_today: Number(s.total_today || 0),
    logins_today: Number(s.logins_today || 0),
    failed_logins_today: Number(s.failed_logins_today || 0),
    changes_today: Number(s.changes_today || 0),
    active_users_today: Number(s.active_users_today || 0),
    recent_logins: loginsRes.rows || [],
  };
};

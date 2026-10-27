import logger from "./logger.js";
import { insertActivityLogRepository } from "../repositories/activityLogRepository.js";

/**
 * =====================================================
 * Enterprise Audit & Activity Logger
 * Logs to winston & persists to PostgreSQL activity_logs
 * =====================================================
 */

const auditLogger = ({
  action,
  userId = null,
  userName = null,
  userEmail = null,
  role = null,
  module = null,
  entityType = null,
  entityId = null,
  entityName = null,
  description = null,
  details = {},
  ip = null,
  userAgent = null,
  deviceName = null,
  status = "SUCCESS",
  requestId = null,
}) => {
  const ts = new Date().toISOString();

  // 1. Winston structured logging (retained for log shipping/monitoring)
  logger.info({
    type: "AUDIT",
    action,
    module,
    entityType,
    entityId,
    entityName,
    userId,
    userName,
    userEmail,
    role,
    ip,
    userAgent,
    deviceName,
    status,
    requestId,
    details,
    timestamp: ts,
  });

  // 2. Asynchronous non-blocking persistence to PostgreSQL activity_logs table
  // Ensures user requests are never blocked or failed by audit logging
  Promise.resolve()
    .then(async () => {
      await insertActivityLogRepository(null, {
        userId,
        userName: userName || details?.user_name || details?.fullName || null,
        userEmail: userEmail || details?.email || null,
        role: role || details?.role || null,
        action: action || "UNKNOWN",
        module: module || "SYSTEM",
        entityType,
        entityId: entityId ? String(entityId) : null,
        entityName,
        description: description || generateDefaultDescription({ action, module, entityName, userName, userEmail }),
        details,
        ipAddress: ip,
        userAgent,
        deviceName,
        status: status || "SUCCESS",
      });
    })
    .catch((err) => {
      // Never throw on audit logging error
      logger.warn("Non-fatal: failed to record audit log to database:", {
        message: err?.message,
        action,
        module,
      });
    });
};

const generateDefaultDescription = ({ action, module, entityName, userName, userEmail }) => {
  const actor = userName || userEmail || "User";
  const target = entityName ? ` "${entityName}"` : "";

  switch (action) {
    case "LOGIN_SUCCESS":
    case "USER_LOGIN":
      return `${actor} successfully logged into the CRM`;
    case "LOGIN_FAILED":
      return `Failed login attempt for ${userEmail || "account"}`;
    case "USER_REGISTERED":
      return `New account registered for ${actor}`;
    case "PASSWORD_CHANGED":
      return `${actor} changed their account password`;
    case "LOGOUT":
      return `${actor} logged out`;
    case "LEAD_CREATED":
      return `${actor} created lead${target}`;
    case "LEAD_UPDATED":
      return `${actor} updated lead${target}`;
    case "LEAD_STATUS_CHANGED":
      return `${actor} changed lead status${target}`;
    case "LEAD_ASSIGNED":
      return `${actor} assigned lead${target}`;
    case "EMPLOYEE_CREATED":
      return `${actor} registered new employee${target}`;
    case "EMPLOYEE_UPDATED":
      return `${actor} updated employee profile${target}`;
    case "DOCUMENT_UPLOADED":
      return `${actor} uploaded document${target}`;
    case "DOCUMENT_DELETED":
      return `${actor} removed document${target}`;
    case "DOCUMENT_VIEWED":
      return `${actor} viewed verified document${target}`;
    case "CHECK_IN":
      return `${actor} marked daily attendance check-in`;
    case "CHECK_OUT":
      return `${actor} marked daily attendance check-out`;
    default:
      return `${actor} performed ${action} in ${module || "CRM"}`;
  }
};

/**
 * Convenience helper to log an activity directly from an Express Request handler
 */
export const logActivity = (
  req,
  {
    action,
    module = "SYSTEM",
    entityType = null,
    entityId = null,
    entityName = null,
    description = null,
    details = {},
    status = "SUCCESS",
  }
) => {
  const user = req?.user || {};
  const ip =
    req?.headers?.["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    null;
  const userAgent = req?.get?.("user-agent") || null;
  const deviceName = req?.get?.("x-device-name") || null;

  auditLogger({
    action,
    module,
    userId: user.id || null,
    userName: user.full_name || user.name || null,
    userEmail: user.email || null,
    role: user.role || null,
    entityType,
    entityId,
    entityName,
    description,
    details,
    ip,
    userAgent,
    deviceName,
    status,
    requestId: req?.id || null,
  });
};

export default auditLogger;

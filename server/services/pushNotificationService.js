import webpush from "web-push";
import pool from "../config/db.js";
import logger from "../utils/logger.js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@dizitaladda.com";

let isVapidConfigured = false;
let vapidConfigurationError = null;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isVapidConfigured = true;
    logger.info("WebPush VAPID configured successfully");
  } catch (err) {
    vapidConfigurationError = err.message;
    logger.error(`Failed to configure WebPush VAPID details: ${err.message}`);
  }
} else {
  vapidConfigurationError = "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must both be configured.";
  logger.error(vapidConfigurationError);
}

/**
 * Returns the public VAPID key for frontend registration
 */
export const getVapidPublicKeyService = () => {
  if (!isVapidConfigured || !vapidPublicKey) {
    throw new Error("WebPush service is not configured on this server.");
  }
  return vapidPublicKey;
};

/**
 * Save or update push subscription for an authenticated user
 */
export const saveSubscriptionService = async (userId, subscriptionData, userAgent = "") => {
  if (!userId) {
    throw new Error("User ID is required to register push subscription.");
  }

  const endpoint = subscriptionData?.endpoint;
  const p256dh = subscriptionData?.keys?.p256dh;
  const auth = subscriptionData?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid push subscription object. Endpoint and keys are required.");
  }

  const query = `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (endpoint)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, user_id, endpoint, created_at, updated_at;
  `;

  const { rows } = await pool.query(query, [userId, endpoint, p256dh, auth, userAgent || null]);
  return rows[0];
};

/**
 * Remove a push subscription by endpoint (e.g. on logout or permission revoke)
 */
export const removeSubscriptionService = async (endpoint) => {
  if (!endpoint) return false;
  const { rowCount } = await pool.query(
    "DELETE FROM push_subscriptions WHERE endpoint = $1",
    [endpoint]
  );
  return rowCount > 0;
};

/**
 * Send push notification to one or multiple users by user_id
 * @param {number|number[]} userIds - Array of user.id
 * @param {object} payload - { title, body, icon, badge, url, tag, data }
 */
export const sendPushToUsersService = async (userIds, payload = {}) => {
  if (!isVapidConfigured) {
    logger.error(`Cannot send push notification: ${vapidConfigurationError || "VAPID is not configured."}`);
    return { configured: false, subscriptions: 0, sent: 0, failed: 0, error: "VAPID_NOT_CONFIGURED" };
  }

  const idList = Array.isArray(userIds) ? userIds.map(Number).filter(Boolean) : [Number(userIds)].filter(Boolean);
  if (idList.length === 0) return { configured: true, subscriptions: 0, sent: 0, failed: 0 };

  try {
    const { rows: subscriptions } = await pool.query(
      `SELECT id, user_id, endpoint, p256dh, auth 
       FROM push_subscriptions 
       WHERE user_id = ANY($1::bigint[])`,
      [idList]
    );

    const notificationPayload = JSON.stringify({
      title: payload.title || "Dizital Adda CRM",
      body: payload.body || "You have a new notification.",
      icon: payload.icon || "/pwa-icon-192.png",
      badge: payload.badge || "/pwa-icon-192.png",
      url: payload.url || "/",
      tag: payload.tag || "crm-general-alert",
      type: payload.type || "GENERAL",
      data: payload.data || {},
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;

    const settled = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload, {
            TTL: 86400, // 24 hours retention on push service
            urgency: payload.urgency || "high",
          });
          sent++;
        } catch (err) {
          failed++;
          const endpointLabel = `${sub.endpoint.slice(0, 96)}${sub.endpoint.length > 96 ? "..." : ""}`;
          logger.warn(
            `Push delivery failed for user ${sub.user_id}, endpoint ${endpointLabel}, status ${err.statusCode || "unknown"}: ${err.message}`
          );

          if (err.statusCode === 404 || err.statusCode === 410) {
            try {
              await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]);
            } catch (cleanupError) {
              logger.error(
                `Failed to remove expired push subscription ${endpointLabel}: ${cleanupError.message}`
              );
            }
          }
        }
      })
    );

    settled.forEach((result) => {
      if (result.status === "rejected") {
        logger.error(`Unexpected push dispatch failure: ${result.reason?.message || result.reason}`);
      }
    });

    return { configured: true, subscriptions: subscriptions.length, sent, failed };
  } catch (error) {
    logger.error(`Error in sendPushToUsersService: ${error.message}`);
    return { configured: true, subscriptions: 0, sent: 0, failed: 1, error: error.message };
  }
};

/**
 * Send push notification to one or multiple employees by employee_id
 * Translates employee_id to user_id
 */
export const sendPushToEmployeesService = async (employeeIds, payload = {}) => {
  const empList = Array.isArray(employeeIds) ? employeeIds.map(Number).filter(Boolean) : [Number(employeeIds)].filter(Boolean);
  if (empList.length === 0) return { sent: 0, failed: 0 };

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT user_id FROM employees WHERE id = ANY($1::bigint[]) AND user_id IS NOT NULL`,
      [empList]
    );

    const userIds = rows.map((r) => r.user_id);
    return await sendPushToUsersService(userIds, payload);
  } catch (err) {
    logger.error(`Error resolving employee user IDs for push: ${err.message}`);
    return { configured: isVapidConfigured, subscriptions: 0, sent: 0, failed: 1, error: err.message };
  }
};

import pool from "../config/db.js";
import logger from "../utils/logger.js";
import { sendPushToUsersService } from "./pushNotificationService.js";

export const notifyUser = async (
  userId,
  { title, body, url, tag, type, actorUserId = null, priority = "HIGH", data = {} } = {}
) => {
  const recipientId = Number(userId);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    throw new Error("A valid notification recipient user ID is required.");
  }

  const notificationType = String(type || "GENERAL").toUpperCase();
  const notificationTitle = String(title || "Dizital Adda CRM notification").slice(0, 255);
  const category = notificationType.startsWith("TASK")
    ? "TASK"
    : notificationType.startsWith("CHAT")
      ? "CHAT"
      : "GENERAL";
  const notificationBody = body || "You have a new notification.";
  const notificationUrl = url || "/";

  const [databaseResult, pushResult] = await Promise.allSettled([
    pool.query(
      `INSERT INTO user_notifications (user_id, actor_user_id, type, category, title, message, link, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id;`,
      [recipientId, actorUserId, notificationType, category, notificationTitle, notificationBody, notificationUrl, priority]
    ),
    sendPushToUsersService(recipientId, {
      title: notificationTitle,
      body: notificationBody,
      url: notificationUrl,
      tag,
      type: notificationType,
      data,
      urgency: "high",
    }),
  ]);

  if (databaseResult.status === "rejected") {
    logger.error(`Failed to save ${notificationType} notification for user ${recipientId}: ${databaseResult.reason?.message || databaseResult.reason}`);
  }
  if (pushResult.status === "rejected") {
    logger.error(`Failed to dispatch ${notificationType} push for user ${recipientId}: ${pushResult.reason?.message || pushResult.reason}`);
  }

  return {
    notificationCreated: databaseResult.status === "fulfilled",
    push: pushResult.status === "fulfilled"
      ? pushResult.value
      : { configured: false, subscriptions: 0, sent: 0, failed: 1, error: "PUSH_DISPATCH_FAILED" },
  };
};

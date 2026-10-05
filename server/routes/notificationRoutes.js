import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getNotificationsController,
  getVapidPublicKeyController,
  subscribePushController,
  unsubscribePushController,
  testPushNotificationController,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getNotificationsController);
router.get("/vapid-public-key", authMiddleware, getVapidPublicKeyController);
router.post("/push-subscribe", authMiddleware, subscribePushController);
router.post("/push-unsubscribe", authMiddleware, unsubscribePushController);
router.post("/push-test", authMiddleware, testPushNotificationController);

export default router;

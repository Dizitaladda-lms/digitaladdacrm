import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getNotificationsController } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getNotificationsController);

export default router;

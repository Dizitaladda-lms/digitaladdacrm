import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  getActivityLogs,
  getActivityLogStats,
} from "../controllers/activityLog.controller.js";

const router = express.Router();

// Only Super Admin, Admin, and HR can monitor system activities & logins
router.use(
  authMiddleware,
  roleMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR)
);

router.get("/", getActivityLogs);
router.get("/stats", getActivityLogStats);

export default router;

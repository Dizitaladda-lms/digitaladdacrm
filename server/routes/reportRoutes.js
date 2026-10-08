import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import reportVisibilityMiddleware from "../middleware/reportVisibilityMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";

import {
  submitDailyReportController,
  getMyReportTodayController,
  getMyReportsHistoryController,
  getReportByIdController,
  getTeamReportsController,
  reviewReportAsTLController,
  getHROverviewController,
  getAllCompanyReportsController,
  reviewReportAsHRController,
  reviewReportAsSuperAdminController,
  getClassesAuditFeedController,
  getReportVisibilityController,
} from "../controllers/reportController.js";

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);
router.use(reportVisibilityMiddleware);
router.get("/visibility", getReportVisibilityController);

/* ── Employee / Trainer / Intern / All Staff Routes ─────── */

// Submit or edit daily work report (with class logs and video links)
router.post("/daily", submitDailyReportController);

// Get current user's report for today or specified date
router.get("/daily/my/today", getMyReportTodayController);

// Get current user's past reports history
router.get("/daily/my", getMyReportsHistoryController);

/* ── Team Lead (TL) Routes ──────────────────────────────── */

// Get department team reports
router.get(
  "/daily/team",
  roleMiddleware("TL", "MANAGER", "ADMIN", "SUPER_ADMIN", "HR"),
  getTeamReportsController
);

// Review / verify a team member's report
router.post(
  "/daily/:id/tl-review",
  roleMiddleware("TL", "MANAGER", "ADMIN", "SUPER_ADMIN", "HR"),
  reviewReportAsTLController
);

/* ── HR & Operations Routes ─────────────────────────────── */

// HR compliance overview, stats, and pending submission list
router.get(
  "/daily/hr/overview",
  roleMiddleware("HR", "SUPER_ADMIN", "ADMIN", "MANAGER"),
  getHROverviewController
);

// Company-wide all reports list with filters
router.get(
  "/daily/hr/all",
  roleMiddleware("HR", "SUPER_ADMIN", "ADMIN", "MANAGER"),
  getAllCompanyReportsController
);

// HR review and approval
router.post(
  "/daily/:id/hr-review",
  roleMiddleware("HR", "SUPER_ADMIN", "ADMIN"),
  reviewReportAsHRController
);

// Super Admin final review and approval
router.post(
  "/daily/:id/super-admin-review",
  roleMiddleware("SUPER_ADMIN"),
  reviewReportAsSuperAdminController
);

/* ── Classes & Video Proof Audit Feed ────────────────────── */

// Dedicated class lecture video audit feed for Super Admin & HR
router.get(
  "/daily/classes-audit",
  roleMiddleware("SUPER_ADMIN", "HR", "ADMIN", "MANAGER"),
  getClassesAuditFeedController
);

/* ── Single Report Details ──────────────────────────────── */
router.get("/daily/:id", getReportByIdController);

export default router;

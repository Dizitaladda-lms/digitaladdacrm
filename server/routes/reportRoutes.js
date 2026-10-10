import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import reportVisibilityMiddleware from "../middleware/reportVisibilityMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  submitDailyReportController,
  getMyReportTodayController,
  getMyReportsHistoryController,
  getPendingForMeReportsController,
  getReportByIdController,
  getTeamReportsController,
  approveReportController,
  rejectReportController,
  editAndResubmitReportController,
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

/* ── Hierarchical Report Approval REST Routes (/api/reports/...) ── */

// 1. Submit report (POST /api/reports)
router.post("/", submitDailyReportController);

// 2. Get my submitted reports (GET /api/reports/my)
router.get("/my", getMyReportsHistoryController);
router.get("/my/today", getMyReportTodayController);

// 3. Get reports pending for my approval (GET /api/reports/pending-for-me)
router.get("/pending-for-me", getPendingForMeReportsController);

// 4. Get subordinates' reports (tree visibility) (GET /api/reports/team)
router.get(
  "/team",
  roleMiddleware("SUB_TL", "TL", "DEPARTMENT_HEAD", "MANAGER", "ADMIN", "SUPER_ADMIN", "HR", "EMPLOYEE"),
  getTeamReportsController
);

/* ── Employee / Trainer / Intern / All Staff Routes (/api/reports/daily/...) ── */

// Submit or edit daily work report (with class logs and video links)
router.post("/daily", submitDailyReportController);

// Get current user's report for today or specified date
router.get("/daily/my/today", getMyReportTodayController);

// Get current user's past reports history
router.get("/daily/my", getMyReportsHistoryController);

// Get reports awaiting current user's approval
router.get("/daily/pending-for-me", getPendingForMeReportsController);

/* ── Team Lead / Sub-TL / Department Head Routes ──────────────── */

// Get department / subordinate team reports
router.get(
  "/daily/team",
  roleMiddleware("SUB_TL", "TL", "DEPARTMENT_HEAD", "MANAGER", "ADMIN", "SUPER_ADMIN", "HR", "EMPLOYEE"),
  getTeamReportsController
);

// Hierarchical approve / reject / resubmit on /daily/:id
router.post("/daily/:id/approve", approveReportController);
router.post("/daily/:id/reject", rejectReportController);
router.put("/daily/:id", editAndResubmitReportController);

// Review / verify a team member's report (legacy endpoint)
router.post(
  "/daily/:id/tl-review",
  roleMiddleware("SUB_TL", "TL", "DEPARTMENT_HEAD", "MANAGER", "ADMIN", "SUPER_ADMIN", "HR", "EMPLOYEE"),
  reviewReportAsTLController
);

/* ── HR & Operations Routes ─────────────────────────────── */

// HR compliance overview, stats, and pending submission list
router.get(
  "/daily/hr/overview",
  roleMiddleware("HR", "SUPER_ADMIN", "ADMIN", "MANAGER", "DEPARTMENT_HEAD"),
  getHROverviewController
);

// Company-wide all reports list with filters
router.get(
  "/daily/hr/all",
  roleMiddleware("HR", "SUPER_ADMIN", "ADMIN", "MANAGER", "DEPARTMENT_HEAD"),
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
  roleMiddleware("SUPER_ADMIN", "HR", "ADMIN", "MANAGER", "DEPARTMENT_HEAD"),
  getClassesAuditFeedController
);

/* ── Single Report & Hierarchical Actions by ID ──────────── */
router.get("/daily/:id", getReportByIdController);

// 5. Approve report (with Skip / Auto-Approval Logic) (POST /api/reports/:id/approve)
router.post("/:id/approve", approveReportController);

// 6. Reject report (with remarks) (POST /api/reports/:id/reject)
router.post("/:id/reject", rejectReportController);

// 7. Edit & resubmit rejected report (PUT /api/reports/:id)
router.put("/:id", editAndResubmitReportController);

// Get single report by ID (GET /api/reports/:id)
router.get("/:id", getReportByIdController);

export default router;

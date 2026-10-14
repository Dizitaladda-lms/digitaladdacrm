import { Router } from "express";

import {
  createFollowup,
  getAllFollowups,
  getFollowupById,
  updateFollowup,
  completeFollowup,
  rescheduleFollowup,
  deleteFollowup,
  restoreFollowup,
  getFollowupStatistics,
  getLeadTimeline,
  bulkCompleteFollowups,
  bulkDeleteFollowups,
  bulkRestoreFollowups,
  bulkAssignFollowups,
} from "../controllers/followupController.js";

import authMiddleware from "../middleware/authMiddleware.js";

import roleMiddleware from "../middleware/roleMiddleware.js";

/**
 * =====================================================
 * BUG FIX (see audit notes):
 * All "/bulk/*" routes (and "DELETE /bulk") were
 * previously registered AFTER their singular "/:id/..."
 * counterparts. Express matches by registration order,
 * and ":id" happily binds to the literal string "bulk" -
 * so PATCH /bulk/complete matched "/:id/complete" first
 * (id="bulk"), and same for /bulk/restore and DELETE
 * /bulk. Three of the four bulk operations were
 * effectively dead code in production. Fixed by moving
 * every "/bulk/*" route above any "/:id" route, matching
 * the "static routes before /:id" pattern already used
 * correctly for "/statistics" and "/timeline/:leadId" in
 * this same file - that pattern just needed to be
 * extended to cover two-segment paths too, not only
 * single-segment ones.
 * =====================================================
 */

const router = Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "COUNSELLOR", "SALES_HEAD", "MANAGER"),
  createFollowup
);

router.get(
  "/",
  authMiddleware,
  getAllFollowups
);

router.get(
  "/statistics",
  authMiddleware,
  getFollowupStatistics
);

router.get(
  "/timeline/:leadId",
  authMiddleware,
  getLeadTimeline
);

/**
 * -----------------------------------------------------
 * Bulk routes - must stay above any "/:id" route below.
 * -----------------------------------------------------
 */

router.patch(
  "/bulk/complete",
  authMiddleware,
  roleMiddleware("ADMIN", "COUNSELLOR", "SALES_HEAD", "MANAGER"),
  bulkCompleteFollowups
);

router.patch(
  "/bulk/restore",
  authMiddleware,
  roleMiddleware("ADMIN", "SALES_HEAD", "MANAGER"),
  bulkRestoreFollowups
);

router.patch(
  "/bulk/assign",
  authMiddleware,
  roleMiddleware("ADMIN", "SALES_HEAD", "MANAGER"),
  bulkAssignFollowups
);

router.delete(
  "/bulk",
  authMiddleware,
  roleMiddleware("ADMIN", "SALES_HEAD", "MANAGER"),
  bulkDeleteFollowups
);

/**
 * -----------------------------------------------------
 * Single-followup, ID-based routes.
 * -----------------------------------------------------
 */

router.get(
  "/:id",
  authMiddleware,
  getFollowupById
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "COUNSELLOR", "SALES_HEAD", "MANAGER"),
  updateFollowup
);

router.patch(
  "/:id/complete",
  authMiddleware,
  roleMiddleware("ADMIN", "COUNSELLOR", "SALES_HEAD", "MANAGER"),
  completeFollowup
);

router.patch(
  "/:id/reschedule",
  authMiddleware,
  roleMiddleware("ADMIN", "COUNSELLOR", "SALES_HEAD", "MANAGER"),
  rescheduleFollowup
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SALES_HEAD", "MANAGER"),
  deleteFollowup
);

router.patch(
  "/:id/restore",
  authMiddleware,
  roleMiddleware("ADMIN", "SALES_HEAD", "MANAGER"),
  restoreFollowup
);

export default router;
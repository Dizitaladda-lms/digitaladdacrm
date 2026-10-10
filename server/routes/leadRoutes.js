import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";
import ApiError from "../utils/ApiError.js";

import ROLES from "../constants/roles.js";

import {
  createLeadValidator,
  updateLeadValidator,
  assignLeadValidator,
  assignBulkLeadValidator,
  deleteBulkLeadValidator,
  updateLeadStatusValidator,
  addLeadNoteValidator,
} from "../validators/lead.validator.js";

import {
  createLead,
  getAllLeads,
  getReadOnlyLeadOverview,
  getAgencyLeads,
  getLeadById,
  updateLead,
  deleteLead,
  deleteBulkLeads,
  restoreLead,
  getLeadStatistics,
  assignLead,
  assignBulkLeads,
  updateLeadStatus,
  addLeadNote,
  getLeadNotes,
  getLeadTimeline,
  importLeads,
} from "../controllers/leadController.js";

import {
  addLeadFeedback,
  getLeadFeedbackHistory,
} from "../controllers/leadFeedback.controller.js";
import { handleBulkWhatsAppBroadcast } from "../controllers/whatsappController.js";
import { handleBulkBroadcast } from "../controllers/communicationController.js";

const router = express.Router();

router.use(authMiddleware);
router.use((req, _res, next) => {
  if (
    req.user?.lead_overview_read_only &&
    !(req.method === "GET" && req.path === "/overview")
  ) {
    return next(new ApiError(403, "Read-only lead overview access does not allow this action."));
  }
  return next();
});

router.post(
  "/bulk-whatsapp",
  roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR),
  handleBulkWhatsAppBroadcast
);

router.post(
  "/bulk-broadcast",
  roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR),
  handleBulkBroadcast
);

/**
 * =====================================================
 * Lead CRUD
 * =====================================================
 */

router.post(
  "/",
  roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR),
  createLeadValidator,
  validate,
  createLead
);

router.get(
  "/",
  getAllLeads
);

router.get("/overview", getReadOnlyLeadOverview);

/**
 * Statistics
 * IMPORTANT:
 * Static routes must come before /:id
 */

router.get(
  "/agency-leads",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getAgencyLeads
);

router.get(
  "/statistics",
  getLeadStatistics
);

router.post(
  "/bulk-delete",
  roleMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR),
  deleteBulkLeadValidator,
  validate,
  deleteBulkLeads
);

router.post(
  "/import",
  roleMiddleware(ROLES.ADMIN),
  importLeads
);

router.get(
  "/:id",
  getLeadById
);

router.put(
  "/:id",
  roleMiddleware(ROLES.ADMIN),
  updateLeadValidator,
  validate,
  updateLead
);

router.delete(
  "/:id",
  roleMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR),
  deleteLead
);

router.patch(
  "/:id/restore",
  roleMiddleware(ROLES.ADMIN),
  restoreLead
);

/**
 * =====================================================
 * Lead Assignment
 * =====================================================
 */

router.patch(
  "/:id/assign",
  roleMiddleware(ROLES.ADMIN, ROLES.SALES_HEAD),
  assignLeadValidator,
  validate,
  assignLead
);

router.post(
  "/assign-bulk",
  roleMiddleware(ROLES.ADMIN, ROLES.SALES_HEAD),
  assignBulkLeadValidator,
  validate,
  assignBulkLeads
);

/**
 * =====================================================
 * Lead Status
 * =====================================================
 */

router.patch(
  "/:id/status",
  updateLeadStatusValidator,
  validate,
  updateLeadStatus
);

/**
 * =====================================================
 * Lead Notes
 * =====================================================
 */

router.post(
  "/:id/notes",
  addLeadNoteValidator,
  validate,
  addLeadNote
);

router.get(
  "/:id/notes",
  getLeadNotes
);

/**
 * =====================================================
 * Lead Timeline
 * =====================================================
 */

router.get(
  "/:id/timeline",
  getLeadTimeline
);

/**
 * =====================================================
 * Lead Feedback
 * =====================================================
 */

router.post(
  "/:id/feedback",
  addLeadFeedback
);

router.get(
  "/:id/feedback",
  getLeadFeedbackHistory
);

export default router;

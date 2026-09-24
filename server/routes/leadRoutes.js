import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import validate from "../middleware/validate.js";

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

const router = express.Router();

/**
 * =====================================================
 * Lead CRUD
 * =====================================================
 */

router.post(
  "/",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  createLeadValidator,
  validate,
  createLead
);

router.get(
  "/",
  authMiddleware,
  getAllLeads
);

/**
 * Statistics
 * IMPORTANT:
 * Static routes must come before /:id
 */

router.get(
  "/statistics",
  authMiddleware,
  getLeadStatistics
);

router.post(
  "/bulk-delete",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  deleteBulkLeadValidator,
  validate,
  deleteBulkLeads
);

router.post(
  "/import",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  importLeads
);

router.get(
  "/:id",
  authMiddleware,
  getLeadById
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  updateLeadValidator,
  validate,
  updateLead
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  deleteLead
);

router.patch(
  "/:id/restore",
  authMiddleware,
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
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  assignLeadValidator,
  validate,
  assignLead
);

router.post(
  "/assign-bulk",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
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
  authMiddleware,
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
  authMiddleware,
  addLeadNoteValidator,
  validate,
  addLeadNote
);

router.get(
  "/:id/notes",
  authMiddleware,
  getLeadNotes
);

/**
 * =====================================================
 * Lead Timeline
 * =====================================================
 */

router.get(
  "/:id/timeline",
  authMiddleware,
  getLeadTimeline
);

/**
 * =====================================================
 * Lead Feedback
 * =====================================================
 */

router.post(
  "/:id/feedback",
  authMiddleware,
  addLeadFeedback
);

router.get(
  "/:id/feedback",
  authMiddleware,
  getLeadFeedbackHistory
);

export default router;
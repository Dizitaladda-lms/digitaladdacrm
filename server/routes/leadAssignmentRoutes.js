import express from "express";
import {
  assignLead,
  reassignLead,
  getLeadAssignmentHistory,
} from "../controllers/leadAssignmentController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.put(
  "/:leadId/assign",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN, ROLES.SALES_HEAD),
  assignLead
);

router.put(
  "/:leadId/reassign",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN, ROLES.SALES_HEAD),
  reassignLead
);

router.get(
  "/:leadId/history",
  authMiddleware,
  getLeadAssignmentHistory
);

export default router;
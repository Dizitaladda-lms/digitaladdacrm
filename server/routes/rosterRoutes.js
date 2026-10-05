import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  getMyMonthlyRoster,
  saveMyMonthlyRoster,
  requestRosterChange,
  getHREmployeesRoster,
  reviewRoster,
  updateRosterByHR,
} from "../controllers/rosterController.js";

const router = express.Router();

router.use(authMiddleware);

// Employee Personal Roster
router.get("/my-roster", getMyMonthlyRoster);
router.post("/my-roster", saveMyMonthlyRoster);
router.post("/my-roster/request-change", requestRosterChange);

// HR / Super Admin Management
router.get(
  "/company",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getHREmployeesRoster
);

router.put(
  "/:id/review",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  reviewRoster
);

router.put(
  "/:id/edit",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  updateRosterByHR
);

export default router;

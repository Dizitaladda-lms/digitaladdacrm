import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  getAdmissions,
  createAdmission,
  collectFee,
  getAdmissionById,
} from "../controllers/admissionController.js";

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR), getAdmissions);
router.post("/", authMiddleware, roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR), createAdmission);
router.get("/:id", authMiddleware, roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR), getAdmissionById);
router.patch("/:id/fee", authMiddleware, roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR), collectFee);

export default router;

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getAdmissions,
  createAdmission,
  collectFee,
  getAdmissionById,
} from "../controllers/admissionController.js";

const router = express.Router();

router.get("/", authMiddleware, getAdmissions);
router.post("/", authMiddleware, createAdmission);
router.get("/:id", authMiddleware, getAdmissionById);
router.patch("/:id/fee", authMiddleware, collectFee);

export default router;

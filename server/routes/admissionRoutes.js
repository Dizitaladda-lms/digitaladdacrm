import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  getAdmissions,
  createAdmission,
  collectFee,
  getAdmissionById,
  getAdmissionByLead,
  getPaymentReceipt,
} from "../controllers/admissionController.js";

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.COUNSELLOR, ROLES.SALES_HEAD), getAdmissions);
router.post("/", authMiddleware, roleMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELLOR, ROLES.SALES_HEAD), createAdmission);
router.get("/receipt/:paymentId", authMiddleware, roleMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.COUNSELLOR, ROLES.SALES_HEAD), getPaymentReceipt);
router.get("/lead/:leadId", authMiddleware, roleMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.COUNSELLOR, ROLES.SALES_HEAD), getAdmissionByLead);
router.get("/:id", authMiddleware, roleMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.COUNSELLOR, ROLES.SALES_HEAD), getAdmissionById);
router.patch("/:id/fee", authMiddleware, roleMiddleware(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELLOR, ROLES.SALES_HEAD), collectFee);

export default router;

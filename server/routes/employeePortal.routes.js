import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";

import { getEmployeeDashboard } from "../controllers/employeePortal.controller.js";
import {
  getMyLeadsController,
  getMyPerformanceController,
} from "../controllers/employeeController.js";
import {
  deleteMyEmployeeDocument,
  getMyEmployeeDocumentAccessUrl,
  getMyEmployeeDocuments,
  uploadMyEmployeeDocument,
} from "../controllers/employeeDocument.controller.js";
import { uploadEmployeeDocument } from "../middleware/employeeDocumentUpload.js";

const router = express.Router();

// Employees can only manage documents linked to their own employee profile.
router.get("/documents", authMiddleware, getMyEmployeeDocuments);
router.post("/documents", authMiddleware, uploadEmployeeDocument, uploadMyEmployeeDocument);
router.get("/documents/:id/access", authMiddleware, getMyEmployeeDocumentAccessUrl);
router.delete("/documents/:id", authMiddleware, deleteMyEmployeeDocument);

router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware(
    ROLES.ADMIN,
    ROLES.COUNSELLOR,
    ROLES.SALES_HEAD,
    ROLES.TL,
    ROLES.SUB_TL,
    ROLES.DEPARTMENT_HEAD,
    ROLES.MANAGER,
    ROLES.EMPLOYEE,
    ROLES.TRAINER,
    ROLES.INTERN,
    ROLES.HR,
    ROLES.SUPER_ADMIN
  ),
  getEmployeeDashboard
);

router.get(
  "/my-leads",
  authMiddleware,
  roleMiddleware(
    ROLES.ADMIN,
    ROLES.COUNSELLOR,
    ROLES.SALES_HEAD,
    ROLES.TL,
    ROLES.SUB_TL,
    ROLES.DEPARTMENT_HEAD,
    ROLES.MANAGER,
    ROLES.EMPLOYEE,
    ROLES.TRAINER,
    ROLES.INTERN,
    ROLES.HR,
    ROLES.SUPER_ADMIN
  ),
  getMyLeadsController
);

router.get(
  "/my-performance",
  authMiddleware,
  roleMiddleware(
    ROLES.ADMIN,
    ROLES.COUNSELLOR,
    ROLES.SALES_HEAD,
    ROLES.TL,
    ROLES.SUB_TL,
    ROLES.DEPARTMENT_HEAD,
    ROLES.MANAGER,
    ROLES.EMPLOYEE,
    ROLES.TRAINER,
    ROLES.INTERN,
    ROLES.HR,
    ROLES.SUPER_ADMIN
  ),
  getMyPerformanceController
);

export default router;

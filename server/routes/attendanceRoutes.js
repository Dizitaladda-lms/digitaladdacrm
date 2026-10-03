import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  getMyBiometricStatus,
  registerBiometric,
  resetEmployeeBiometric,
  checkInAttendance,
  checkOutAttendance,
  getMyAttendanceHistory,
  getHRAttendanceReports,
  getOfficeIPs,
  addOfficeIP,
  deleteOfficeIP,
} from "../controllers/attendanceController.js";

const router = express.Router();

router.use(authMiddleware);

// Employee Attendance & Mobile Biometrics
router.get("/status", getMyBiometricStatus);
router.post("/biometric/register", registerBiometric);
router.delete("/biometric/reset/:employeeId?", resetEmployeeBiometric);
router.post("/check-in", checkInAttendance);
router.post("/check-out", checkOutAttendance);
router.get("/my-history", getMyAttendanceHistory);

// HR & Super Admin Reports
router.get(
  "/hr-reports",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getHRAttendanceReports
);

// Office Wi-Fi Whitelist Management (HR & Super Admin)
router.get(
  "/office-ips",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getOfficeIPs
);
router.post(
  "/office-ips",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  addOfficeIP
);
router.delete(
  "/office-ips/:id",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  deleteOfficeIP
);

export default router;

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  getMyBiometricStatus,
  getBiometricRegistrationOptions,
  getBiometricAuthenticationOptions,
  getBiometricFaceChallenge,
  registerBiometric,
  resetEmployeeBiometric,
  getPendingBiometricApprovals,
  approveBiometric,
  rejectBiometric,
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
router.post("/biometric/registration-options", getBiometricRegistrationOptions);
router.post("/biometric/authentication-options", getBiometricAuthenticationOptions);
router.post("/biometric/face-challenge", getBiometricFaceChallenge);
router.post("/biometric/register", registerBiometric);
router.delete("/biometric/reset", resetEmployeeBiometric);
router.delete("/biometric/reset/:employeeId", resetEmployeeBiometric);

// HR & Super Admin Face Biometric Approvals
router.get(
  "/biometric/pending-approvals",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getPendingBiometricApprovals
);
router.post(
  "/biometric/approve/:id",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  approveBiometric
);
router.post(
  "/biometric/reject/:id",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  rejectBiometric
);

router.post("/check-in", checkInAttendance);
router.post("/check-out", checkOutAttendance);
router.get("/my-history", getMyAttendanceHistory);

// HR & Super Admin Attendance Reports
router.get(
  "/hr-reports",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getHRAttendanceReports
);

// Office Wi-Fi Whitelist Management (Super Admin)
router.get(
  "/office-ips",
  roleMiddleware(ROLES.SUPER_ADMIN),
  getOfficeIPs
);
router.post(
  "/office-ips",
  roleMiddleware(ROLES.SUPER_ADMIN),
  addOfficeIP
);
router.delete(
  "/office-ips/:id",
  roleMiddleware(ROLES.SUPER_ADMIN),
  deleteOfficeIP
);

export default router;

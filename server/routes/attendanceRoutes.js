import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  createWfhRequest,
  getMyWfhRequests,
  getPendingWfhApprovals,
  decideWfhRequest,
} from "../controllers/wfhController.js";
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
  syncOfflineAttendance,
  getMyAttendanceHistory,
  getHRAttendanceReports,
  getCompanyPresence,
  setEmployeePresenceStatus,
  setEmployeeWorkMode,
  getOfficeIPs,
  addOfficeIP,
  deleteOfficeIP,
  upsertEmployeeAttendanceByHR,
  getAttendanceSettings,
  updateAttendanceSettings,
  getEmployeeAttendanceQuotaSummary,
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
router.post("/offline-sync", syncOfflineAttendance);
router.get("/my-history", getMyAttendanceHistory);
router.get("/company-presence", getCompanyPresence);
router.patch(
  "/company-presence/:employeeId/work-mode",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  setEmployeeWorkMode
);
router.patch(
  "/company-presence/:employeeId/status",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  setEmployeePresenceStatus
);

// HR & Super Admin Attendance Reports & Manual Mark / Time Edit
router.get(
  "/hr-reports",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getHRAttendanceReports
);
router.post(
  "/hr-manage",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  upsertEmployeeAttendanceByHR
);
router.put(
  "/hr-manage/:employeeId",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  upsertEmployeeAttendanceByHR
);
router.get(
  "/employee-quota/:employeeId",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getEmployeeAttendanceQuotaSummary
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

// WFH (Work From Home) Requests
router.post("/wfh-requests", createWfhRequest);
router.get("/wfh-requests/my", getMyWfhRequests);
router.get(
  "/wfh-requests/pending",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN),
  getPendingWfhApprovals
);
router.patch(
  "/wfh-requests/:id/decision",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  decideWfhRequest
);

// Office Settings (Coordinates, Radius & IPs)
router.get("/settings", getAttendanceSettings);
router.put(
  "/settings",
  roleMiddleware(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  updateAttendanceSettings
);

export default router;

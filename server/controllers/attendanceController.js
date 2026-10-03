import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  getMyBiometricStatusService,
  registerBiometricService,
  resetEmployeeBiometricService,
  getPendingBiometricApprovalsService,
  approveBiometricService,
  rejectBiometricService,
  checkInAttendanceService,
  checkOutAttendanceService,
  getMyAttendanceHistoryService,
  getHRAttendanceReportsService,
  getOfficeIPsService,
  addOfficeIPService,
  deleteOfficeIPService,
} from "../services/attendanceService.js";

export const getMyBiometricStatus = asyncHandler(async (req, res) => {
  const result = await getMyBiometricStatusService(req.user);
  return res.status(200).json(new ApiResponse(200, result, "Biometric status fetched successfully."));
});

export const registerBiometric = asyncHandler(async (req, res) => {
  const result = await registerBiometricService(req.body, req.user);
  return res.status(201).json(new ApiResponse(201, result, "Face Biometric registered successfully and sent for HR approval."));
});

export const resetEmployeeBiometric = asyncHandler(async (req, res) => {
  const targetId = req.params.employeeId || req.body?.employee_id;
  const result = await resetEmployeeBiometricService(targetId, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Biometric credential reset successfully. User can now register a new biometric."));
});

export const getPendingBiometricApprovals = asyncHandler(async (req, res) => {
  const result = await getPendingBiometricApprovalsService(req.user);
  return res.status(200).json(new ApiResponse(200, result, "Pending biometric approvals fetched successfully."));
});

export const approveBiometric = asyncHandler(async (req, res) => {
  const result = await approveBiometricService(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Employee Face Biometric approved successfully."));
});

export const rejectBiometric = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  const result = await rejectBiometricService(req.params.id, reason, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Employee Face Biometric rejected."));
});

export const checkInAttendance = asyncHandler(async (req, res) => {
  const result = await checkInAttendanceService(req.body, req.user, req);
  return res.status(200).json(new ApiResponse(200, result, "Attendance check-in marked successfully via Mobile Biometric."));
});

export const checkOutAttendance = asyncHandler(async (req, res) => {
  const result = await checkOutAttendanceService(req.body, req.user, req);
  return res.status(200).json(new ApiResponse(200, result, "Attendance check-out marked successfully."));
});

export const getMyAttendanceHistory = asyncHandler(async (req, res) => {
  const result = await getMyAttendanceHistoryService(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Personal attendance history fetched successfully."));
});

export const getHRAttendanceReports = asyncHandler(async (req, res) => {
  const result = await getHRAttendanceReportsService(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, result, "HR attendance reports fetched successfully."));
});

export const getOfficeIPs = asyncHandler(async (req, res) => {
  const result = await getOfficeIPsService();
  return res.status(200).json(new ApiResponse(200, result, "Whitelisted Office Wi-Fi IPs fetched successfully."));
});

export const addOfficeIP = asyncHandler(async (req, res) => {
  const result = await addOfficeIPService(req.body);
  return res.status(201).json(new ApiResponse(201, result, "Office Wi-Fi IP whitelisted successfully."));
});

export const deleteOfficeIP = asyncHandler(async (req, res) => {
  const result = await deleteOfficeIPService(req.params.id);
  return res.status(200).json(new ApiResponse(200, result, "Office Wi-Fi IP deleted successfully."));
});

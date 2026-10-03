import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import {
  getWhitelistedIPsRepository,
  addWhitelistedIPRepository,
  deleteWhitelistedIPRepository,
  findEmployeeBiometricRepository,
  saveEmployeeBiometricRepository,
  findTodayAttendanceRepository,
  createAttendanceCheckInRepository,
  updateAttendanceCheckOutRepository,
  getMyAttendanceHistoryRepository,
  getHRAttendanceReportsRepository,
} from "../repositories/attendanceRepository.js";

/**
 * Extracts and cleans client IP address from request headers / socket
 */
const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = forwarded.split(",");
    return ips[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "127.0.0.1";
};

/**
 * Verifies request IP (now non-restrictive: allows attendance from any mobile Wi-Fi / Cellular data network)
 */
export const verifyOfficeIP = async (req) => {
  const clientIp = getClientIp(req);
  return { clientIp, isOfficeWifi: true };
};

/**
 * Helper to get linked employee ID for current user
 */
const getEmployeeId = async (currentUser) => {
  const employee = await findEmployeeByUserIdRepository(currentUser.id);
  if (!employee) {
    throw new ApiError(
      403,
      "No employee profile is linked to your account. Contact HR."
    );
  }
  return employee;
};

// ==========================================
// Service Methods
// ==========================================

export const getMyBiometricStatusService = async (currentUser) => {
  const employee = await getEmployeeId(currentUser);
  const biometric = await findEmployeeBiometricRepository(employee.id);
  const todayAttendance = await findTodayAttendanceRepository(employee.id);

  return {
    employee_id: employee.id,
    is_registered: !!biometric,
    is_locked: biometric ? biometric.is_locked : false,
    registered_at: biometric ? biometric.registered_at : null,
    today_attendance: todayAttendance || null,
  };
};

export const registerBiometricService = async ({ credentialId, publicKey, deviceInfo }, currentUser) => {
  const employee = await getEmployeeId(currentUser);
  const existing = await findEmployeeBiometricRepository(employee.id);

  if (existing) {
    throw new ApiError(
      400,
      "Biometric credential is already registered and locked for your account. You cannot edit or re-register it."
    );
  }

  if (!credentialId) {
    throw new ApiError(400, "Credential ID is required for WebAuthn biometric registration.");
  }

  return await saveEmployeeBiometricRepository(null, {
    employee_id: employee.id,
    credential_id: credentialId,
    public_key: publicKey || "FIDO2_WEBAUTHN_KEY",
    device_info: deviceInfo || "Mobile Biometric Device",
  });
};

export const checkInAttendanceService = async ({ credentialId, latitude, longitude, location_name }, currentUser, req) => {
  const { clientIp, isOfficeWifi } = await verifyOfficeIP(req);
  const employee = await getEmployeeId(currentUser);

  const biometric = await findEmployeeBiometricRepository(employee.id);
  if (!biometric) {
    throw new ApiError(
      400,
      "Please register your mobile biometric (Fingerprint/FaceID) once before marking attendance."
    );
  }

  if (credentialId && biometric.credential_id !== credentialId) {
    throw new ApiError(403, "Biometric signature mismatch. Please use your registered mobile fingerprint.");
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const attendance = await createAttendanceCheckInRepository(null, {
    employee_id: employee.id,
    date: todayStr,
    ip_address: clientIp,
    is_office_wifi: isOfficeWifi,
    status: "PRESENT",
    check_in_lat: latitude ? Number(latitude) : null,
    check_in_lng: longitude ? Number(longitude) : null,
    check_in_location: location_name || null,
  });

  return attendance;
};

export const checkOutAttendanceService = async ({ latitude, longitude, location_name }, currentUser, req) => {
  await verifyOfficeIP(req);
  const employee = await getEmployeeId(currentUser);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = await findTodayAttendanceRepository(employee.id, todayStr);

  if (!todayAttendance) {
    throw new ApiError(400, "You have not checked in today yet.");
  }

  return await updateAttendanceCheckOutRepository(null, {
    id: todayAttendance.id,
    check_out_lat: latitude ? Number(latitude) : null,
    check_out_lng: longitude ? Number(longitude) : null,
    check_out_location: location_name || null,
  });
};

export const getMyAttendanceHistoryService = async (filters, currentUser) => {
  const employee = await getEmployeeId(currentUser);
  return await getMyAttendanceHistoryRepository({
    employee_id: employee.id,
    ...filters,
  });
};

export const getHRAttendanceReportsService = async (filters, currentUser) => {
  const isHR = ["HR", "ADMIN", "SUPER_ADMIN"].includes(currentUser.role);
  if (!isHR) {
    throw new ApiError(403, "You are not authorized to view HR attendance reports.");
  }

  return await getHRAttendanceReportsRepository(filters);
};

export const getOfficeIPsService = async () => {
  return await getWhitelistedIPsRepository();
};

export const addOfficeIPService = async ({ ip_address, label }) => {
  if (!ip_address) throw new ApiError(400, "IP Address is required.");
  return await addWhitelistedIPRepository(ip_address, label || "Office Wi-Fi");
};

export const deleteOfficeIPService = async (id) => {
  return await deleteWhitelistedIPRepository(id);
};

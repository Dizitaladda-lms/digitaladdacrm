import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import {
  getWhitelistedIPsRepository,
  addWhitelistedIPRepository,
  deleteWhitelistedIPRepository,
  findEmployeeBiometricRepository,
  saveEmployeeBiometricRepository,
  deleteEmployeeBiometricRepository,
  getPendingBiometricApprovalsRepository,
  approveBiometricRepository,
  rejectBiometricRepository,
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

export const getMyBiometricStatusService = async (currentUser, dateStr = null) => {
  const employee = await getEmployeeId(currentUser);
  const biometric = await findEmployeeBiometricRepository(employee.id);
  const todayAttendance = await findTodayAttendanceRepository(employee.id, dateStr);

  return {
    employee_id: employee.id,
    is_registered: !!biometric,
    credential_id: biometric ? biometric.credential_id : null,
    is_locked: biometric ? biometric.is_locked : false,
    approval_status: biometric ? (biometric.approval_status || "APPROVED") : "NOT_REGISTERED",
    face_image_url: biometric ? biometric.face_image_url : null,
    rejection_reason: biometric ? biometric.rejection_reason : null,
    registered_at: biometric ? biometric.registered_at : null,
    shift_timing_type: employee.shift_timing_type || "DEFAULT",
    shift_start_time: employee.shift_start_time || "10:00",
    shift_end_time: employee.shift_end_time || "18:00",
    custom_shift_timings: employee.custom_shift_timings || null,
    today_attendance: todayAttendance || null,
  };
};

export const registerBiometricService = async (payload = {}, currentUser) => {
  const { credentialId, publicKey, deviceInfo, faceImage } = payload || {};
  const employee = await getEmployeeId(currentUser);
  const existing = await findEmployeeBiometricRepository(employee.id);

  if (existing && existing.approval_status === "APPROVED") {
    throw new ApiError(
      400,
      "Your Face Biometric is already approved by HR and locked. If you need to update your face photo, please ask HR to reset your biometric registration."
    );
  }

  return await saveEmployeeBiometricRepository(null, {
    employee_id: employee.id,
    credential_id: credentialId || `FACE_ID_${employee.id}_${Date.now()}`,
    public_key: publicKey || "FIDO2_FACE_ID_KEY",
    device_info: deviceInfo || "Mobile Face ID Device",
    face_image_url: faceImage || (existing ? existing.face_image_url : null),
  });
};

// Office Geofence Coordinates: 28°32'30.4"N 77°14'26.7"E (28.541778, 77.240750)
const OFFICE_LAT = 28.541778;
const OFFICE_LNG = 77.240750;
const MAX_GEOFENCE_RADIUS_METERS = 100;

export const calculateGeofenceDistance = (userLat, userLng) => {
  const R = 6371000; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (OFFICE_LAT - userLat) * rad;
  const dLon = (OFFICE_LNG - userLng) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLat * rad) * Math.cos(OFFICE_LAT * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const checkInAttendanceService = async (payload = {}, currentUser, req) => {
  const { credentialId, latitude, longitude, location_name, faceImage } = payload || {};

  if (!latitude || !longitude || location_name?.includes("Denied") || location_name?.includes("Unavailable")) {
    throw new ApiError(
      400,
      "📍 GPS Location Permission is mandatory to mark attendance! Please enable location access on your device."
    );
  }

  const distanceInMeters = calculateGeofenceDistance(Number(latitude), Number(longitude));
  if (distanceInMeters > MAX_GEOFENCE_RADIUS_METERS) {
    throw new ApiError(
      400,
      `📍 Attendance Rejected! You are ${Math.round(distanceInMeters)} meters away from the office location. Attendance can only be marked within 100 meters of the office premises.`
    );
  }

  const { clientIp, isOfficeWifi } = await verifyOfficeIP(req);
  const employee = await getEmployeeId(currentUser);

  let biometric = await findEmployeeBiometricRepository(employee.id);

  // STRICT RULE: Attendance can ONLY be marked after HR APPROVAL!
  if (!biometric || biometric.approval_status !== "APPROVED") {
    if (!biometric || biometric.approval_status === "NOT_REGISTERED") {
      throw new ApiError(
        403,
        "🔒 Attendance blocked! You must register your Face ID selfie photo for HR approval before marking attendance."
      );
    } else if (biometric.approval_status === "PENDING_APPROVAL") {
      throw new ApiError(
        403,
        "⏳ Attendance blocked! Your Face ID registration is pending approval by HR. Attendance will unlock as soon as HR approves your Face ID."
      );
    } else if (biometric.approval_status === "REJECTED") {
      throw new ApiError(
        403,
        "❌ Attendance blocked! Your Face ID was rejected by HR. Please re-capture your face selfie for approval."
      );
    } else {
      throw new ApiError(
        403,
        "🔒 Attendance blocked! Your Face ID Biometric must be approved by HR first."
      );
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Calculate if check-in is late based on IST office schedule
  // Mon - Fri: 10:00 AM (600 mins)
  // Sat: 9:30 AM (570 mins)
  // Sun: 9:30 AM (570 mins)
  let status = "PRESENT";
  try {
    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = istFormatter.formatToParts(now);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    const weekday = getPart("weekday");
    let hour = parseInt(getPart("hour"), 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(getPart("minute"), 10);
    const currentMins = hour * 60 + minute;

    let expectedMins = 10 * 60; // Mon-Fri 10:00 AM
    if (weekday === "Sat" || weekday === "Sun") {
      expectedMins = 9 * 60 + 30; // Sat & Sun 9:30 AM
    }

    if (employee.shift_timing_type === "CUSTOM") {
      let customStart = employee.shift_start_time || "10:00";
      const customTimings = typeof employee.custom_shift_timings === "string"
        ? (() => { try { return JSON.parse(employee.custom_shift_timings); } catch (e) { return null; } })()
        : employee.custom_shift_timings;

      if (weekday === "Sat" && customTimings?.sat_start) {
        customStart = customTimings.sat_start;
      } else if (weekday === "Sun" && customTimings?.sun_start) {
        customStart = customTimings.sun_start;
      } else if (customTimings?.mon_fri_start) {
        customStart = customTimings.mon_fri_start;
      }

      const [customHour, customMinute] = String(customStart).split(":").map(Number);
      if (!isNaN(customHour) && !isNaN(customMinute)) {
        expectedMins = customHour * 60 + customMinute;
      }
    }

    if (currentMins > expectedMins) {
      status = "LATE";
    }
  } catch (err) {
    console.error("Error calculating late check-in:", err);
  }

  const attendance = await createAttendanceCheckInRepository(null, {
    employee_id: employee.id,
    date: todayStr,
    ip_address: clientIp,
    is_office_wifi: isOfficeWifi,
    status,
    check_in_lat: Number(latitude),
    check_in_lng: Number(longitude),
    check_in_location: location_name || null,
  });

  return attendance;
};

export const checkOutAttendanceService = async (payload = {}, currentUser, req) => {
  const { latitude, longitude, location_name } = payload || {};

  if (!latitude || !longitude || location_name?.includes("Denied") || location_name?.includes("Unavailable")) {
    throw new ApiError(
      400,
      "📍 GPS Location Permission is mandatory to check-out! Please enable location access on your device."
    );
  }

  const distanceInMeters = calculateGeofenceDistance(Number(latitude), Number(longitude));
  if (distanceInMeters > MAX_GEOFENCE_RADIUS_METERS) {
    throw new ApiError(
      400,
      `📍 Check-Out Rejected! You are ${Math.round(distanceInMeters)} meters away from the office location. Check-out can only be marked within 100 meters of the office premises.`
    );
  }

  await verifyOfficeIP(req);
  const employee = await getEmployeeId(currentUser);

  let biometric = await findEmployeeBiometricRepository(employee.id);
  if (!biometric || biometric.approval_status !== "APPROVED") {
    throw new ApiError(
      403,
      "🔒 Check-out blocked! Your Face ID Biometric must be approved by HR first."
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = await findTodayAttendanceRepository(employee.id, todayStr);

  if (!todayAttendance) {
    throw new ApiError(400, "You have not checked in today yet.");
  }

  return await updateAttendanceCheckOutRepository(null, {
    id: todayAttendance.id,
    check_out_lat: Number(latitude),
    check_out_lng: Number(longitude),
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

  const reportsData = await getHRAttendanceReportsRepository(filters);
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  // If user is HR (not Super Admin), sanitize live GPS location coordinates and address fields
  if (!isSuperAdmin && reportsData?.attendance) {
    reportsData.attendance = reportsData.attendance.map((row) => {
      const {
        check_in_lat,
        check_in_lng,
        check_in_location,
        check_out_lat,
        check_out_lng,
        check_out_location,
        ...sanitizedRow
      } = row;
      return sanitizedRow;
    });
  }

  return reportsData;
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

export const resetEmployeeBiometricService = async (targetEmployeeId, currentUser) => {
  const isHR = ["HR", "ADMIN", "SUPER_ADMIN"].includes(currentUser.role);
  let empIdToReset = targetEmployeeId;

  if (!empIdToReset || !isHR) {
    const employee = await getEmployeeId(currentUser);
    empIdToReset = employee.id;
  }

  const deleted = await deleteEmployeeBiometricRepository(empIdToReset);
  if (!deleted) {
    throw new ApiError(404, "No biometric registration found for this employee.");
  }
  return deleted;
};

export const getPendingBiometricApprovalsService = async (currentUser) => {
  const isHR = ["HR", "ADMIN", "SUPER_ADMIN"].includes(currentUser.role);
  if (!isHR) {
    throw new ApiError(403, "You are not authorized to view biometric approvals.");
  }
  return await getPendingBiometricApprovalsRepository();
};

export const approveBiometricService = async (biometricId, currentUser) => {
  const isHR = ["HR", "ADMIN", "SUPER_ADMIN"].includes(currentUser.role);
  if (!isHR) {
    throw new ApiError(403, "You are not authorized to approve biometric registrations.");
  }

  const approved = await approveBiometricRepository(biometricId, currentUser.id);
  if (!approved) throw new ApiError(404, "Biometric record not found.");
  return approved;
};

export const rejectBiometricService = async (biometricId, reason, currentUser) => {
  const isHR = ["HR", "ADMIN", "SUPER_ADMIN"].includes(currentUser.role);
  if (!isHR) {
    throw new ApiError(403, "You are not authorized to reject biometric registrations.");
  }

  const rejected = await rejectBiometricRepository(biometricId, reason);
  if (!rejected) throw new ApiError(404, "Biometric record not found.");
  return rejected;
};

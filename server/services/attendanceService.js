import pool from "../config/db.js";
import crypto from "node:crypto";
import ApiError from "../utils/ApiError.js";
import {
  assertFaceEncryptionConfigured,
  verifyAndCreateFaceTemplate,
  verifyFaceAttendance,
} from "../utils/faceVerification.js";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { getAttendanceWebAuthnConfig } from "../utils/attendanceWebAuthn.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import {
  getWhitelistedIPsRepository,
  addWhitelistedIPRepository,
  deleteWhitelistedIPRepository,
  findEmployeeBiometricRepository,
  saveEmployeeBiometricRepository,
  deleteEmployeeBiometricRepository,
  getPendingBiometricApprovalsRepository,
  saveEmployeeBiometricChallengeRepository,
  consumeEmployeeBiometricChallengeRepository,
  updateEmployeeBiometricCounterRepository,
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

const isCanonicalBase64Url = (value, minimumBytes) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  return decoded.length >= minimumBytes && decoded.toString("base64url") === value;
};

const hasUsablePasskey = (biometric) =>
  isCanonicalBase64Url(biometric?.credential_id, 16) &&
  isCanonicalBase64Url(biometric?.public_key, 32);

export const requiresIOSFaceVerification = (req) =>
  /iPhone|iPad|iPod|Macintosh.*Mobile/i.test(
    req?.get?.("user-agent") || req?.headers?.["user-agent"] || ""
  );

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
    passkey_ready: hasUsablePasskey(biometric),
    face_registered: Boolean(
      biometric?.face_template_encrypted &&
      biometric?.face_template_iv &&
      biometric?.face_template_tag
    ),
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

export const getBiometricRegistrationOptionsService = async (currentUser, req) => {
  if (requiresIOSFaceVerification(req)) {
    assertFaceEncryptionConfigured();
  }
  const employee = await getEmployeeId(currentUser);
  const existing = await findEmployeeBiometricRepository(employee.id);
  if (
    existing &&
    !(
      existing.approval_status === "RE_ENROLL_REQUIRED" &&
      !hasUsablePasskey(existing)
    )
  ) {
    throw new ApiError(
      409,
      "A passkey is already registered and locked. Contact HR to reset it before registering a new one."
    );
  }

  const { rpID, rpName } = getAttendanceWebAuthnConfig();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(String(employee.id)),
    userName: currentUser.email,
    userDisplayName: currentUser.full_name,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  await saveEmployeeBiometricChallengeRepository(employee.id, "registration", options.challenge);
  return options;
};

export const registerBiometricService = async (response, currentUser, req) => {
  const { faceProof, faceConsent, ...credentialResponse } = response || {};
  const requiresFace = requiresIOSFaceVerification(req);
  if (requiresFace && faceConsent !== true) {
    throw new ApiError(400, "Consent is required to create and use an attendance face template.");
  }
  const employee = await getEmployeeId(currentUser);
  const expectedChallenge = await consumeEmployeeBiometricChallengeRepository(employee.id, "registration");
  if (!expectedChallenge) {
    throw new ApiError(400, "Passkey registration expired. Please try again.");
  }

  const { rpID, origins } = getAttendanceWebAuthnConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: credentialResponse,
      expectedChallenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (error) {
    console.warn(
      "Passkey registration response was rejected:",
      error instanceof Error ? error.message : "Unknown verification error."
    );
    throw new ApiError(400, "Passkey registration could not be verified.");
  }

  if (!verification.verified || !verification.registrationInfo?.credential) {
    throw new ApiError(400, "Passkey registration could not be verified.");
  }

  const { credential } = verification.registrationInfo;
  let faceTemplate = null;
  if (requiresFace) {
    const faceChallengeResponse = await consumeEmployeeBiometricChallengeRepository(
      employee.id,
      "face_registration"
    );
    if (!faceChallengeResponse) {
      throw new ApiError(400, "Face registration expired. Please start registration again.");
    }
    let faceChallenge;
    try {
      faceChallenge = JSON.parse(faceChallengeResponse);
    } catch {
      throw new ApiError(500, "Face registration challenge is invalid. Please start again.");
    }
    faceTemplate = await verifyAndCreateFaceTemplate(faceProof, faceChallenge);
  }
  const registered = await saveEmployeeBiometricRepository(null, {
    employee_id: employee.id,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    sign_count: credential.counter,
    authenticator_transports: credential.transports || [],
    device_info: requiresFace ? "iOS Passkey and Face" : "Platform Passkey",
    face_template: faceTemplate,
  });
  if (!registered) {
    throw new ApiError(
      409,
      "A passkey is already registered and locked. Contact HR to reset it before registering a new one."
    );
  }
  return {
    employee_id: registered.employee_id,
    device_info: registered.device_info,
    is_locked: registered.is_locked,
    approval_status: registered.approval_status,
    face_registered: Boolean(faceTemplate),
    registered_at: registered.registered_at,
  };
};

export const getBiometricAuthenticationOptionsService = async (currentUser) => {
  const employee = await getEmployeeId(currentUser);
  const biometric = await findEmployeeBiometricRepository(employee.id);
  if (
    !biometric ||
    biometric.approval_status !== "APPROVED" ||
    !hasUsablePasskey(biometric) ||
    !biometric.face_template_encrypted
  ) {
    throw new ApiError(
      403,
      "Register your attendance passkey and face before marking attendance."
    );
  }

  const { rpID } = getAttendanceWebAuthnConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [{
      id: biometric.credential_id,
      transports: biometric.authenticator_transports || [],
    }],
    userVerification: "required",
  });
  await saveEmployeeBiometricChallengeRepository(employee.id, "authentication", options.challenge);
  return options;
};

export const getBiometricFaceChallengeService = async (currentUser, purpose, req) => {
  if (!requiresIOSFaceVerification(req)) {
    throw new ApiError(400, "Camera face verification is only required on iPhone and iPad.");
  }
  if (purpose !== "registration" && purpose !== "authentication") {
    throw new ApiError(400, "A valid face verification purpose is required.");
  }
  const employee = await getEmployeeId(currentUser);
  const registration = purpose === "registration";
  const biometric = await findEmployeeBiometricRepository(employee.id);
  if (registration) {
    if (
      biometric &&
      !(
        biometric.approval_status === "RE_ENROLL_REQUIRED" &&
        !hasUsablePasskey(biometric)
      )
    ) {
      throw new ApiError(409, "This passkey is already registered and locked. Contact HR to reset it.");
    }
    const registrationChallenge = await pool.query(
      `SELECT 1 FROM employee_biometric_challenges
       WHERE employee_id = $1 AND purpose = 'registration' AND expires_at > CURRENT_TIMESTAMP`,
      [employee.id]
    );
    if (registrationChallenge.rowCount !== 1) {
      throw new ApiError(400, "Start passkey registration before face registration.");
    }
  } else {
    if (
      !biometric ||
      biometric.approval_status !== "APPROVED" ||
      !hasUsablePasskey(biometric) ||
      !biometric.face_template_encrypted
    ) {
      throw new ApiError(403, "Register your attendance passkey and face before marking attendance.");
    }
  }

  const faceChallenge = {
    nonce: crypto.randomBytes(32).toString("base64url"),
    turn: crypto.randomInt(0, 2) === 0 ? "LEFT" : "RIGHT",
  };
  await saveEmployeeBiometricChallengeRepository(
    employee.id,
    registration ? "face_registration" : "face_authentication",
    JSON.stringify(faceChallenge)
  );
  return { challenge: faceChallenge.nonce, turn: faceChallenge.turn };
};

const verifyAttendancePasskey = async (employeeId, response) => {
  if (!response || typeof response !== "object") {
    throw new ApiError(401, "A verified passkey is required to mark attendance.");
  }

  const biometric = await findEmployeeBiometricRepository(employeeId);
  if (
    !biometric ||
    biometric.approval_status !== "APPROVED" ||
    !hasUsablePasskey(biometric)
  ) {
    throw new ApiError(403, "Register an attendance passkey before marking attendance.");
  }

  const expectedChallenge = await consumeEmployeeBiometricChallengeRepository(employeeId, "authentication");
  if (!expectedChallenge) {
    throw new ApiError(401, "Passkey verification expired. Please try again.");
  }

  const { rpID, origins } = getAttendanceWebAuthnConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      credential: {
        id: biometric.credential_id,
        publicKey: Buffer.from(biometric.public_key, "base64url"),
        counter: Number(biometric.sign_count) || 0,
        transports: biometric.authenticator_transports || [],
      },
      requireUserVerification: true,
    });
  } catch (error) {
    console.warn(
      "Passkey authentication response was rejected:",
      error instanceof Error ? error.message : "Unknown verification error."
    );
    throw new ApiError(401, "Passkey verification failed.");
  }

  if (!verification.verified) {
    throw new ApiError(401, "Passkey verification failed.");
  }

  const counterUpdated = await updateEmployeeBiometricCounterRepository({
    employee_id: employeeId,
    credential_id: biometric.credential_id,
    previous_count: biometric.sign_count,
    sign_count: verification.authenticationInfo.newCounter,
  });
  if (!counterUpdated) {
    throw new ApiError(409, "Passkey changed during verification. Please try again.");
  }
  return biometric;
};

const verifyAttendanceFace = async (employeeId, biometric, faceProof) => {
  const challengeValue = await consumeEmployeeBiometricChallengeRepository(
    employeeId,
    "face_authentication"
  );
  if (!challengeValue) {
    throw new ApiError(401, "Face verification expired. Please try again.");
  }
  let expectedChallenge;
  try {
    expectedChallenge = JSON.parse(challengeValue);
  } catch {
    throw new ApiError(500, "Face verification challenge is invalid. Please try again.");
  }
  await verifyFaceAttendance(faceProof, expectedChallenge, {
    encrypted: biometric.face_template_encrypted,
    iv: biometric.face_template_iv,
    tag: biometric.face_template_tag,
  });
};

// Office Geofence Coordinates: 28°32'30.3"N 77°14'26.2"E
const OFFICE_LAT = 28.54175;
const OFFICE_LNG = 77.240611111;
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

const getValidatedCoordinates = (latitude, longitude, locationName, action) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const locationUnavailable =
    typeof locationName === "string" &&
    (locationName.includes("Denied") || locationName.includes("Unavailable"));
  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    locationUnavailable
  ) {
    throw new ApiError(
      400,
      `GPS location is required to ${action}. Please enable location access on your device.`
    );
  }
  return { lat, lng };
};

export const checkInAttendanceService = async (payload = {}, currentUser, req) => {
  const { assertion, faceProof, latitude, longitude, location_name } = payload || {};
  const { lat, lng } = getValidatedCoordinates(latitude, longitude, location_name, "mark attendance");

  const distanceInMeters = calculateGeofenceDistance(lat, lng);
  if (distanceInMeters > MAX_GEOFENCE_RADIUS_METERS) {
    throw new ApiError(
      400,
      `📍 Attendance Rejected! You are ${Math.round(distanceInMeters)} meters away from the office location. Attendance can only be marked within 100 meters of the office premises.`
    );
  }

  const employee = await getEmployeeId(currentUser);
  const biometric = await verifyAttendancePasskey(employee.id, assertion);
  if (requiresIOSFaceVerification(req)) {
    await verifyAttendanceFace(employee.id, biometric, faceProof);
  }
  const { clientIp, isOfficeWifi } = await verifyOfficeIP(req);

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

  const cleanLocation =
    distanceInMeters <= MAX_GEOFENCE_RADIUS_METERS
      ? "Dizital Adda Office Premises"
      : (location_name || null);

  const attendance = await createAttendanceCheckInRepository(null, {
    employee_id: employee.id,
    date: todayStr,
    ip_address: clientIp,
    is_office_wifi: isOfficeWifi,
    status,
    check_in_lat: lat,
    check_in_lng: lng,
    check_in_location: cleanLocation,
  });

  return attendance;
};

export const checkOutAttendanceService = async (payload = {}, currentUser, req) => {
  const { assertion, faceProof, latitude, longitude, location_name } = payload || {};
  const { lat, lng } = getValidatedCoordinates(latitude, longitude, location_name, "check out");

  const distanceInMeters = calculateGeofenceDistance(lat, lng);
  if (distanceInMeters > MAX_GEOFENCE_RADIUS_METERS) {
    throw new ApiError(
      400,
      `📍 Check-Out Rejected! You are ${Math.round(distanceInMeters)} meters away from the office location. Check-out can only be marked within 100 meters of the office premises.`
    );
  }

  await verifyOfficeIP(req);
  const employee = await getEmployeeId(currentUser);
  const biometric = await verifyAttendancePasskey(employee.id, assertion);
  if (requiresIOSFaceVerification(req)) {
    await verifyAttendanceFace(employee.id, biometric, faceProof);
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = await findTodayAttendanceRepository(employee.id, todayStr);

  if (!todayAttendance) {
    throw new ApiError(400, "You have not checked in today yet.");
  }

  const cleanLocation =
    distanceInMeters <= MAX_GEOFENCE_RADIUS_METERS
      ? "Dizital Adda Office Premises"
      : (location_name || null);

  return await updateAttendanceCheckOutRepository(null, {
    id: todayAttendance.id,
    check_out_lat: lat,
    check_out_lng: lng,
    check_out_location: cleanLocation,
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
  if (!["HR", "ADMIN", "SUPER_ADMIN"].includes(currentUser.role)) {
    throw new ApiError(403, "Only HR or an administrator can reset an attendance passkey.");
  }

  const employeeId = Number(targetEmployeeId);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
    throw new ApiError(400, "A valid employee ID is required to reset an attendance passkey.");
  }

  const deleted = await deleteEmployeeBiometricRepository(employeeId);
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

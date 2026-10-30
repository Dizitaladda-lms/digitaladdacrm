import pool from "../config/db.js";
import crypto from "node:crypto";
import ApiError from "../utils/ApiError.js";
import auditLogger from "../utils/auditLogger.js";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { getAttendanceWebAuthnConfig } from "../utils/attendanceWebAuthn.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import {
  getAttendanceSettingsRepository,
  upsertAttendanceSettingRepository,
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
  autoCheckOutOpenAttendancesRepository,
  getMyAttendanceHistoryRepository,
  getHRAttendanceReportsRepository,
  findEmployeeByIdForAttendanceRepository,
  upsertEmployeeAttendanceByHRRepository,
  getEmployeeAttendanceQuotaSummaryRepository,
} from "../repositories/attendanceRepository.js";

/**
 * Extracts and cleans client IP address from request headers / socket
 */
export const getClientIp = (req) => {
  if (!req) return "127.0.0.1";
  const cf = req.headers?.["cf-connecting-ip"];
  if (cf && typeof cf === "string" && cf.trim()) return cf.trim();

  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    const ips = forwarded.split(",");
    const first = ips[0].trim();
    if (first) {
      return first.startsWith("::ffff:") ? first.replace("::ffff:", "") : first;
    }
  }

  const realIp = req.headers?.["x-real-ip"];
  if (realIp && typeof realIp === "string" && realIp.trim()) {
    const cleaned = realIp.trim();
    return cleaned.startsWith("::ffff:") ? cleaned.replace("::ffff:", "") : cleaned;
  }

  let raw = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "127.0.0.1";
  if (typeof raw === "string" && raw.startsWith("::ffff:")) {
    raw = raw.replace("::ffff:", "");
  }
  return raw;
};

/**
 * Verifies if the request originates from a registered office Wi-Fi / IP
 */
export const verifyOfficeIP = async (req) => {
  const clientIp = getClientIp(req);
  if (!clientIp) {
    return { clientIp: "Unknown", isOfficeWifi: false };
  }

  // 1. Check process.env.OFFICE_IPS
  const envOfficeIps = (process.env.OFFICE_IPS || "")
    .split(",")
    .map((ip) => ip.trim().toLowerCase())
    .filter(Boolean);

  if (envOfficeIps.includes(clientIp.toLowerCase())) {
    return { clientIp, isOfficeWifi: true };
  }

  // 2. Check office_wifi_ips table in DB
  try {
    const dbIps = await getWhitelistedIPsRepository();
    const isMatch = (dbIps || []).some(
      (row) =>
        row.is_active !== false &&
        row.ip_address &&
        row.ip_address.trim().toLowerCase() === clientIp.toLowerCase()
    );
    return { clientIp, isOfficeWifi: isMatch };
  } catch {
    return { clientIp, isOfficeWifi: false };
  }
};

/**
 * Retrieves configured office coordinates & radius (from DB or .env fallback)
 */
export const getOfficeSettings = async () => {
  let dbSettings = {};
  try {
    const rows = await getAttendanceSettingsRepository();
    for (const r of rows || []) {
      dbSettings[r.key] = r.value;
    }
  } catch {
    // fallback
  }

  const office_lat = Number(
    dbSettings.office_lat || process.env.OFFICE_LAT || 28.54175
  );
  const office_lng = Number(
    dbSettings.office_lng || process.env.OFFICE_LNG || 77.240611111
  );
  const office_radius = Number(
    dbSettings.office_radius || process.env.OFFICE_RADIUS || 100
  );

  return { office_lat, office_lng, office_radius };
};

const getIstDateString = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
};

/**
 * Server-side safety net for employees who forget to check out. It uses the
 * fixed 7:00 PM IST cut-off rather than the job's actual run time, so a late
 * restart cannot accidentally credit additional hours. No GPS is fabricated:
 * the record is explicitly labelled as a system auto-checkout.
 */
export const runScheduledAutoCheckout = async (now = new Date()) => {
  const date = getIstDateString(now);
  const checkOutTime = new Date(`${date}T19:00:00+05:30`);

  if (now.getTime() < checkOutTime.getTime()) {
    return [];
  }

  return autoCheckOutOpenAttendancesRepository({
    date,
    checkOutTime: checkOutTime.toISOString(),
  });
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

const isMobileAttendanceDevice = (req) => {
  if (req?.get?.("sec-ch-ua-mobile") === "?1") return true;
  return /iPhone|iPad|iPod|Macintosh.*Mobile|Android|Mobile|Tablet|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    req?.get?.("user-agent") || req?.headers?.["user-agent"] || ""
  );
};

const ensureLaptopAttendanceIsEnabled = (employee, req) => {
  if (!isMobileAttendanceDevice(req) && !employee.laptop_attendance_enabled) {
    throw new ApiError(
      403,
      "Laptop attendance is not enabled for your account. Please contact HR."
    );
  }
};

const isCanonicalBase64Url = (value, minimumBytes) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  return decoded.length >= minimumBytes && decoded.toString("base64url") === value;
};

const hasUsablePasskey = (biometric) =>
  isCanonicalBase64Url(biometric?.credential_id, 16) &&
  isCanonicalBase64Url(biometric?.public_key, 32);

const isAttendancePasskeyRequired = () => {
  const value = String(process.env.ATTENDANCE_PASSKEY_REQUIRED || "false").toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new Error("ATTENDANCE_PASSKEY_REQUIRED must be set to true or false.");
  }
  return value === "true";
};

export const requiresIOSFaceVerification = (req) =>
  /iPhone|iPad|iPod|Macintosh.*Mobile/i.test(
    req?.get?.("user-agent") || req?.headers?.["user-agent"] || ""
  );

// ==========================================
// Service Methods
// ==========================================

export const getMyBiometricStatusService = async (currentUser, dateStr = null, req = null) => {
  const employee = await getEmployeeId(currentUser);
  const biometric = await findEmployeeBiometricRepository(employee.id);
  const todayAttendance = await findTodayAttendanceRepository(employee.id, dateStr);
  const { office_lat, office_lng, office_radius } = await getOfficeSettings();
  let client_ip = null;
  let is_office_ip = false;
  if (req) {
    const verified = await verifyOfficeIP(req);
    client_ip = verified.clientIp;
    is_office_ip = verified.isOfficeWifi;
  }

  const todayStatusQuery = await pool.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM daily_employee_work_modes
         WHERE employee_id = $1 AND work_date = CURRENT_DATE AND work_mode = 'WFH'
         UNION
         SELECT 1 FROM employee_wfh_requests
         WHERE employee_id = $1 AND status = 'APPROVED' AND CURRENT_DATE BETWEEN start_date AND end_date
       ) AS is_wfh_today,
       EXISTS (
         SELECT 1 FROM employee_leave_requests
         WHERE employee_id = $1 AND status = 'APPROVED' AND CURRENT_DATE BETWEEN start_date AND end_date
         UNION
         SELECT 1 FROM daily_employee_presence_overrides
         WHERE employee_id = $1 AND presence_date = CURRENT_DATE AND status = 'ON_LEAVE'
       ) AS is_on_leave_today;`,
    [employee.id]
  );
  const is_wfh_today = Boolean(todayStatusQuery.rows[0]?.is_wfh_today);
  const is_on_leave_today = Boolean(todayStatusQuery.rows[0]?.is_on_leave_today);

  return {
    is_wfh_today,
    is_on_leave_today,
    employee_id: employee.id,
    passkey_required: isAttendancePasskeyRequired(),
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
    laptop_attendance_enabled: Boolean(employee.laptop_attendance_enabled),
    today_attendance: todayAttendance || null,
    office_lat,
    office_lng,
    office_radius,
    client_ip,
    is_office_ip,
  };
};

export const getBiometricRegistrationOptionsService = async (currentUser) => {
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

export const registerBiometricService = async (response, currentUser) => {
  const credentialResponse = response || {};
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
  const registered = await saveEmployeeBiometricRepository(null, {
    employee_id: employee.id,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    sign_count: credential.counter,
    authenticator_transports: credential.transports || [],
    device_info: "Platform Passkey",
    face_template: null,
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
    face_registered: false,
    registered_at: registered.registered_at,
  };
};

export const getBiometricAuthenticationOptionsService = async (currentUser) => {
  const employee = await getEmployeeId(currentUser);
  const biometric = await findEmployeeBiometricRepository(employee.id);
  if (
    !biometric ||
    biometric.approval_status !== "APPROVED" ||
    !hasUsablePasskey(biometric)
  ) {
    throw new ApiError(403, "Register your attendance passkey before marking attendance.");
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
        counter: 0,
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

  await updateEmployeeBiometricCounterRepository({
    employee_id: employeeId,
    credential_id: biometric.credential_id,
    sign_count: verification.authenticationInfo.newCounter,
  });
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
  const { verifyFaceAttendance } = await import("../utils/faceVerification.js");
  await verifyFaceAttendance(faceProof, expectedChallenge, {
    encrypted: biometric.face_template_encrypted,
    iv: biometric.face_template_iv,
    tag: biometric.face_template_tag,
  });
};

// Default Office Geofence Coordinates: 28°32'30.3"N 77°14'26.2"E
const DEFAULT_OFFICE_LAT = 28.54175;
const DEFAULT_OFFICE_LNG = 77.240611111;
const DEFAULT_MAX_GEOFENCE_RADIUS_METERS = 100;

export const calculateGeofenceDistance = (userLat, userLng, targetLat = DEFAULT_OFFICE_LAT, targetLng = DEFAULT_OFFICE_LNG) => {
  const R = 6371000; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (targetLat - userLat) * rad;
  const dLon = (targetLng - userLng) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLat * rad) * Math.cos(targetLat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
  const employee = await getEmployeeId(currentUser);
  ensureLaptopAttendanceIsEnabled(employee, req);

  const { assertion, latitude, longitude, accuracy, location_name } = payload || {};
  const { clientIp, isOfficeWifi } = await verifyOfficeIP(req);
  const { office_lat, office_lng, office_radius } = await getOfficeSettings();

  const hasCoords =
    latitude !== undefined &&
    longitude !== undefined &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180;

  const lat = hasCoords ? Number(latitude) : null;
  const lng = hasCoords ? Number(longitude) : null;
  const acc =
    accuracy !== undefined && Number.isFinite(Number(accuracy)) && Number(accuracy) > 0
      ? Number(accuracy)
      : null;

  let distanceInMeters = null;
  if (hasCoords) {
    distanceInMeters = calculateGeofenceDistance(lat, lng, office_lat, office_lng);
  }

  let isGpsOk = false;
  let isGpsWeak = false;

  if (hasCoords) {
    if (acc !== null && acc > 150) {
      isGpsWeak = true;
      isGpsOk = false;
    } else {
      const allowedRadius = office_radius + (acc || 0);
      isGpsOk = distanceInMeters <= allowedRadius;
    }
  }

  // Check if employee has approved WFH for today
  const wfhCheck = await pool.query(
    `SELECT 1 FROM daily_employee_work_modes
     WHERE employee_id = $1 AND work_date = CURRENT_DATE AND work_mode = 'WFH'
     UNION
     SELECT 1 FROM employee_wfh_requests
     WHERE employee_id = $1 AND status = 'APPROVED' AND CURRENT_DATE BETWEEN start_date AND end_date
     LIMIT 1;`,
    [employee.id]
  );
  const isWfhToday = wfhCheck.rows.length > 0;

  // Rule: IP match OR GPS ok OR WFH approved => check-in allow
  const isAllowed = isOfficeWifi || isGpsOk || isWfhToday;

  let verificationMethod = "NONE";
  if (isWfhToday) {
    verificationMethod = "WFH";
  } else if (isOfficeWifi && isGpsOk) {
    verificationMethod = "GPS+IP";
  } else if (isOfficeWifi) {
    verificationMethod = "IP";
  } else if (isGpsOk) {
    verificationMethod = "GPS";
  }

  // Debugging log: lat, lng, accuracy, distance, userIp, final decision
  console.log(
    `[ATTENDANCE_CHECKIN] Employee: ${employee.id} (${employee.full_name}) | ` +
    `IP: ${clientIp} (Office Wi-Fi Match: ${isOfficeWifi}) | ` +
    `GPS: (${lat ?? 'N/A'}, ${lng ?? 'N/A'}, acc: ${acc !== null ? acc + 'm' : 'N/A'}) | ` +
    `Distance: ${distanceInMeters !== null ? Math.round(distanceInMeters) + 'm' : 'N/A'} (Radius: ${office_radius}m) | ` +
    `Decision: ${isAllowed ? 'ALLOWED via ' + verificationMethod : 'REJECTED'}`
  );

  if (!isAllowed) {
    if (isGpsWeak) {
      throw new ApiError(
        400,
        `📍 GPS signal weak hai (${Math.round(acc)}m accuracy - 150m max allowed) aur aap office Wi-Fi se connect nahi hain. Kripya phone me 'Precise Location' aur Wi-Fi ON karein, phir dobara try karein.`
      );
    }
    if (hasCoords && distanceInMeters > office_radius + (acc || 0)) {
      throw new ApiError(
        400,
        `📍 Attendance Rejected! You are ${Math.round(distanceInMeters)} meters away from the office location. Attendance can only be marked within ${office_radius} meters of office premises or on office Wi-Fi.`
      );
    }
    throw new ApiError(
      400,
      `GPS location ya office Wi-Fi connection zaroori hai attendance mark karne ke liye.`
    );
  }

  if (isAttendancePasskeyRequired()) {
    await verifyAttendancePasskey(employee.id, assertion);
  }

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // Calculate if check-in is late based on IST office schedule
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
    isWfhToday
      ? "Work From Home (Approved)"
      : distanceInMeters != null && distanceInMeters <= (office_radius + (acc || 0))
      ? "Dizital Adda Office Premises"
      : isOfficeWifi
      ? "Dizital Adda Office Premises (Office Wi-Fi)"
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
    check_in_accuracy: acc,
    check_in_distance: distanceInMeters !== null ? Math.round(distanceInMeters * 100) / 100 : null,
    verification_method: verificationMethod,
  });

  auditLogger({
    action: "CHECK_IN",
    module: "ATTENDANCE",
    userId: currentUser?.id,
    userName: currentUser?.full_name,
    userEmail: currentUser?.email,
    role: currentUser?.role,
    entityType: "attendance",
    entityId: attendance?.id,
    ip: clientIp,
    description: `${currentUser?.full_name || "Employee"} marked check-in via ${verificationMethod} (${cleanLocation})`,
    details: {
      status,
      verificationMethod,
      accuracy: acc,
      distance: distanceInMeters,
      isOfficeWifi,
    },
  });

  return attendance;
};

export const checkOutAttendanceService = async (payload = {}, currentUser, req) => {
  const employee = await getEmployeeId(currentUser);
  ensureLaptopAttendanceIsEnabled(employee, req);

  const { assertion, latitude, longitude, accuracy, location_name } = payload || {};
  const { clientIp, isOfficeWifi } = await verifyOfficeIP(req);
  const { office_lat, office_lng, office_radius } = await getOfficeSettings();

  const hasCoords =
    latitude !== undefined &&
    longitude !== undefined &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180;

  const lat = hasCoords ? Number(latitude) : null;
  const lng = hasCoords ? Number(longitude) : null;
  const acc =
    accuracy !== undefined && Number.isFinite(Number(accuracy)) && Number(accuracy) > 0
      ? Number(accuracy)
      : null;

  let distanceInMeters = null;
  if (hasCoords) {
    distanceInMeters = calculateGeofenceDistance(lat, lng, office_lat, office_lng);
  }

  let isGpsOk = false;
  let isGpsWeak = false;

  if (hasCoords) {
    if (acc !== null && acc > 150) {
      isGpsWeak = true;
      isGpsOk = false;
    } else {
      const allowedRadius = office_radius + (acc || 0);
      isGpsOk = distanceInMeters <= allowedRadius;
    }
  }

  const isAllowed = isOfficeWifi || isGpsOk;

  let verificationMethod = "NONE";
  if (isOfficeWifi && isGpsOk) {
    verificationMethod = "GPS+IP";
  } else if (isOfficeWifi) {
    verificationMethod = "IP";
  } else if (isGpsOk) {
    verificationMethod = "GPS";
  }

  console.log(
    `[ATTENDANCE_CHECKOUT] Employee: ${employee.id} (${employee.full_name}) | ` +
    `IP: ${clientIp} (Office Wi-Fi Match: ${isOfficeWifi}) | ` +
    `GPS: (${lat ?? 'N/A'}, ${lng ?? 'N/A'}, acc: ${acc !== null ? acc + 'm' : 'N/A'}) | ` +
    `Distance: ${distanceInMeters !== null ? Math.round(distanceInMeters) + 'm' : 'N/A'} (Radius: ${office_radius}m) | ` +
    `Decision: ${isAllowed ? 'ALLOWED via ' + verificationMethod : 'REJECTED'}`
  );

  if (!isAllowed) {
    if (isGpsWeak) {
      throw new ApiError(
        400,
        `📍 GPS signal weak hai (${Math.round(acc)}m accuracy - 150m max allowed) aur aap office Wi-Fi se connect nahi hain. Kripya phone me 'Precise Location' aur Wi-Fi ON karein, phir dobara try karein.`
      );
    }
    if (hasCoords && distanceInMeters > office_radius + (acc || 0)) {
      throw new ApiError(
        400,
        `📍 Check-Out Rejected! You are ${Math.round(distanceInMeters)} meters away from the office location. You can only check out within ${office_radius} meters of office premises or on office Wi-Fi.`
      );
    }
    throw new ApiError(
      400,
      `GPS location ya office Wi-Fi connection zaroori hai check out ke liye.`
    );
  }

  if (isAttendancePasskeyRequired() && assertion) {
    await verifyAttendancePasskey(employee.id, assertion);
  }

  const todayAttendance = await findTodayAttendanceRepository(employee.id, null);

  if (!todayAttendance) {
    throw new ApiError(400, "You have not checked in today yet.");
  }

  const cleanLocation =
    distanceInMeters != null && distanceInMeters <= (office_radius + (acc || 0))
      ? "Dizital Adda Office Premises"
      : isOfficeWifi
      ? "Dizital Adda Office Premises (Office Wi-Fi)"
      : (location_name || null);

  const updated = await updateAttendanceCheckOutRepository(null, {
    id: todayAttendance.id,
    check_out_lat: lat,
    check_out_lng: lng,
    check_out_location: cleanLocation,
    check_out_accuracy: acc,
    check_out_distance: distanceInMeters !== null ? Math.round(distanceInMeters * 100) / 100 : null,
    verification_method: verificationMethod,
  });

  auditLogger({
    action: "CHECK_OUT",
    module: "ATTENDANCE",
    userId: currentUser?.id,
    userName: currentUser?.full_name,
    userEmail: currentUser?.email,
    role: currentUser?.role,
    entityType: "attendance",
    entityId: todayAttendance.id,
    ip: clientIp,
    description: `${currentUser?.full_name || "Employee"} marked check-out via ${verificationMethod} (${cleanLocation})`,
    details: {
      verificationMethod,
      accuracy: acc,
      distance: distanceInMeters,
      isOfficeWifi,
    },
  });

  return updated;
};

export const syncOfflineAttendanceService = async (payload = {}, currentUser, req) => {
  const employee = await getEmployeeId(currentUser);
  ensureLaptopAttendanceIsEnabled(employee, req);

  const punches = Array.isArray(payload.punches)
    ? payload.punches
    : payload.punch
    ? [payload.punch]
    : [];

  if (punches.length === 0) {
    throw new ApiError(400, "No offline attendance punches provided for synchronization.");
  }

  // Sort chronologically by punch time
  punches.sort((a, b) => {
    const timeA = new Date(a.punchTime || a.punch_time || 0).getTime();
    const timeB = new Date(b.punchTime || b.punch_time || 0).getTime();
    return timeA - timeB;
  });

  const { clientIp, isOfficeWifi } = await verifyOfficeIP(req);
  const { office_lat, office_lng, office_radius } = await getOfficeSettings();
  const results = [];

  for (const punch of punches) {
    const rawAction = String(punch.type || punch.action || "check-in").toLowerCase();
    const isCheckIn = rawAction.includes("in");
    const punchTimeStr = punch.punchTime || punch.punch_time || new Date().toISOString();
    const punchDate = new Date(punchTimeStr);

    const { lat, lng } = getValidatedCoordinates(
      punch.latitude,
      punch.longitude,
      punch.location_name,
      isCheckIn ? "sync offline check-in" : "sync offline check-out"
    );

    const distanceInMeters = calculateGeofenceDistance(lat, lng, office_lat, office_lng);
    const acc = Number.isFinite(Number(punch.accuracy)) && Number(punch.accuracy) > 0 ? Number(punch.accuracy) : null;

    if (acc !== null && acc > 150) {
      throw new ApiError(
        400,
        `📍 Offline attendance punch rejected! GPS accuracy (${Math.round(acc)}m) was too weak (150m required).`
      );
    }

    if (distanceInMeters > office_radius + (acc || 0)) {
      throw new ApiError(
        400,
        `📍 Offline attendance punch rejected! Coordinates (${Math.round(distanceInMeters)}m) are outside the ${office_radius}m office geofence.`
      );
    }

    const cleanLocation =
      distanceInMeters <= office_radius + (acc || 0)
        ? "Dizital Adda Office Premises"
        : (punch.location_name || null);

    const targetDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(punchDate);

    if (isCheckIn) {
      let status = "PRESENT";
      try {
        const istFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        const parts = istFormatter.formatToParts(punchDate);
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
        console.error("Error calculating late check-in for offline punch:", err);
      }

      const attendance = await createAttendanceCheckInRepository(null, {
        employee_id: employee.id,
        date: targetDateStr,
        ip_address: clientIp,
        is_office_wifi: isOfficeWifi,
        status,
        check_in_lat: lat,
        check_in_lng: lng,
        check_in_location: cleanLocation,
        check_in_time: punchDate.toISOString(),
        check_in_accuracy: acc,
        check_in_distance: distanceInMeters !== null ? Math.round(distanceInMeters * 100) / 100 : null,
        verification_method: "GPS",
      });
      results.push({ action: "check-in", attendance });
    } else {
      let todayAttendance = await findTodayAttendanceRepository(employee.id, targetDateStr);
      if (!todayAttendance) {
        todayAttendance = await createAttendanceCheckInRepository(null, {
          employee_id: employee.id,
          date: targetDateStr,
          ip_address: clientIp,
          is_office_wifi: isOfficeWifi,
          status: "PRESENT",
          check_in_lat: lat,
          check_in_lng: lng,
          check_in_location: cleanLocation,
          check_in_time: punchDate.toISOString(),
          check_in_accuracy: acc,
          check_in_distance: distanceInMeters !== null ? Math.round(distanceInMeters * 100) / 100 : null,
          verification_method: "GPS",
        });
      }

      const updated = await updateAttendanceCheckOutRepository(null, {
        id: todayAttendance.id,
        check_out_lat: lat,
        check_out_lng: lng,
        check_out_location: cleanLocation,
        check_out_time: punchDate.toISOString(),
        check_out_accuracy: acc,
        check_out_distance: distanceInMeters !== null ? Math.round(distanceInMeters * 100) / 100 : null,
        verification_method: "GPS",
      });
      results.push({ action: "check-out", attendance: updated });
    }
  }

  return {
    success: true,
    processed_count: results.length,
    results,
  };
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

/**
 * Helper to convert a date string (YYYY-MM-DD) and time input ("HH:mm" or ISO string)
 * into a valid ISO-8601 timestamp in Asia/Kolkata (+05:30).
 */
const parseDateAndTimeToISO = (dateStr, timeValue) => {
  if (timeValue === null || timeValue === undefined || String(timeValue).trim() === "") {
    return null;
  }
  const trimmed = String(timeValue).trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const timeWithSec = trimmed.length === 5 ? `${trimmed}:00` : trimmed;
    const parsed = new Date(`${dateStr}T${timeWithSec}+05:30`);
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiError(400, `Invalid time value: ${trimmed}`);
    }
    return parsed.toISOString();
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `Invalid timestamp value: ${trimmed}`);
  }
  return parsed.toISOString();
};

/**
 * Calculate whether a given check-in timestamp is LATE or PRESENT based on employee shift
 */
const computeShiftStatusForTimestamp = (checkInIso, employee) => {
  if (!checkInIso) return "PRESENT";
  try {
    const dt = new Date(checkInIso);
    const istFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = istFormatter.formatToParts(dt);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    const weekday = getPart("weekday");
    let hour = parseInt(getPart("hour"), 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(getPart("minute"), 10);
    const checkInMins = hour * 60 + minute;

    let expectedMins = 10 * 60; // Mon-Fri 10:00 AM
    if (weekday === "Sat" || weekday === "Sun") {
      expectedMins = 9 * 60 + 30; // Sat & Sun 9:30 AM
    }

    if (employee?.shift_timing_type === "CUSTOM") {
      let customStart = employee.shift_start_time || "10:00";
      const customTimings =
        typeof employee.custom_shift_timings === "string"
          ? (() => {
              try {
                return JSON.parse(employee.custom_shift_timings);
              } catch {
                return null;
              }
            })()
          : employee.custom_shift_timings;

      if (weekday === "Sat" && customTimings?.sat_start) {
        customStart = customTimings.sat_start;
      } else if (weekday === "Sun" && customTimings?.sun_start) {
        customStart = customTimings.sun_start;
      } else if (customTimings?.mon_fri_start) {
        customStart = customTimings.mon_fri_start;
      }

      const [customHour, customMinute] = String(customStart).split(":").map(Number);
      if (!Number.isNaN(customHour) && !Number.isNaN(customMinute)) {
        expectedMins = customHour * 60 + customMinute;
      }
    }

    return checkInMins > expectedMins ? "LATE" : "PRESENT";
  } catch {
    return "PRESENT";
  }
};

/**
 * Allows HR, Admin, and Super Admin to manually mark an employee's attendance
 * or edit their check-in / check-out times and status.
 */
export const upsertEmployeeAttendanceByHRService = async (payload = {}, currentUser, req) => {
  const actorRole = String(currentUser?.role || "").toUpperCase();
  if (!["HR", "ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
    throw new ApiError(403, "Only HR or an administrator can mark or edit employee attendance.");
  }

  const employeeId = Number(payload.employee_id || payload.employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    throw new ApiError(400, "A valid employee ID is required.");
  }

  const employee = await findEmployeeByIdForAttendanceRepository(employeeId);
  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  const todayIst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const targetDate = String(payload.date || todayIst).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new ApiError(400, "Date must be in YYYY-MM-DD format.");
  }

  const requestedStatus = String(payload.status || "AUTO").trim().toUpperCase();
  const allowedStatuses = new Set(["AUTO", "PRESENT", "LATE", "HALF_DAY", "ABSENT", "ON_LEAVE", "WEEK_OFF"]);
  if (!allowedStatuses.has(requestedStatus)) {
    throw new ApiError(400, "Invalid attendance status.");
  }

  let checkInIso = parseDateAndTimeToISO(targetDate, payload.check_in_time);
  let checkOutIso = parseDateAndTimeToISO(targetDate, payload.check_out_time);

  if (requestedStatus === "ABSENT" || requestedStatus === "ON_LEAVE" || requestedStatus === "WEEK_OFF") {
    if (!payload.keep_times) {
      checkInIso = null;
      checkOutIso = null;
    }
  } else if (!checkInIso) {
    // If HR marks PRESENT / LATE / HALF_DAY / AUTO without typing a time, default to shift start time (or 10:00)
    const defaultShiftStart = employee.shift_start_time || "10:00";
    checkInIso = parseDateAndTimeToISO(targetDate, defaultShiftStart);
  }

  if (checkOutIso && !checkInIso) {
    throw new ApiError(400, "Check-in time is required when setting a check-out time.");
  }

  let totalHours = 0;
  if (checkInIso && checkOutIso) {
    const inMs = new Date(checkInIso).getTime();
    const outMs = new Date(checkOutIso).getTime();
    if (outMs <= inMs) {
      throw new ApiError(400, "Check-out time must be later than check-in time.");
    }
    totalHours = Number(((outMs - inMs) / 3600000).toFixed(2));
  }

  const finalStatus =
    requestedStatus === "AUTO"
      ? computeShiftStatusForTimestamp(checkInIso, employee)
      : requestedStatus;

  const locationLabel = "Dizital Adda Office Premises";

  return await upsertEmployeeAttendanceByHRRepository({
    employee_id: employeeId,
    date: targetDate,
    check_in_time: checkInIso,
    check_out_time: checkOutIso,
    status: finalStatus,
    total_hours: totalHours,
    ip_address: getClientIp(req || { headers: {} }),
    location_label: locationLabel,
  });
};

export const getAttendanceSettingsService = async (req = null) => {
  const settings = await getOfficeSettings();
  let clientIp = "127.0.0.1";
  let isOfficeWifi = false;
  if (req) {
    const verified = await verifyOfficeIP(req);
    clientIp = verified.clientIp;
    isOfficeWifi = verified.isOfficeWifi;
  }
  const ips = await getWhitelistedIPsRepository();
  return {
    ...settings,
    client_ip: clientIp,
    is_office_ip: isOfficeWifi,
    office_ips: ips || [],
  };
};

export const updateAttendanceSettingsService = async (payload = {}, currentUser, req = null) => {
  const isAuthorized = ["HR", "ADMIN", "SUPER_ADMIN"].includes(currentUser.role);
  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to edit attendance settings.");
  }

  const { office_lat, office_lng, office_radius, office_ips } = payload;

  if (office_lat !== undefined && office_lat !== null) {
    const lat = Number(office_lat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new ApiError(400, "Invalid office latitude (must be between -90 and 90).");
    }
    await upsertAttendanceSettingRepository("office_lat", lat, "Office Latitude Coordinate");
  }

  if (office_lng !== undefined && office_lng !== null) {
    const lng = Number(office_lng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new ApiError(400, "Invalid office longitude (must be between -180 and 180).");
    }
    await upsertAttendanceSettingRepository("office_lng", lng, "Office Longitude Coordinate");
  }

  if (office_radius !== undefined && office_radius !== null) {
    const rad = Number(office_radius);
    if (!Number.isFinite(rad) || rad <= 0 || rad > 10000) {
      throw new ApiError(400, "Invalid office radius (must be between 1 and 10000 meters).");
    }
    await upsertAttendanceSettingRepository("office_radius", rad, "Office Geofence Radius in Meters");
  }

  if (Array.isArray(office_ips)) {
    for (const ipItem of office_ips) {
      const ip = typeof ipItem === "string" ? ipItem : ipItem?.ip_address;
      const label = typeof ipItem === "object" ? ipItem?.label : "Office Wi-Fi";
      if (ip && typeof ip === "string" && ip.trim()) {
        await addWhitelistedIPRepository(ip.trim(), label || "Office Wi-Fi");
      }
    }
  }

  auditLogger({
    action: "UPDATE_GEOFENCE_SETTINGS",
    module: "SETTINGS",
    userId: currentUser?.id,
    userName: currentUser?.full_name,
    userEmail: currentUser?.email,
    role: currentUser?.role,
    description: `${currentUser?.full_name || "Admin"} updated office geofence & IP settings`,
    details: payload,
  });

  return await getAttendanceSettingsService(req);
};

export const getEmployeeAttendanceQuotaSummaryService = async (employeeId, targetDate, currentUser) => {
  const isAuthorized = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "TL"].includes(currentUser.role);
  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to view employee attendance quota summary.");
  }

  const employee = await findEmployeeByIdForAttendanceRepository(employeeId);
  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  return await getEmployeeAttendanceQuotaSummaryRepository(employeeId, targetDate);
};


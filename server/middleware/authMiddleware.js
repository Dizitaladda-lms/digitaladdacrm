import crypto from "crypto";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { findUserByIdRepository } from "../repositories/authRepository.js";
import {
  approveUserDeviceRepository,
  findApprovedUserDeviceRepository,
  updateDeviceLastSeenRepository,
} from "../repositories/deviceRepository.js";
import {
  DEVICE_ID_PATTERN,
  getDeviceName,
  getDeviceType,
  setDeviceCookie,
} from "../utils/deviceBinding.js";

const resolveSafeDeviceId = (req) => {
  const headerId = String(req.get?.("x-device-id") || "").trim();
  if (DEVICE_ID_PATTERN.test(headerId)) return headerId.toLowerCase();
  const cookieId = String(req.cookies?.deviceId || "").trim();
  if (DEVICE_ID_PATTERN.test(cookieId)) return cookieId.toLowerCase();
  const seed = `${req.get?.("user-agent") || ""}|${req.ip || "local"}`;
  const hex = crypto.createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

/**
 * =====================================================
 * Authentication Middleware
 * Project : DIZITALADDA CRM
 * Supports both httpOnly cookies (`accessToken`) and Bearer Authorization headers
 * =====================================================
 */
const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check httpOnly Cookie (`accessToken`)
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.cookie) {
      // Fallback manual parsing if cookie-parser missed it
      const match = req.headers.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    // 2. Fallback to Authorization Header ("Bearer <token>")
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          "Authorization token is required."
        )
      );
    }

    /**
     * Verify JWT
     */
    const decoded = verifyAccessToken(token);
    const deviceId = resolveSafeDeviceId(req);
    const userAgent = String(req.get("user-agent") || "");
    const deviceType = getDeviceType(userAgent, req);

    /**
     * Check User Exists & Device Approval in Parallel
     */
    const [user, device] = await Promise.all([
      findUserByIdRepository(decoded.id),
      findApprovedUserDeviceRepository(decoded.id, deviceId),
    ]);

    if (!user) {
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, "User not found.")
      );
    }

    /**
     * Check Account Is Active
     */
    if (!user.is_active) {
      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          "Your account has been deactivated. Please contact an administrator."
        )
      );
    }

    /**
     * Check Account Is Not Deleted
     */
    if (user.is_deleted) {
      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          "This account no longer exists."
        )
      );
    }

    if (!device || device.device_type !== deviceType) {
      await approveUserDeviceRepository(null, {
        userId: user.id,
        deviceId,
        deviceType,
        deviceName: getDeviceName(req, deviceType),
        userAgent,
        ipAddress: req.ip,
      }).catch(() => {});
    } else {
      await updateDeviceLastSeenRepository(user.id, deviceId).catch(() => {});
    }
    setDeviceCookie(res, deviceId);

    /**
     * Attach Safe User Object
     */
    req.user = {
      id: user.id,
      device_id: deviceId,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      lead_overview_read_only: Boolean(user.lead_overview_read_only),
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, "Token has expired.")
      );
    }

    if (error.name === "JsonWebTokenError") {
      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          "Invalid authentication token."
        )
      );
    }

    return next(error);
  }
};

export default authMiddleware;
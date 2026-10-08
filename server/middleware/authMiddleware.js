import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { findUserByIdRepository } from "../repositories/authRepository.js";
import { findApprovedUserDeviceRepository, updateDeviceLastSeenRepository } from "../repositories/deviceRepository.js";
import {
  assertDeviceCookieMatches,
  getDeviceId,
  getDeviceType,
  setDeviceCookie,
} from "../utils/deviceBinding.js";

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
    const deviceId = getDeviceId(req);
    assertDeviceCookieMatches(req, deviceId);
    const deviceType = getDeviceType(String(req.get("user-agent") || ""));

    /**
     * Check User Exists
     */
    const user = await findUserByIdRepository(decoded.id);

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

    const device = await findApprovedUserDeviceRepository(user.id, deviceId);
    if (!device || device.device_type !== deviceType) {
      return next(new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "This device is not approved. Contact HR or an administrator."
      ));
    }
    await updateDeviceLastSeenRepository(user.id, deviceId);
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
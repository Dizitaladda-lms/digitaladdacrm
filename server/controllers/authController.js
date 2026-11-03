import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

import {
  registerUserService,
  loginUserService,
} from "../services/authService.js";

import {
  getProfileService,
  getProfileImageService,
  updateOwnProfileService,
  changePasswordService,
} from "../services/authService.js";

import {
  forgotPasswordService,
  resetPasswordService,
} from "../services/authService.js";

import {
  refreshTokenRotationService,
  logoutUserService,
  logoutAllUserDevicesService,
  verifyEmailService,
} from "../services/authService.js";

import pool from "../config/db.js";
import crypto from "crypto";
import {
  clearAuthCookies,
  setAuthCookies,
} from "../utils/authCookies.js";
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
 * Register User
 */
export const register = asyncHandler(async (req, res) => {
  const user = await registerUserService(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registered successfully."));
});

/**
 * Login User
 * Sets HttpOnly cookies. Refresh tokens must never be exposed in JSON.
 */
export const login = asyncHandler(async (req, res) => {
  const identifier = req.body?.email || req.body?.phone || req.body?.identifier;
  const { password } = req.body;
  if (process.env.AUTH_DIAGNOSTICS === "true") {
    console.info("Authentication login request received.", {
      event: "auth.login.request",
      hasEmail: Boolean(req.body?.email),
      hasPhone: Boolean(req.body?.phone),
      hasIdentifier: Boolean(req.body?.identifier),
      hasPassword: Boolean(password),
    });
  }
  const userAgent = String(req.get("user-agent") || "");
  const deviceId = resolveSafeDeviceId(req);
  const deviceType = getDeviceType(userAgent, req);

  const result = await loginUserService(identifier, password, {
    deviceId,
    deviceType,
    deviceName: getDeviceName(req, deviceType),
    userAgent,
    ipAddress: req.ip,
  });

  setAuthCookies(res, result.accessToken, result.refreshToken);
  setDeviceCookie(res, deviceId);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: result.user,
      },
      "Login successful."
    )
  );
});

/**
 * Get Logged In User Profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await getProfileService(req.user.id);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile fetched successfully."));
});

export const getProfileImage = asyncHandler(async (req, res) => {
  const profileImage = await getProfileImageService(req.user.id);
  res.set("Cache-Control", "private, max-age=300");
  return res
    .status(200)
    .json(new ApiResponse(200, { profile_image: profileImage }, "Profile image fetched successfully."));
});

/**
 * Change Password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await changePasswordService(
    req.user.id,
    currentPassword,
    newPassword
  );

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Password changed successfully."));
});

/**
 * Forgot Password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await forgotPasswordService(email);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        "If the account exists, a password reset link has been sent."
      )
    );
});

/**
 * Reset Password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await resetPasswordService(token, newPassword);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Password reset successfully."));
});

const getRefreshToken = (req) => {
  const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME?.trim() || "refreshToken";
  return req.cookies?.[cookieName] || null;
};

/**
 * Refresh Access Token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenCookie = getRefreshToken(req);
  const userAgent = String(req.get("user-agent") || "");
  const deviceId = resolveSafeDeviceId(req);
  const deviceType = getDeviceType(userAgent, req);

  if (!refreshTokenCookie) {
    throw new ApiError(401, "No refresh token provided.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await refreshTokenRotationService(
      refreshTokenCookie,
      client,
      {
        deviceId,
        deviceType,
        deviceName: getDeviceName(req, deviceType),
        userAgent,
        ipAddress: req.ip,
      }
    );
    await client.query("COMMIT");

    if (result.reuseDetected) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Refresh token reuse detected. Please sign in again.",
      });
    }

    setAuthCookies(res, result.accessToken, result.refreshToken);
    setDeviceCookie(res, deviceId);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          success: true,
          deviceId,
        },
        "Access token refreshed successfully."
      )
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

/**
 * Logout User
 */
export const logout = asyncHandler(async (req, res) => {
  const refreshTokenCookie = getRefreshToken(req);
  const deviceId = String(req.get("x-device-id") || "").trim().toLowerCase();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await logoutUserService(refreshTokenCookie, client, deviceId);
    await client.query("COMMIT");

    clearAuthCookies(res);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Logout successful."));
  } catch (error) {
    await client.query("ROLLBACK");
    clearAuthCookies(res);
    throw error;
  } finally {
    client.release();
  }
});

export const logoutAllDevices = asyncHandler(async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await logoutAllUserDevicesService(req.user.id, client);
    await client.query("COMMIT");
    clearAuthCookies(res);
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Signed out from all devices."));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

/**
 * Verify Email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await verifyEmailService(client, req.user.id);
    await client.query("COMMIT");
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Email verified successfully."));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateOwnProfileService(req.user.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully."));
});

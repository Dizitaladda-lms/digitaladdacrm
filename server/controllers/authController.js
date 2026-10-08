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
import ms from "ms";
import {
  assertDeviceCookieMatches,
  getDeviceId,
  getDeviceName,
  getDeviceType,
  setDeviceCookie,
} from "../utils/deviceBinding.js";

const ACCESS_TOKEN_MAX_AGE_MS = ms(process.env.JWT_EXPIRES_IN || "15m");
const REFRESH_TOKEN_MAX_AGE_MS = ms(process.env.JWT_REFRESH_EXPIRES_IN || "30d");

const baseCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: "/api/auth",
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", { ...baseCookieOptions, path: "/" });
  res.clearCookie("refreshToken", { ...baseCookieOptions, path: "/api/auth" });
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
 * Sets HttpOnly cookies. Tokens are never exposed to browser JavaScript.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userAgent = String(req.get("user-agent") || "");
  const deviceId = getDeviceId(req);
  assertDeviceCookieMatches(req, deviceId);

  const result = await loginUserService(email, password, {
    deviceId,
    deviceType: getDeviceType(userAgent),
    deviceName: getDeviceName(req, getDeviceType(userAgent)),
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
        accessToken: result.accessToken,
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
  if (req.cookies?.refreshToken) return req.cookies.refreshToken;
  if (req.headers?.cookie) {
    const match = req.headers.cookie.match(/(?:^|[;,]\s*)refreshToken=([^;,]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
};

/**
 * Refresh Access Token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenCookie = getRefreshToken(req);
  const userAgent = String(req.get("user-agent") || "");
  const deviceId = getDeviceId(req);
  assertDeviceCookieMatches(req, deviceId);
  const deviceType = getDeviceType(userAgent);

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

    setAuthCookies(res, result.accessToken, result.refreshToken);
    setDeviceCookie(res, deviceId);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          success: true,
          accessToken: result.accessToken,
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

import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import crypto from "crypto";
import ms from "ms";

import ApiError from "../utils/ApiError.js";

import ROLES from "../constants/roles.js";

import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt.js";

import {
  createPasswordResetRepository,
  findPasswordResetRepository,
  markPasswordResetUsedRepository,
  deleteUserPasswordResetRepository,
} from "../repositories/passwordResetRepository.js";

import {
  deleteAllRefreshTokensRepository,
} from "../repositories/refreshTokenRepository.js";

import {
  findRefreshTokenRepository,
  createRefreshTokenRepository,
  deleteRefreshTokenRepository,
} from "../repositories/refreshTokenRepository.js";


import {
  createUserRepository,
  findUserByEmailRepository,
  findUserByEmailWithPasswordRepository,
  updateLastLoginRepository,
  findUserByIdRepository,
  findUserProfileImageRepository,
  updatePasswordRepository,
  updateEmailVerificationRepository,
  updateOwnProfileRepository,
} from "../repositories/authRepository.js";

import auditLogger from "../utils/auditLogger.js";
import { verifyStoredPassword } from "../utils/passwordUtils.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import { createAttendanceCheckInRepository } from "../repositories/attendanceRepository.js";
import { prepareProfileImageDataUrl } from "../utils/profileImage.js";
import {
  DEVICE_ID_PATTERN,
  getDeviceType,
} from "../utils/deviceBinding.js";
import {
  approveUserDeviceRepository,
  findApprovedDeviceSlotRepository,
  findApprovedUserDeviceRepository,
  findUserDeviceRepository,
  lockUserDeviceSlots,
  recordBlockedDeviceAttemptRepository,
  touchUserDeviceRepository,
  updateDeviceLastSeenRepository,
} from "../repositories/deviceRepository.js";
import { revokeDeviceRefreshTokensRepository } from "../repositories/refreshTokenRepository.js";

/**
 * =====================================================
 * Register User
 * (unchanged — see prior audit notes)
 * =====================================================
 */
export const registerUserService = async (
  userData
) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
    throw new ApiError(403, "Public registration is disabled. Contact an administrator.");
  }

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const existingUser =
      await findUserByEmailRepository(
        userData.email
      );

    if (existingUser) {

      throw new ApiError(
        409,
        "Email already exists."
      );

    }

    const hashedPassword =
      await bcrypt.hash(
        userData.password,
        10
      );

    const user =
      await createUserRepository(
        client,
        {
          full_name: userData.full_name,
          email: userData.email,
          password: hashedPassword,
          role: ROLES.COUNSELLOR,
        }
      );

    auditLogger({
      action: "USER_REGISTERED",
      module: "AUTH",
      userId: user.id,
      role: user.role,
      entityId: user.id,
    });

    await client.query("COMMIT");

    return user;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Login User
 *
 * BUG FIX (blocks the refresh flow entirely, cookies or
 * not — found while wiring up cookie-based token storage):
 * This generated a refresh token via generateRefreshToken()
 * but never persisted it via createRefreshTokenRepository,
 * unlike refreshTokenRotationService which does both. Any
 * refresh attempt using a token issued at login would fail
 * with "Invalid refresh token" because findRefreshTokenRepository
 * would find no matching row. Now wrapped in a transaction
 * that inserts the refresh token row, matching the pattern
 * refreshTokenRotationService already uses (7-day expiry).
 * =====================================================
 */
export const loginUserService = async (
  email,
  password,
  device
) => {

  const user =
    await findUserByEmailWithPasswordRepository(
      email
    );

  if (!user) {

    throw new ApiError(
      401,
      "Invalid email or password."
    );

  }

  const isPasswordPlainText =
    typeof user.password === "string" &&
    !user.password.startsWith("$2");

  const isPasswordCorrect = await verifyStoredPassword(password, user.password);

  if (!isPasswordCorrect) {
    throw new ApiError(
      401,
      "Invalid email or password."
    );
  }

  if (!device?.deviceId || !DEVICE_ID_PATTERN.test(device.deviceId)) {
    throw new ApiError(400, "Device identity is missing or invalid. Refresh the page and try again.");
  }

  if (isPasswordPlainText) {
    const upgradeClient = await pool.connect();
    try {
      await upgradeClient.query("BEGIN");
      const hashedPassword = await bcrypt.hash(password, 10);
      await updatePasswordRepository(
        upgradeClient,
        user.id,
        hashedPassword
      );
      await upgradeClient.query("COMMIT");
    } catch (error) {
      await upgradeClient.query("ROLLBACK");
      // Intentionally not logging error details here beyond
      // this point - see audit notes on removed debug logging.
    } finally {
      upgradeClient.release();
    }
  }

  let accessToken;
  let refreshToken;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockUserDeviceSlots(client, user.id);
    const existing = await findUserDeviceRepository(client, user.id, device.deviceId);

    if (existing && (existing.status !== "approved" || existing.device_type !== device.deviceType)) {
      const blockedError = new ApiError(403, "This device is revoked or registered as a different device type. Contact an administrator.");
      blockedError.code = "DEVICE_SLOT_CONFLICT";
      throw blockedError;
    }
    if (!existing) {
      const occupied = await findApprovedDeviceSlotRepository(client, user.id, device.deviceType);
      if (occupied) {
        const blockedError = new ApiError(
          403,
          `Is account me ${device.deviceType} pehle se registered hai. Naye device ke liye admin se contact karo.`
        );
        blockedError.code = "DEVICE_SLOT_CONFLICT";
        throw blockedError;
      }
      await approveUserDeviceRepository(client, {
        userId: user.id,
        ...device,
      });
    }

    await touchUserDeviceRepository(client, user.id, device.deviceId, device);
    await updateLastLoginRepository(user.id, client);

    const expiresAt = new Date(
      Date.now() + ms(process.env.JWT_REFRESH_EXPIRES_IN || "30d")
    );
    accessToken = generateAccessToken(user);
    refreshToken = generateRefreshToken(user);

    await createRefreshTokenRepository(
      client,
      user.id,
      refreshToken,
      expiresAt,
      device.deviceId
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "DEVICE_SLOT_CONFLICT") {
      await recordBlockedDeviceAttemptRepository({
        userId: user.id,
        ...device,
      });
    }
    throw error;
  } finally {
    client.release();
  }

  delete user.password;

  auditLogger({
    action: "USER_LOGIN",
    module: "AUTH",
    userId: user.id,
    role: user.role,
    entityId: user.id,
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};
/**
 * =====================================================
 * Get Profile
 * =====================================================
 */
export const getProfileService = async (
  userId
) => {

  const user =
    await findUserByIdRepository(userId);

  if (!user) {

    throw new ApiError(
      404,
      "User not found."
    );

  }

  if (user.is_deleted) {

    throw new ApiError(
      403,
      "User account has been deleted."
    );

  }

  if (!user.is_active) {

    throw new ApiError(
      403,
      "User account is inactive."
    );

  }

  return user;

};

export const getProfileImageService = async (userId) => {
  const user = await findUserProfileImageRepository(userId);
  if (!user) throw new ApiError(404, "User not found.");
  return user.profile_image || null;
};

/**
 * =====================================================
 * Change Password
 * =====================================================
 */
export const changePasswordService = async (
  userId,
  currentPassword,
  newPassword
) => {

  const client =
    await pool.connect();

  try {

    await client.query("BEGIN");

    const user =
      await findUserByIdRepository(userId);

    if (!user) {

      throw new ApiError(
        404,
        "User not found."
      );

    }

    const loginUser =
      await findUserByEmailWithPasswordRepository(
        user.email
      );

    const isPasswordCorrect = await verifyStoredPassword(
      currentPassword,
      loginUser.password
    );

    if (!isPasswordCorrect) {

      throw new ApiError(
        401,
        "Current password is incorrect."
      );

    }

    const isSamePassword = await verifyStoredPassword(
      newPassword,
      loginUser.password
    );

    if (isSamePassword) {

      throw new ApiError(
        400,
        "New password cannot be the same as the current password."
      );

    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    const updatedUser =
      await updatePasswordRepository(
        client,
        userId,
        hashedPassword
      );

    // Password-change events are confidential. Notify Super Admins without
    // storing any password, hash, or other credential material.
    if (String(user.role).toUpperCase() === ROLES.COUNSELLOR) {
      await client.query(
        `
          INSERT INTO user_notifications
            (user_id, actor_user_id, type, category, title, message, link, priority)
          SELECT
            id,
            $1,
            'COUNSELLOR_PASSWORD_CHANGED',
            'SECURITY',
            'Counsellor password changed',
            $2,
            '/employees',
            'WARNING'
          FROM users
          WHERE role = 'SUPER_ADMIN'
            AND is_active = TRUE
            AND is_deleted = FALSE;
        `,
        [userId, `${user.full_name} changed their account password.`]
      );
    }

    auditLogger({
      action: "PASSWORD_CHANGED",
      module: "AUTH",
      userId: userId,
      role: user.role,
      entityId: userId,
    });

    await client.query("COMMIT");

    return updatedUser;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Forgot Password
 * (unchanged — see prior audit notes; still a stopgap
 * pending the email service)
 * =====================================================
 */
export const forgotPasswordService = async (
  email
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const user =
      await findUserByEmailRepository(email);

    if (!user) {

      await client.query("COMMIT");

      return {
        message:
          "If an account exists, a password reset link has been sent."
      };

    }

    await deleteUserPasswordResetRepository(
      client,
      user.id
    );

    const plainToken =
      crypto.randomBytes(32).toString("hex");

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(plainToken)
        .digest("hex");

    const expiresAt =
      new Date(
        Date.now() + 15 * 60 * 1000
      );

    await createPasswordResetRepository(

      client,

      user.id,

      hashedToken,

      expiresAt

    );

    auditLogger({
      action: "PASSWORD_RESET_REQUESTED",
      module: "AUTH",
      userId: user.id,
      role: user.role,
      entityId: user.id,
    });

    await client.query("COMMIT");

    if (process.env.NODE_ENV !== "production") {

      return {
        message:
          "If an account exists, a password reset link has been sent.",
        resetToken: plainToken,
        expiresAt,
      };

    }

    return {
      message:
        "If an account exists, a password reset link has been sent.",
    };

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Reset Password
 * =====================================================
 */
export const resetPasswordService = async (

  token,

  newPassword

) => {

  const client =
    await pool.connect();

  try {

    await client.query("BEGIN");

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const reset =
      await findPasswordResetRepository(
        hashedToken
      );

    if (!reset) {

      throw new ApiError(
        400,
        "Invalid reset token."
      );

    }

    if (
      new Date(reset.expires_at) <
      new Date()
    ) {

      throw new ApiError(
        400,
        "Reset token has expired."
      );

    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    await updatePasswordRepository(

      client,

      reset.user_id,

      hashedPassword

    );

    await markPasswordResetUsedRepository(

      client,

      reset.id

    );

    await deleteAllRefreshTokensRepository(

      client,

      reset.user_id

    );

    auditLogger({
      action: "PASSWORD_RESET_COMPLETED",
      module: "AUTH",
      userId: reset.user_id,
      role: null,
      entityId: reset.user_id,
    });

    await client.query("COMMIT");

    return {

      success: true,

      message:
        "Password reset successfully.",

    };

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Logout User
 * (unchanged — still takes refreshToken + client;
 * authController.js now passes the value read from the
 * cookie instead of req.body)
 * =====================================================
 */
export const logoutUserService = async (
  refreshToken,
  client,
  deviceId
) => {
  if (!refreshToken) {
    return {
      success: true,
      message: "User logged out successfully.",
    };
  }

  const token =
    await findRefreshTokenRepository(
      refreshToken,
      client
    );

  if (!token) {

    return {
      success: true,
      message: "User logged out successfully.",
    };
  }
  if (token.device_id !== deviceId) {
    throw new ApiError(403, "This session belongs to a different device.");
  }

  await deleteRefreshTokenRepository(
    client,
    refreshToken
  );

  return {

    success: true,

    message: "User logged out successfully.",

  };

};

export const logoutAllUserDevicesService = async (userId, client) => {
  await deleteAllRefreshTokensRepository(client, userId);
  return {
    success: true,
    message: "Signed out from all devices.",
  };
};

/**
 * =====================================================
 * Refresh Token Rotation
 * (unchanged — already persists correctly; this is the
 * pattern loginUserService was missing)
 * =====================================================
 */
export const refreshTokenRotationService =
async (
  refreshToken,
  client,
  device
) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const storedToken =
    await findRefreshTokenRepository(
      refreshToken,
      client
    );

  if (!storedToken) {

    throw new ApiError(
      401,
      "Invalid refresh token."
    );

  }
  if (storedToken.device_id !== device.deviceId) {
    await recordBlockedDeviceAttemptRepository({
      userId: decoded.id,
      ...device,
    });
    throw new ApiError(401, "This refresh token is bound to another device.");
  }

  const user =
    await findUserByIdRepository(
      decoded.id
    );

  if (!user) {

    throw new ApiError(
      401,
      "User not found."
    );

  }

  if (!user.is_active || user.is_deleted) {
    throw new ApiError(401, "This account cannot refresh its session.");
  }

  const approvedDevice = await findApprovedUserDeviceRepository(
    user.id,
    device.deviceId,
    client
  );
  if (!approvedDevice || approvedDevice.device_type !== device.deviceType) {
    await recordBlockedDeviceAttemptRepository({
      userId: user.id,
      ...device,
    });
    throw new ApiError(403, "This device is not approved. Contact an administrator.");
  }

  await updateDeviceLastSeenRepository(user.id, device.deviceId, client);
  await deleteRefreshTokenRepository(
    client,
    refreshToken
  );

  const newAccessToken =
    generateAccessToken(user);

  const newRefreshToken =
    generateRefreshToken(user);

  const expiresAt =
    new Date(
      Date.now() +
      ms(process.env.JWT_REFRESH_EXPIRES_IN || "30d")
    );

  await createRefreshTokenRepository(

    client,

    user.id,

    newRefreshToken,
    expiresAt,
    device.deviceId

  );

  return {

    accessToken:
      newAccessToken,

    refreshToken:
      newRefreshToken,

  };

};

/**
 * =====================================================
 * Verify Email
 * =====================================================
 */
export const verifyEmailService =
async (
  client,
  userId
) => {

  const user =
    await findUserByIdRepository(
      userId
    );

  if (!user) {

    throw new ApiError(
      404,
      "User not found."
    );

  }

  if (user.email_verified) {

    return {

      success: true,

      message:
        "Email already verified.",

    };

  }

  await updateEmailVerificationRepository(

    client,

    userId

  );

  return {

    success: true,

    message:
      "Email verified successfully.",

  };

};

export const updateOwnProfileService = async (userId, profile) => {
  const profileImage = Object.hasOwn(profile, "profile_image")
    ? await prepareProfileImageDataUrl(profile.profile_image)
    : undefined;
  const user = await updateOwnProfileRepository(userId, {
    full_name: profile.full_name?.trim(),
    ...(profileImage !== undefined && { profile_image: profileImage }),
    designation: profile.designation?.trim() || null,
  });

  if (!user) throw new ApiError(404, "User not found.");

  return user;
};

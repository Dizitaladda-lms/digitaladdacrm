import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import crypto from "crypto";

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
  updatePasswordRepository,
  updateEmailVerificationRepository,
  updateOwnProfileRepository,
} from "../repositories/authRepository.js";

import auditLogger from "../utils/auditLogger.js";
import { verifyStoredPassword } from "../utils/passwordUtils.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import { createAttendanceCheckInRepository } from "../repositories/attendanceRepository.js";

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
  password
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

  await updateLastLoginRepository(user.id);

  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken(user);

  // NEW: persist the refresh token so a later refresh/logout can find it.
  // 7-day expiry matches refreshTokenRotationService's existing convention.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await createRefreshTokenRepository(
      client,
      user.id,
      refreshToken,
      expiresAt
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
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
  client
) => {

  const token =
    await findRefreshTokenRepository(
      refreshToken
    );

  if (!token) {

    return {
      success: true,
      message: "User logged out successfully.",
    };

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
  client
) => {

  const storedToken =
    await findRefreshTokenRepository(
      refreshToken
    );

  if (!storedToken) {

    throw new ApiError(
      401,
      "Invalid refresh token."
    );

  }

  const decoded =
    verifyRefreshToken(
      refreshToken
    );

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
      7 * 24 * 60 * 60 * 1000
    );

  await createRefreshTokenRepository(

    client,

    user.id,

    newRefreshToken,

    expiresAt

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
  const user = await updateOwnProfileRepository(userId, {
    full_name: profile.full_name?.trim(),
    profile_image: profile.profile_image || null,
    designation: profile.designation?.trim() || null,
  });

  if (!user) throw new ApiError(404, "User not found.");

  return user;
};

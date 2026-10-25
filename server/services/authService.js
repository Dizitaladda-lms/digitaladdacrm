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
  findUsersByIdentifierWithPasswordRepository,
  updateLastLoginRepository,
  findUserByIdRepository,
  findUserProfileImageRepository,
  updatePasswordRepository,
  updateEmailVerificationRepository,
  updateOwnProfileRepository,
} from "../repositories/authRepository.js";

import auditLogger from "../utils/auditLogger.js";
import {
  verifyStoredPassword,
  verifyPasswordWithRehashCheck,
  hashSecurePassword,
  runDummyPasswordWork,
} from "../utils/passwordUtils.js";
import { validatePasswordPolicy } from "../utils/passwordPolicy.js";
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

    const policy = await validatePasswordPolicy(userData.password);
    if (!policy.valid) {
      throw new ApiError(400, policy.message);
    }

    const hashedPassword = await hashSecurePassword(userData.password);

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
 * =====================================================
 */
export const loginUserService = async (
  email,
  password,
  device
) => {
  let candidates = [];
  if (typeof findUsersByIdentifierWithPasswordRepository === "function") {
    const found = await findUsersByIdentifierWithPasswordRepository(email);
    if (Array.isArray(found) && found.length > 0) {
      candidates = found;
    }
  }
  if (candidates.length === 0) {
    const single = await findUserByEmailWithPasswordRepository(email);
    if (single) candidates = [single];
  }

  if (candidates.length === 0) {
    await runDummyPasswordWork();
    throw new ApiError(
      401,
      "Invalid email or password."
    );
  }

  // Check account lockout
  for (const candidate of candidates) {
    if (candidate.lockout_until && new Date(candidate.lockout_until) > new Date()) {
      const waitSeconds = Math.max(1, Math.ceil((new Date(candidate.lockout_until) - new Date()) / 1000));
      throw new ApiError(
        429,
        `Account is temporarily locked due to repeated failed login attempts. Try again in ${waitSeconds} seconds.`
      );
    }
  }

  let matchedUser = null;
  let matchedNeedsRehash = false;
  for (const candidate of candidates) {
    const { isValid, needsRehash } = await verifyPasswordWithRehashCheck(password, candidate.password);
    if (isValid) {
      matchedUser = candidate;
      matchedNeedsRehash = needsRehash;
      break;
    }
  }

  if (!matchedUser) {
    for (const candidate of candidates) {
      if (candidate.id) {
        const nextAttempts = (Number(candidate.failed_login_attempts) || 0) + 1;
        const lockoutTime = nextAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await pool.query(
          `UPDATE users SET failed_login_attempts = $1, lockout_until = $2 WHERE id = $3;`,
          [nextAttempts, lockoutTime, candidate.id]
        ).catch(() => {});
      }
    }
    throw new ApiError(
      401,
      "Invalid email or password."
    );
  }

  const user = matchedUser;

  // Clear failed login attempts & lockout on valid password match
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = $1;`,
    [user.id]
  ).catch(() => {});

  // Auto-heal user active/deleted flags if linked to an ACTIVE employee record
  const hasActiveEmployeeRecord =
    Boolean(user.employee_id) &&
    !user.employee_is_deleted &&
    String(user.employee_status || "ACTIVE").toUpperCase() === "ACTIVE";

  if (hasActiveEmployeeRecord && (!user.is_active || user.is_deleted)) {
    user.is_active = true;
    user.is_deleted = false;
    await pool
      .query(
        `UPDATE users SET is_active = TRUE, is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [user.id]
      )
      .catch(() => {});
  }

  if (hasActiveEmployeeRecord && !user.employee_user_id) {
    await pool
      .query(
        `UPDATE employees SET user_id = $1 WHERE id = $2 AND user_id IS NULL;`,
        [user.id, user.employee_id]
      )
      .catch(() => {});
  }

  if (!user.is_active) {
    throw new ApiError(
      403,
      "Your account has been deactivated. Please contact HR or an administrator."
    );
  }

  if (!device?.deviceId || !DEVICE_ID_PATTERN.test(device.deviceId)) {
    throw new ApiError(400, "Device identity is missing or invalid. Refresh the page and try again.");
  }

  // Automatic Rehash / Upgrade to Modern Argon2id / Peppered Bcrypt
  if (matchedNeedsRehash) {
    const upgradeClient = await pool.connect();
    try {
      await upgradeClient.query("BEGIN");
      const secureHash = await hashSecurePassword(password);
      await updatePasswordRepository(
        upgradeClient,
        user.id,
        secureHash
      );
      await upgradeClient.query("COMMIT");
    } catch {
      await upgradeClient.query("ROLLBACK");
    } finally {
      upgradeClient.release();
    }
  }

  const expiresAt = new Date(
    Date.now() + ms(process.env.JWT_REFRESH_EXPIRES_IN || "30d")
  );
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await updateLastLoginRepository(user.id, client);
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
    throw error;
  } finally {
    client.release();
  }

  // Update device slot outside the critical transaction so concurrent device slot
  // updates can never abort a valid login with a 25P02/23505 rollback.
  await approveUserDeviceRepository(null, {
    userId: user.id,
    ...device,
  }).catch(() => {});

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

    const policy = await validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      throw new ApiError(400, policy.message);
    }

    const hashedPassword = await hashSecurePassword(newPassword);

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

    const policy = await validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      throw new ApiError(400, policy.message);
    }

    const hashedPassword = await hashSecurePassword(newPassword);

    await updatePasswordRepository(

      client,

      reset.user_id,

      hashedPassword

    );

    await client.query(
      `UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, password_changed_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [reset.user_id]
    ).catch(() => {});

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
  _deviceId
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

  // Rotation is single-use: invalidate the presented token before issuing its
  // replacement. Keeping a grace window here allows a stolen/old cookie to be
  // replayed and breaks the refresh-token rotation security contract.
  await deleteRefreshTokenRepository(client, refreshToken);

  // Update device slot non-blockingly outside transaction so it cannot abort refresh
  findApprovedUserDeviceRepository(user.id, device.deviceId)
    .then((approvedDevice) => {
      if (!approvedDevice || approvedDevice.device_type !== device.deviceType) {
        return approveUserDeviceRepository(null, {
          userId: user.id,
          ...device,
        });
      }
      return updateDeviceLastSeenRepository(user.id, device.deviceId);
    })
    .catch(() => {});

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
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
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

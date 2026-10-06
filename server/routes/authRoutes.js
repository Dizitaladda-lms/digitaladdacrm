import express from "express";
import {
  loginLimiter,
  loginIpLimiter,
  accountRecoveryLimiter,
  registrationLimiter,
} from "../middleware/rateLimiter.js";
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  verifyEmail,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

import validate from "../middleware/validate.js";

import {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  updateProfileValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../validators/authValidator.js";

const router = express.Router();

/**
 * =====================================================
 * Public Routes
 * =====================================================
 */

router.post(
  "/register",
  registrationLimiter,
  registerValidator,
  validate,
  register
);

router.post(
  "/login",
  loginIpLimiter,
  loginLimiter,
  loginValidator,
  validate,
  login
);

router.post(
  "/forgot-password",
  accountRecoveryLimiter,
  forgotPasswordValidator,
  validate,
  forgotPassword
);

router.post(
  "/reset-password",
  accountRecoveryLimiter,
  resetPasswordValidator,
  validate,
  resetPassword
);

router.post(
  "/refresh-token",
  refreshToken
);

/**
 * =====================================================
 * Protected Routes
 * =====================================================
 */

router.get(
  "/me",
  authMiddleware,
  getProfile
);

router.patch(
  "/profile",
  authMiddleware,
  updateProfileValidator,
  validate,
  updateProfile
);

router.patch(
  "/change-password",
  authMiddleware,
  changePasswordValidator,
  validate,
  changePassword
);

router.post(
  "/logout",
  authMiddleware,
  logout
);

router.patch(
  "/verify-email",
  authMiddleware,
  verifyEmail
);

export default router;

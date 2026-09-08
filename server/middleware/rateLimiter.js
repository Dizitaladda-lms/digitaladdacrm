import rateLimit from "express-rate-limit";

/**
 * =====================================================
 * Global API Rate Limiter
 * =====================================================
 */

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutes

  max: 500,

  standardHeaders: true,

  legacyHeaders: false,

  skip: () => process.env.NODE_ENV === "test",

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },
});

/**
 * =====================================================
 * Login Rate Limiter
 * =====================================================
 */

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 5,

  standardHeaders: true,

  legacyHeaders: false,

  skip: () => process.env.NODE_ENV === "test",

  message: {
    success: false,
    message:
      "Too many login attempts. Please try again after 15 minutes.",
  },
});
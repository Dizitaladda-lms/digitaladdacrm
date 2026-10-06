import rateLimit, { ipKeyGenerator } from "express-rate-limit";

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

const loginAccountKey = (req) => {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase().slice(0, 320)
    : "";

  return email ? `account:${email}` : `ip:${ipKeyGenerator(req.ip)}`;
};

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: loginAccountKey,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",

  message: {
    success: false,
    message:
      "Too many login attempts. Please try again after 15 minutes.",
  },
});

export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message:
      "Too many login attempts from this network. Please try again after 15 minutes.",
  },
});

export const accountRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many account recovery attempts. Please try again later." },
});

export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many registration attempts. Please try again later." },
});

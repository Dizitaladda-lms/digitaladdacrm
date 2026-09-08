import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

/**
 * =====================================================
 * Helmet
 * =====================================================
 */

export const helmetMiddleware = helmet();

/**
 * =====================================================
 * Compression
 * =====================================================
 */

export const compressionMiddleware = compression();

/**
 * =====================================================
 * Morgan Logger
 * =====================================================
 */

export const loggerMiddleware = morgan("combined");

/**
 * =====================================================
 * CORS
 * =====================================================
 */

export const corsMiddleware = cors({

  origin:
    process.env.NODE_ENV === "production"
      ? process.env.CLIENT_URL
      : "*",

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

});

/**
 * =====================================================
 * Rate Limiter
 * =====================================================
 */

export const rateLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 100,

  standardHeaders: true,

  legacyHeaders: false,

  skip: () => process.env.NODE_ENV === "test",

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },

});
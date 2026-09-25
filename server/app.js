import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import validateEnv from "./config/env.js";

/* Routes */
import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import healthRoutes from "./routes/health.routes.js";
import leadCaptureRoutes from "./routes/leadCaptureRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import leadAssignmentRoutes from "./routes/leadAssignmentRoutes.js";
import followupRoutes from "./routes/followupRoutes.js";
import leadSourceRoutes from "./routes/leadSourceRoutes.js";
import leadRoutingRoutes from "./routes/leadRoutingRoutes.js";
import notificationRoutes from "./routes/notification.routes.js";
import employeePortalRoutes from "./routes/employeePortal.routes.js";
import admissionRoutes from "./routes/admissionRoutes.js";

/* Middlewares */
import { globalLimiter } from "./middleware/rateLimiter.js";
import requestId from "./middleware/requestId.js";
import requestLogger from "./middleware/requestLogger.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

const localDevelopmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://[::1]:5173",
];

const allowedOrigins = [...new Set([
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
  ...localDevelopmentOrigins,
])];

/**
 * Environment Validation
 */
validateEnv();

/**
 * Core Middlewares
 */
app.use(cors((req, callback) => {
  const origin = req.header("Origin");

  // Always allow public landing pages, forms, and webhooks to submit
  const isPublicRoute =
    req.path?.startsWith("/api/public") ||
    req.url?.startsWith("/api/public") ||
    req.originalUrl?.startsWith("/api/public");

  if (isPublicRoute) {
    return callback(null, {
      origin: true,
      credentials: false,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    });
  }

  if (!origin || (origin && origin.endsWith(".vercel.app")) || process.env.NODE_ENV !== "production") {
    return callback(null, {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });
  }

  if (allowedOrigins.includes(origin.replace(/\/$/, ""))) {
    return callback(null, {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });
  }

  return callback(new Error("Origin is not allowed by CORS."));
}));

app.use(cookieParser());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

/**
 * Security Middlewares
 */
app.use(helmet());
app.use(compression());
app.use(hpp());
app.use(globalLimiter);

/**
 * Logging
 */
app.use(requestId);
app.use(requestLogger);
app.use(morgan("dev"));

/**
 * Root Endpoint
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Dizital Adda CRM API Running Successfully 🚀",
    version: "1.0.0",
  });
});

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

/**
 * Health Routes
 */
app.use("/api", healthRoutes);

/**
 * API Routes
 */
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/campaigns", campaignRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/employee", employeePortalRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/public", leadCaptureRoutes);
app.use("/api/lead-assignments", leadAssignmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/lead-sources", leadSourceRoutes);
app.use("/api/lead-routing", leadRoutingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admissions", admissionRoutes);

/**
 * 404 Handler
 */
app.use(notFound);

/**
 * Global Error Handler
 */
app.use(errorHandler);

export default app;

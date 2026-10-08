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
import notificationRoutes from "./routes/notificationRoutes.js";
import employeePortalRoutes from "./routes/employeePortal.routes.js";
import admissionRoutes from "./routes/admissionRoutes.js";
import telephonyRoutes from "./routes/telephonyRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import rosterRoutes from "./routes/rosterRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

/* Middlewares */
import { globalLimiter } from "./middleware/rateLimiter.js";
import requestId from "./middleware/requestId.js";
import requestLogger from "./middleware/requestLogger.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// Render/Vercel deploy behind one trusted reverse proxy. This lets rate limits
// use the real client IP instead of treating every request as the proxy.
app.set("trust proxy", 1);

const localOriginRegex = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
const allowedMainWebsitesRegex = /^(https?:\/\/)?([a-z0-9-]+\.)*(nidads\.com|nipage\.com|nigape\.com|iidad\.com|dizitaladda\.com)(:\d+)?$/i;
const explicitOrigins = [process.env.CLIENT_URL || "", process.env.ALLOWED_ORIGINS || ""]
  .join(",")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return false;
  if (process.env.NODE_ENV !== "production" && localOriginRegex.test(origin)) return true;
  if (explicitOrigins.includes(origin.replace(/\/$/, ""))) return true;
  if (allowedMainWebsitesRegex.test(origin)) return true;
  return false;
};

/**
 * Environment Validation
 */
validateEnv();

/**
 * Core Middlewares
 */
app.use(cors((req, callback) => {
  const origin = req.header("Origin");
  const isAllowed = isOriginAllowed(origin);
  const isPublicLeadRoute = req.path.startsWith("/api/public") || req.url.startsWith("/api/public");

  if (!origin || isAllowed || isPublicLeadRoute) {
    return callback(null, {
      origin: origin || true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "X-Device-Id",
        "X-Device-Name",
      ],
    });
  }

  // Gracefully reject unauthorized origins without throwing 500
  return callback(null, { origin: false });
}));

app.use(cookieParser());
app.use(express.json({ limit: "50mb", verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
app.use(
  express.urlencoded({
    limit: "50mb",
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

app.use((req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }
  const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const hasAuthCookie = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  if (unsafeMethod && hasAuthCookie && !isOriginAllowed(req.get("Origin"))) {
    return res.status(403).json({ success: false, message: "Untrusted request origin." });
  }
  next();
});

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
app.use("/api/public/leads", leadCaptureRoutes);
app.use("/api/public/lead", leadCaptureRoutes);
app.use("/api/lead-assignments", leadAssignmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/lead-sources", leadSourceRoutes);
app.use("/api/lead-routing", leadRoutingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admissions", admissionRoutes);
app.use("/api/telephony", telephonyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/roster", rosterRoutes);
app.use("/api/chat", chatRoutes);

/**
 * 404 Handler
 */
app.use(notFound);

/**
 * Global Error Handler
 */
app.use(errorHandler);

export default app;

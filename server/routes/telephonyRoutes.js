import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  initiateCall,
  handleWebhook,
  getLeadCallLogs,
  getAllCallLogs,
  simulateMockComplete,
} from "../controllers/telephonyController.js";

const router = express.Router();

/**
 * Public Webhook Endpoint (Receives status & recording callback from Exotel / MyOperator)
 * POST /api/telephony/webhook
 */
router.post("/webhook", handleWebhook);
router.get("/webhook", handleWebhook);

/**
 * Protected routes (Counsellors & Admins)
 */
router.post("/call", authMiddleware, initiateCall);
router.get("/lead/:leadId", authMiddleware, getLeadCallLogs);
router.get("/logs", authMiddleware, getAllCallLogs);

// Dev / Testing Simulation helper
router.post("/simulate-complete/:callId", authMiddleware, simulateMockComplete);

export default router;

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  initiateCall,
  handleWebhook,
  getLeadCallLogs,
  getAllCallLogs,
  simulateMockComplete,
  getTelephonyDomains,
  updateDomainCallerId,
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
// Call audio and provider controls are confidential; protect the API as well as the UI.
router.post("/call", authMiddleware, roleMiddleware(ROLES.ADMIN), initiateCall);
router.get("/lead/:leadId", authMiddleware, roleMiddleware(ROLES.ADMIN), getLeadCallLogs);
router.get("/logs", authMiddleware, roleMiddleware(ROLES.ADMIN), getAllCallLogs);

// Domain-specific caller ID management
router.get("/domains", authMiddleware, roleMiddleware(ROLES.ADMIN), getTelephonyDomains);
router.put("/domains/:domainId/caller-id", authMiddleware, roleMiddleware(ROLES.ADMIN), updateDomainCallerId);

// Dev / Testing Simulation helper
router.post("/simulate-complete/:callId", authMiddleware, roleMiddleware(ROLES.ADMIN), simulateMockComplete);

export default router;

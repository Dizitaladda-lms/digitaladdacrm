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
 * Public Webhook Endpoint (Receives status & recording callback from Exotel / MyOperator / Twilio)
 * POST /api/telephony/webhook
 */
router.post("/webhook", handleWebhook);
router.get("/webhook", handleWebhook);

/**
 * Click-To-Call — Both Admin & Counsellor can initiate calls
 */
router.post(
  "/call",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR),
  initiateCall
);

/**
 * Get call logs for a specific lead — Both Admin & Counsellor
 * Counsellor can only see calls for leads assigned to them (enforced in controller)
 */
router.get(
  "/lead/:leadId",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR),
  getLeadCallLogs
);

/**
 * Admin only: all call logs report
 */
router.get("/logs", authMiddleware, roleMiddleware(ROLES.ADMIN), getAllCallLogs);

/**
 * Domain-specific caller ID / virtual number management (Admin only)
 */
router.get("/domains", authMiddleware, roleMiddleware(ROLES.ADMIN), getTelephonyDomains);
router.put(
  "/domains/:domainId/caller-id",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  updateDomainCallerId
);

/**
 * Dev / Testing: Simulate a completed call with sample recording
 * Available to both roles so counsellors can test in DEV mode
 */
router.post(
  "/simulate-complete/:callId",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN, ROLES.COUNSELLOR),
  simulateMockComplete
);

export default router;

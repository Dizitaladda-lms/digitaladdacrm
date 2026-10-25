import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createLeaveRequest,
  decideLeaveRequest,
  getMyLeaveRequests,
  getLeaveApprovalProof,
  getPendingLeaveApprovals,
} from "../controllers/leaveController.js";
import { uploadLeaveApprovalProof } from "../middleware/leaveApprovalProofUpload.js";

const router = express.Router();

router.use(authMiddleware);
router.post("/", uploadLeaveApprovalProof, createLeaveRequest);
router.get("/my-requests", getMyLeaveRequests);
router.get("/approvals", getPendingLeaveApprovals);
router.get("/:id/manager-approval-proof", getLeaveApprovalProof);
router.post("/:id/decision", decideLeaveRequest);

export default router;

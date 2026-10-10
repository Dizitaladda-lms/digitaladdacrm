import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createLeaveRequest,
  decideLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveApprovals,
} from "../controllers/leaveController.js";

const router = express.Router();

router.use(authMiddleware);
router.post("/", createLeaveRequest);
router.get("/my-requests", getMyLeaveRequests);
router.get("/approvals", getPendingLeaveApprovals);
router.post("/:id/decision", decideLeaveRequest);

export default router;

import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  createLeaveRequestService,
  decideLeaveRequestService,
  getMyLeaveRequestsService,
  getPendingLeaveApprovalsService,
} from "../services/leaveService.js";

export const createLeaveRequest = asyncHandler(async (req, res) => {
  const result = await createLeaveRequestService(req.body, req.user);
  return res.status(201).json(new ApiResponse(201, result, "Leave request submitted."));
});

export const getMyLeaveRequests = asyncHandler(async (req, res) => {
  const result = await getMyLeaveRequestsService(req.user);
  return res.status(200).json(new ApiResponse(200, result, "Your leave requests were fetched."));
});

export const getPendingLeaveApprovals = asyncHandler(async (req, res) => {
  const result = await getPendingLeaveApprovalsService(req.user);
  return res.status(200).json(new ApiResponse(200, result, "Pending leave approvals were fetched."));
});

export const decideLeaveRequest = asyncHandler(async (req, res) => {
  const result = await decideLeaveRequestService(req.params.id, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Leave request reviewed."));
});

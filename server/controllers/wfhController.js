import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  createWfhRequestService,
  getMyWfhRequestsService,
  getPendingHRWfhRequestsService,
  decideWfhRequestService,
} from "../services/wfhService.js";

export const createWfhRequest = asyncHandler(async (req, res) => {
  const result = await createWfhRequestService(req.body, req.user);
  return res.status(201).json(new ApiResponse(201, result, "WFH request submitted successfully."));
});

export const getMyWfhRequests = asyncHandler(async (req, res) => {
  const result = await getMyWfhRequestsService(req.user);
  return res.status(200).json(new ApiResponse(200, result, "Your WFH requests were fetched."));
});

export const getPendingWfhApprovals = asyncHandler(async (req, res) => {
  const result = await getPendingHRWfhRequestsService(req.user);
  return res.status(200).json(new ApiResponse(200, result, "Pending WFH requests were fetched."));
});

export const decideWfhRequest = asyncHandler(async (req, res) => {
  const result = await decideWfhRequestService(req.params.id, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, result, "WFH request reviewed successfully."));
});

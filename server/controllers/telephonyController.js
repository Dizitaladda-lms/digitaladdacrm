import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import {
  initiateClickToCallService,
  processTelephonyWebhookService,
  getLeadCallLogsService,
  getAllCallLogsService,
  simulateMockCallCompleteService,
  getTelephonyDomainsService,
  updateDomainCallerIdService,
} from "../services/telephonyService.js";

/**
 * Initiate Click-To-Call
 */
export const initiateCall = asyncHandler(async (req, res) => {
  const { lead_id, custom_caller_number } = req.body;

  if (!lead_id) {
    throw new ApiError(400, "Lead ID is required to initiate a call.");
  }

  // Employee ID comes from authenticated user / session
  const employeeId = req.user?.id || req.body.employee_id;
  if (!employeeId) {
    throw new ApiError(401, "Authentication required to initiate calls.");
  }

  const result = await initiateClickToCallService({
    leadId: lead_id,
    employeeId,
    customCallerNumber: custom_caller_number,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Call initiated successfully.")
  );
});

/**
 * Telephony Webhook Receiver (Public endpoint for Exotel, MyOperator, Twilio)
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    ...req.query,
  };

  const result = await processTelephonyWebhookService(payload);

  // Providers expect standard 200 OK
  return res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get call history and audio recordings for a specific lead
 */
export const getLeadCallLogs = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  if (!leadId) {
    throw new ApiError(400, "Lead ID parameter is required.");
  }

  const calls = await getLeadCallLogsService(leadId);

  return res.status(200).json(
    new ApiResponse(200, calls, "Lead call logs retrieved successfully.")
  );
});

/**
 * Admin view: Get all call logs with filters
 */
export const getAllCallLogs = asyncHandler(async (req, res) => {
  const { page, limit, employeeId, status } = req.query;

  const result = await getAllCallLogsService({
    page,
    limit,
    employeeId,
    status,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "All call logs retrieved successfully.")
  );
});

/**
 * Simulation helper for testing audio playback
 */
export const simulateMockComplete = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { recording_url } = req.body || {};

  const updated = await simulateMockCallCompleteService(callId, recording_url);

  return res.status(200).json(
    new ApiResponse(200, updated, "Call marked completed with sample recording.")
  );
});

/**
 * Get all domains and their configured virtual caller numbers
 */
export const getTelephonyDomains = asyncHandler(async (req, res) => {
  const domains = await getTelephonyDomainsService();
  return res.status(200).json(
    new ApiResponse(200, domains, "Domains retrieved successfully.")
  );
});

/**
 * Update domain virtual caller ID (Admin)
 */
export const updateDomainCallerId = asyncHandler(async (req, res) => {
  const { domainId } = req.params;
  const { caller_id } = req.body;

  const updated = await updateDomainCallerIdService(domainId, caller_id);

  return res.status(200).json(
    new ApiResponse(200, updated, "Domain caller ID updated successfully.")
  );
});

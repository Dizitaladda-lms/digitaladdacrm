import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  getAdmissionsService,
  createAdmissionService,
  collectFeeService,
  getAdmissionByIdService,
  getAdmissionPaymentByIdService,
  getAdmissionByLeadService,
} from "../services/admissionService.js";

/**
 * Get Admissions List
 */
export const getAdmissions = asyncHandler(async (req, res) => {
  const result = await getAdmissionsService(req.user, req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Admissions fetched successfully."));
});

/**
 * Create New Admission
 */
export const createAdmission = asyncHandler(async (req, res) => {
  const admission = await createAdmissionService(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, admission, "Admission created successfully."));
});

/**
 * Get Single Admission by ID
 */
export const getAdmissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const admission = await getAdmissionByIdService(id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, admission, "Admission fetched successfully."));
});

/**
 * Get Admission by Lead ID
 */
export const getAdmissionByLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const admission = await getAdmissionByLeadService(leadId, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, admission, "Admission fetched successfully."));
});

/**
 * Collect Fee Installment
 */
export const collectFee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedAdmission = await collectFeeService(id, req.body, req.user);
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedAdmission, "Fee payment recorded successfully.")
    );
});

/**
 * Get Specific Payment Receipt
 */
export const getPaymentReceipt = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await getAdmissionPaymentByIdService(paymentId, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, payment, "Payment receipt fetched successfully."));
});



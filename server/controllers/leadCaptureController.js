import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  capturePublicLeadService,
} from "../services/leadCaptureService.js";

/**
 * =====================================================
 * Public Lead Capture
 * =====================================================
 */

export const capturePublicLead = asyncHandler(async (req, res) => {

  const result = await capturePublicLeadService(
    req.body,
    req
  );

  if (req.body.redirect_url) {
    return res.redirect(req.body.redirect_url);
  }

  return res.status(201).json(

    new ApiResponse(

      201,

      result,

      result.type === "CREATED"
        ? "Lead captured successfully."
        : "Existing lead updated successfully."

    )

  );

});
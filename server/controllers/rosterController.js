import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  getMyMonthlyRosterService,
  saveMyMonthlyRosterService,
  requestRosterChangeService,
  getHREmployeesRosterService,
  reviewRosterService,
  updateRosterByHRService,
} from "../services/rosterService.js";

/**
 * =====================================================
 * Employee Controller Methods
 * =====================================================
 */

export const getMyMonthlyRoster = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const roster = await getMyMonthlyRosterService(req.user, year, month);

  return res.status(200).json(
    new ApiResponse(200, roster, "Personal monthly roster retrieved successfully.")
  );
});

export const saveMyMonthlyRoster = asyncHandler(async (req, res) => {
  const saved = await saveMyMonthlyRosterService(req.user, req.body);
  const msg = req.body?.isSubmit
    ? "Roster submitted to HR for approval successfully!"
    : "Roster draft saved successfully.";

  return res.status(200).json(
    new ApiResponse(200, saved, msg)
  );
});

export const requestRosterChange = asyncHandler(async (req, res) => {
  const result = await requestRosterChangeService(req.user, req.body);

  return res.status(200).json(
    new ApiResponse(200, result, "Roster edit request sent to HR successfully.")
  );
});

/**
 * =====================================================
 * HR / Super Admin Controller Methods
 * =====================================================
 */

export const getHREmployeesRoster = asyncHandler(async (req, res) => {
  const data = await getHREmployeesRosterService(req.user, req.query);

  return res.status(200).json(
    new ApiResponse(200, data, "Company employee rosters retrieved successfully.")
  );
});

export const reviewRoster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reviewed = await reviewRosterService(req.user, id, req.body);

  return res.status(200).json(
    new ApiResponse(200, reviewed, `Roster has been ${reviewed.status.toLowerCase()} successfully.`)
  );
});

export const updateRosterByHR = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await updateRosterByHRService(req.user, id, req.body);

  return res.status(200).json(
    new ApiResponse(200, updated, "Employee roster updated successfully by HR.")
  );
});

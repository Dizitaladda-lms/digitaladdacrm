import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  submitDailyReportService,
  getMyReportByDateService,
  getMyReportsHistoryService,
  getReportByIdService,
  getTeamReportsService,
  reviewReportAsTLService,
  getHROverviewService,
  getAllCompanyReportsService,
  reviewReportAsHRService,
  reviewReportAsSuperAdminService,
  getClassesAuditFeedService,
} from "../services/reportService.js";

/**
 * Submit or Update Daily Work Report
 * Supports tasks, total hours, deliverable links, and class logs with video proof links
 */
export const submitDailyReportController = asyncHandler(async (req, res) => {
  const report = await submitDailyReportService(req.user, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, report, "Daily work report submitted successfully."));
});

/**
 * Get Current User's Report for Today or Specified Date
 */
export const getMyReportTodayController = asyncHandler(async (req, res) => {
  const date = req.query.date;
  const report = await getMyReportByDateService(req.user.id, date);
  return res
    .status(200)
    .json(new ApiResponse(200, report, "My daily report retrieved."));
});

/**
 * Get Current User's Past Reports History
 */
export const getMyReportsHistoryController = asyncHandler(async (req, res) => {
  const data = await getMyReportsHistoryService(req.user.id, req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "My report history retrieved successfully."));
});

/**
 * Get Single Report Details by ID
 */
export const getReportByIdController = asyncHandler(async (req, res) => {
  const report = await getReportByIdService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, report, "Daily report retrieved successfully."));
});

/**
 * Team Lead: Get Department / Team Member Reports
 */
export const getTeamReportsController = asyncHandler(async (req, res) => {
  const data = await getTeamReportsService(req.user, req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Team member daily reports retrieved successfully."));
});

/**
 * Team Lead: Review / Verify a Report
 */
export const reviewReportAsTLController = asyncHandler(async (req, res) => {
  const report = await reviewReportAsTLService(req.user, req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, report, "Report reviewed and verified by Team Lead."));
});

/**
 * HR: Get Company-wide Compliance Dashboard & Pending List
 */
export const getHROverviewController = asyncHandler(async (req, res) => {
  const overview = await getHROverviewService(req.query.date);
  return res
    .status(200)
    .json(new ApiResponse(200, overview, "HR compliance overview retrieved successfully."));
});

/**
 * HR & Super Admin: Get All Company Reports with Filters
 */
export const getAllCompanyReportsController = asyncHandler(async (req, res) => {
  const data = await getAllCompanyReportsService(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Company reports retrieved successfully."));
});

/**
 * HR: Review / Approve a Report
 */
export const reviewReportAsHRController = asyncHandler(async (req, res) => {
  const report = await reviewReportAsHRService(req.user, req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, report, "Report approved and updated by HR."));
});

/**
 * Super Admin: Final Review / Approve a Report
 */
export const reviewReportAsSuperAdminController = asyncHandler(async (req, res) => {
  const report = await reviewReportAsSuperAdminService(req.user, req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, report, "Report given final approval by Super Admin."));
});

/**
 * Super Admin & HR: Classes & Video Proofs Audit Feed
 */
export const getClassesAuditFeedController = asyncHandler(async (req, res) => {
  const data = await getClassesAuditFeedService(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Class sessions and video recording proofs retrieved."));
});

import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  findActivityLogsRepository,
  getActivityLogStatsRepository,
} from "../repositories/activityLogRepository.js";

/**
 * GET /api/activity-logs
 * List all system activity logs with filtering & pagination
 * Accessible only by ADMIN, SUPER_ADMIN, and HR
 */
export const getActivityLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    module = "",
    action = "",
    status = "",
    userId = null,
    search = "",
    startDate = "",
    endDate = "",
  } = req.query;

  const result = await findActivityLogsRepository({
    page,
    limit,
    module,
    action,
    status,
    userId,
    search,
    startDate,
    endDate,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Activity logs retrieved successfully.")
  );
});

/**
 * GET /api/activity-logs/stats
 * Overview summary of activities today (logins, modifications, active users)
 */
export const getActivityLogStats = asyncHandler(async (_req, res) => {
  const stats = await getActivityLogStatsRepository();
  return res.status(200).json(
    new ApiResponse(200, stats, "Activity log statistics retrieved.")
  );
});

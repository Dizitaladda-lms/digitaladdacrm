import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  createTaskService,
  getTasksService,
  updateTaskStatusService,
  deleteTaskService,
  requestReportRevisionService,
} from "../services/taskService.js";

/**
 * Super Admin & Managers: Assign Work / Create Task
 */
export const createTaskController = asyncHandler(async (req, res) => {
  const task = await createTaskService(req.user, req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, task, "Work assigned successfully to team member."));
});

/**
 * Get Assigned Tasks List
 */
export const getTasksController = asyncHandler(async (req, res) => {
  const data = await getTasksService(req.user, req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Assigned work tasks retrieved."));
});

/**
 * Update Task Status or Feedback
 */
export const updateTaskStatusController = asyncHandler(async (req, res) => {
  const task = await updateTaskStatusService(req.user, req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task status updated successfully."));
});

/**
 * Delete Task
 */
export const deleteTaskController = asyncHandler(async (req, res) => {
  const result = await deleteTaskService(req.user, req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Task deleted."));
});

/**
 * Request Changes / Revision on Daily Work Report
 */
export const requestReportRevisionController = asyncHandler(async (req, res) => {
  const result = await requestReportRevisionService(req.user, req.params.reportId, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Revision requested and attached task created."));
});

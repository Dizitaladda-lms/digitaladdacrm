import ApiError from "../utils/ApiError.js";
import {
  createTaskRepository,
  findTaskByIdRepository,
  findTasksRepository,
  updateTaskStatusRepository,
  deleteTaskRepository,
} from "../repositories/taskRepository.js";
import { findReportByIdRepository } from "../repositories/reportRepository.js";
import pool from "../config/db.js";

/**
 * Assign a new task / project work to an employee or Team Lead
 */
export const createTaskService = async (user, payload) => {
  if (!payload.title || !payload.title.trim()) {
    throw new ApiError(400, "Task title is required.");
  }
  if (!payload.assigned_to_id) {
    throw new ApiError(400, "Target employee (assigned_to_id) is required.");
  }

  const taskData = {
    title: payload.title.trim(),
    description: payload.description ? payload.description.trim() : null,
    assigned_by_id: user.id,
    assigned_to_id: Number(payload.assigned_to_id),
    department_id: payload.department_id ? Number(payload.department_id) : null,
    report_id: payload.report_id ? Number(payload.report_id) : null,
    priority: payload.priority || "MEDIUM",
    status: payload.status || "PENDING",
    due_date: payload.due_date || null,
    revision_feedback: payload.revision_feedback || null,
  };

  const created = await createTaskRepository(taskData);
  return await findTaskByIdRepository(created.id);
};

/**
 * Get assigned tasks list (for Admin, Dept Head or Employee)
 */
export const getTasksService = async (user, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 30));

  // Access control scoping
  let assignedToId = query.assignedToId ? Number(query.assignedToId) : undefined;
  let assignedById = query.assignedById ? Number(query.assignedById) : undefined;
  const userRole = String(user.role || "").toUpperCase();

  // Non-admins see tasks assigned to them or assigned by them
  if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(userRole)) {
    if (!assignedToId && !assignedById) {
      assignedToId = user.id;
    }
  }

  return await findTasksRepository({
    assignedToId,
    assignedById,
    departmentId: query.departmentId ? Number(query.departmentId) : undefined,
    status: query.status || undefined,
    reportId: query.reportId ? Number(query.reportId) : undefined,
    search: query.search?.trim(),
    page,
    limit,
  });
};

/**
 * Update status or revision comments of a task
 */
export const updateTaskStatusService = async (user, taskId, payload) => {
  const task = await findTaskByIdRepository(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found.");
  }

  const newStatus = payload.status || task.status;
  const feedback = payload.revision_feedback || payload.feedback || null;

  await updateTaskStatusRepository(taskId, newStatus, feedback);

  // If task is linked to a daily report, update report status if completed or revision requested
  if (task.report_id) {
    if (newStatus === "COMPLETED") {
      await pool.query(
        `UPDATE daily_work_reports SET status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [task.report_id]
      );
    } else if (newStatus === "REVISION_REQUESTED") {
      await pool.query(
        `UPDATE daily_work_reports SET status = 'REVISION_REQUESTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [task.report_id]
      );
    }
  }

  return await findTaskByIdRepository(taskId);
};

/**
 * Delete an assigned task
 */
export const deleteTaskService = async (user, taskId) => {
  const task = await findTaskByIdRepository(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found.");
  }
  await deleteTaskRepository(taskId);
  return { id: taskId, message: "Task removed successfully." };
};

/**
 * Request Changes on a Daily Work Report & Route as Assigned Task
 */
export const requestReportRevisionService = async (user, reportId, payload) => {
  const report = await findReportByIdRepository(reportId);
  if (!report) {
    throw new ApiError(404, "Daily work report not found.");
  }

  const feedback = payload.feedback || payload.revision_instructions || "Changes requested on report / project work.";
  const targetUserId = payload.assigned_to_id ? Number(payload.assigned_to_id) : report.user_id;

  // 1. Update report status to REVISION_REQUESTED
  const userRole = String(user.role || "").toUpperCase();
  let updateCol = "tl_feedback";
  if (userRole === "HR") updateCol = "hr_feedback";
  else if (userRole === "SUPER_ADMIN") updateCol = "super_admin_feedback";

  await pool.query(
    `UPDATE daily_work_reports 
     SET status = 'REVISION_REQUESTED', ${updateCol} = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2;`,
    [feedback, reportId]
  );

  // 2. Create assigned task linking this report
  const taskTitle = `Project Changes Required: ${report.work_title || "Daily Work Report (" + report.report_date + ")"}`;
  const createdTask = await createTaskRepository({
    title: taskTitle,
    description: `Report Date: ${report.report_date}\n\nRequired Changes:\n${feedback}`,
    assigned_by_id: user.id,
    assigned_to_id: targetUserId,
    department_id: report.department_id || null,
    report_id: report.id,
    priority: "HIGH",
    status: "REVISION_REQUESTED",
    revision_feedback: feedback,
  });

  return {
    reportId,
    task: await findTaskByIdRepository(createdTask.id),
    message: "Report marked for revision and routed to assignee's tasks.",
  };
};

import ApiError from "../utils/ApiError.js";
import {
  createTaskRepository,
  findTaskByIdRepository,
  findTasksRepository,
  updateTaskStatusRepository,
  deleteTaskRepository,
} from "../repositories/taskRepository.js";
import { findReportByIdRepository } from "../repositories/reportRepository.js";
import { getRoleLevel, REPORT_ROLE_LEVELS } from "./reportHierarchyService.js";
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
 * Strict Scoping:
 * - Regular employee: ONLY see tasks assigned to them (assignedToId = user.id)
 * - Dept Head / TL with scope=assigned_by_me: tasks assigned by them
 * - Privileged Admin: full view
 */
export const getTasksService = async (user, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const userRole = String(user.role || "").toUpperCase();

  let assignedToId = undefined;
  let assignedById = undefined;

  const isPrivilegedRole = ["SUPER_ADMIN", "ADMIN", "HR"].includes(userRole);

  let isHeadOrLead = ["SALES_HEAD", "DEPARTMENT_HEAD", "MANAGER", "TL", "SUB_TL"].includes(userRole);
  if (!isPrivilegedRole && !isHeadOrLead) {
    const empRes = await pool.query(
      `SELECT role, designation, is_sales_head, is_department_head, is_head FROM employees WHERE user_id = $1 AND is_deleted = FALSE LIMIT 1;`,
      [user.id]
    );
    const emp = empRes.rows[0];
    if (emp?.is_sales_head || emp?.is_department_head || emp?.is_head) {
      isHeadOrLead = true;
    } else {
      const level = getRoleLevel({
        role: emp?.role || userRole,
        designation: emp?.designation || user.designation,
      });
      isHeadOrLead = level >= REPORT_ROLE_LEVELS.SUB_TL;
    }
  }

  if (isPrivilegedRole) {
    assignedToId = query.assignedToId ? Number(query.assignedToId) : undefined;
    assignedById = query.assignedById ? Number(query.assignedById) : undefined;
  } else if (isHeadOrLead) {
    if (query.scope === "assigned_by_me") {
      assignedById = user.id;
      assignedToId = query.assignedToId ? Number(query.assignedToId) : undefined;
    } else {
      assignedToId = user.id;
    }
  } else {
    // STRICT PRIVACY: regular employees can ONLY see tasks assigned to them!
    assignedToId = user.id;
    assignedById = undefined;
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
 * Fetch eligible team members that caller can assign tasks to
 */
export const getAssignableTeamMembersService = async (user) => {
  const userId = Number(user.id);
  const userRole = String(user.role || "").toUpperCase();

  // If Admin / Super Admin / HR: can assign to any employee
  if (["SUPER_ADMIN", "ADMIN", "HR"].includes(userRole)) {
    const res = await pool.query(
      `SELECT DISTINCT
         u.id,
         u.full_name,
         u.email,
         e.employee_code,
         e.designation,
         e.department_id,
         d.department_name
       FROM users u
       JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE u.is_deleted = FALSE AND u.id != $1
       ORDER BY u.full_name ASC;`,
      [userId]
    );
    return res.rows;
  }

  // Get caller's employee profile
  const empRes = await pool.query(
    `SELECT e.id, e.department_id, e.managed_department_ids, e.role, e.designation, e.is_sales_head, e.is_department_head, e.is_head
     FROM employees e
     WHERE e.user_id = $1 AND e.is_deleted = FALSE
     LIMIT 1;`,
    [userId]
  );
  const employee = empRes.rows[0];
  const effectiveRole = employee?.role || userRole;
  const effectiveDesignation = employee?.designation || user.designation || "";
  let roleLevel = getRoleLevel({
    role: effectiveRole,
    designation: effectiveDesignation,
  });
  if (employee?.is_sales_head || employee?.is_department_head || employee?.is_head) {
    roleLevel = Math.max(roleLevel, REPORT_ROLE_LEVELS.DEPARTMENT_HEAD);
  }

  let deptIds = [];
  if (employee?.department_id) deptIds.push(Number(employee.department_id));
  if (Array.isArray(employee?.managed_department_ids)) {
    deptIds.push(...employee.managed_department_ids.map(Number));
  } else if (typeof employee?.managed_department_ids === "string") {
    try {
      const parsed = JSON.parse(employee.managed_department_ids);
      if (Array.isArray(parsed)) deptIds.push(...parsed.map(Number));
    } catch {}
  }
  deptIds = Array.from(new Set(deptIds.filter((id) => Number.isInteger(id) && id > 0)));

  // If Department Head or Manager:
  if (roleLevel >= REPORT_ROLE_LEVELS.DEPARTMENT_HEAD) {
    const res = await pool.query(
      `WITH RECURSIVE subordinates AS (
         SELECT id, user_id, reporting_manager_id
         FROM employees
         WHERE reporting_manager_id = $1
           AND is_deleted = FALSE
         UNION
         SELECT e.id, e.user_id, e.reporting_manager_id
         FROM employees e
         JOIN subordinates s ON e.reporting_manager_id = s.id
         WHERE e.is_deleted = FALSE
       )
       SELECT DISTINCT
         u.id,
         u.full_name,
         u.email,
         e.employee_code,
         e.designation,
         e.department_id,
         d.department_name
       FROM users u
       JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE u.is_deleted = FALSE
         AND u.id != $2
         AND (
           ($3::bigint[] IS NOT NULL AND e.department_id = ANY($3::bigint[]))
           OR e.id IN (SELECT id FROM subordinates)
         )
       ORDER BY u.full_name ASC;`,
      [employee?.id || 0, userId, deptIds.length > 0 ? deptIds : null]
    );
    return res.rows;
  }

  // If TL or Sub-TL:
  if (roleLevel >= REPORT_ROLE_LEVELS.SUB_TL) {
    const res = await pool.query(
      `SELECT DISTINCT
         u.id,
         u.full_name,
         u.email,
         e.employee_code,
         e.designation,
         e.department_id,
         d.department_name
       FROM users u
       JOIN employees e ON e.user_id = u.id AND e.is_deleted = FALSE
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE u.is_deleted = FALSE
         AND u.id != $1
         AND (
           e.reporting_manager_id = $2
           OR ($3::bigint IS NOT NULL AND e.department_id = $3::bigint)
         )
       ORDER BY u.full_name ASC;`,
      [userId, employee?.id || 0, employee?.department_id || null]
    );
    return res.rows;
  }

  throw new ApiError(403, "You do not have permission to assign tasks.");
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

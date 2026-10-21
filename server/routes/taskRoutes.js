import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import ApiError from "../utils/ApiError.js";
import pool from "../config/db.js";
import { getRoleLevel, REPORT_ROLE_LEVELS } from "../services/reportHierarchyService.js";

import {
  createTaskController,
  getTasksController,
  updateTaskStatusController,
  deleteTaskController,
  requestReportRevisionController,
  getAssignableMembersController,
} from "../controllers/taskController.js";

const router = express.Router();

router.use(authMiddleware);

const canAssignWorkMiddleware = async (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  const role = String(req.user.role || "").toUpperCase();
  if (["SUPER_ADMIN", "ADMIN", "HR", "DEPARTMENT_HEAD", "SALES_HEAD", "MANAGER", "TL", "SUB_TL"].includes(role)) {
    return next();
  }
  try {
    const empResult = await pool.query(
      `SELECT role, designation,
         COALESCE((to_jsonb(employees) ->> 'is_sales_head')::boolean, FALSE) AS is_sales_head,
         COALESCE((to_jsonb(employees) ->> 'is_department_head')::boolean, FALSE) AS is_department_head,
         COALESCE((to_jsonb(employees) ->> 'is_head')::boolean, FALSE) AS is_head
       FROM employees
       WHERE user_id = $1 AND is_deleted = FALSE
       LIMIT 1;`,
      [req.user.id]
    );
    const emp = empResult.rows[0];
    if (emp?.is_sales_head || emp?.is_department_head || emp?.is_head) {
      return next();
    }
    const level = getRoleLevel({
      role: emp?.role || req.user.role,
      designation: emp?.designation || req.user.designation,
    });
    if (level >= REPORT_ROLE_LEVELS.SUB_TL) {
      return next();
    }
  } catch (err) {
    // continue to reject
  }
  return next(new ApiError(403, "Only Team Leads, Department Heads, and Admins can assign tasks."));
};

// Get assignable team members
router.get("/assignable-members", canAssignWorkMiddleware, getAssignableMembersController);

// Create task / Assign work
router.post("/", canAssignWorkMiddleware, createTaskController);

// Get assigned tasks list
router.get("/", getTasksController);

// Update task status or revision comments
router.patch("/:id/status", updateTaskStatusController);

// Delete task
router.delete("/:id", canAssignWorkMiddleware, deleteTaskController);

// Request changes on report & auto-create assigned task
router.post("/report-revision/:reportId", canAssignWorkMiddleware, requestReportRevisionController);

export default router;

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  createTaskController,
  getTasksController,
  updateTaskStatusController,
  deleteTaskController,
  requestReportRevisionController,
} from "../controllers/taskController.js";

const router = express.Router();

router.use(authMiddleware);

// Create task / Assign work
router.post(
  "/",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "HR", "MANAGER", "TL"),
  createTaskController
);

// Get assigned tasks list
router.get("/", getTasksController);

// Update task status or revision comments
router.patch("/:id/status", updateTaskStatusController);

// Delete task
router.delete(
  "/:id",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "HR", "MANAGER", "TL"),
  deleteTaskController
);

// Request changes on report & auto-create assigned task
router.post(
  "/report-revision/:reportId",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "HR", "MANAGER", "TL"),
  requestReportRevisionController
);

export default router;

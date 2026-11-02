import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  createTaskRepository: vi.fn(),
  findTaskByIdRepository: vi.fn(),
  poolQuery: vi.fn(),
  notifyUser: vi.fn(),
}));

vi.mock("../repositories/taskRepository.js", () => ({
  createTaskRepository: dependencies.createTaskRepository,
  findTaskByIdRepository: dependencies.findTaskByIdRepository,
  findTasksRepository: vi.fn(),
  updateTaskStatusRepository: vi.fn(),
  deleteTaskRepository: vi.fn(),
}));

vi.mock("../repositories/reportRepository.js", () => ({
  findReportByIdRepository: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  default: { query: dependencies.poolQuery },
}));

vi.mock("../services/userNotificationService.js", () => ({
  notifyUser: dependencies.notifyUser,
}));

import { createTaskService } from "../services/taskService.js";

describe("targeted task assignment notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.createTaskRepository.mockResolvedValue({ id: 501 });
    dependencies.findTaskByIdRepository.mockResolvedValue({
      id: 501,
      title: "Prepare campaign report",
      priority: "HIGH",
      assigned_to_id: 88,
    });
    dependencies.notifyUser.mockResolvedValue({ notificationCreated: true, push: { sent: 1, failed: 0 } });
  });

  it("notifies only the exact assigned user, never the whole department", async () => {
    await createTaskService(
      { id: 17, full_name: "Department Head" },
      {
        title: "Prepare campaign report",
        assigned_to_id: 88,
        department_id: 9,
        priority: "HIGH",
      }
    );

    expect(dependencies.notifyUser).toHaveBeenCalledTimes(1);
    expect(dependencies.notifyUser).toHaveBeenCalledWith(
      88,
      expect.objectContaining({
        data: { taskId: 501 },
        url: "/employee/assigned-work",
        actorUserId: 17,
        type: "TASK_ASSIGNED",
      })
    );
  });
});

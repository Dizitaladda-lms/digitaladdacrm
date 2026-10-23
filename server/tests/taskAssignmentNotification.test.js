import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  createTaskRepository: vi.fn(),
  findTaskByIdRepository: vi.fn(),
  poolQuery: vi.fn(),
  sendPushToUsersService: vi.fn(),
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

vi.mock("../services/pushNotificationService.js", () => ({
  sendPushToUsersService: dependencies.sendPushToUsersService,
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
    dependencies.poolQuery.mockResolvedValue({ rows: [] });
    dependencies.sendPushToUsersService.mockResolvedValue({ sent: 1, failed: 0 });
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

    expect(dependencies.sendPushToUsersService).toHaveBeenCalledTimes(1);
    expect(dependencies.sendPushToUsersService).toHaveBeenCalledWith(
      88,
      expect.objectContaining({ data: { taskId: 501 }, url: "/employee/assigned-work" })
    );
    expect(dependencies.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO user_notifications"),
      expect.arrayContaining([88, 17])
    );
  });
});

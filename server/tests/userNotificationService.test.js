import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  sendPushToUsersService: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  default: { query: mocks.query },
}));

vi.mock("../services/pushNotificationService.js", () => ({
  sendPushToUsersService: mocks.sendPushToUsersService,
}));

import { notifyUser } from "../services/userNotificationService.js";

describe("notifyUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [{ id: 12 }] });
    mocks.sendPushToUsersService.mockResolvedValue({
      configured: true,
      subscriptions: 1,
      sent: 1,
      failed: 0,
    });
  });

  it("persists an in-app notification and awaits push dispatch for that user", async () => {
    const result = await notifyUser(42, {
      title: "New task",
      body: "Prepare the report",
      url: "/employee/assigned-work",
      tag: "task-12",
      type: "TASK_ASSIGNED",
      actorUserId: 7,
      data: { taskId: 12 },
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO user_notifications"),
      [42, 7, "TASK_ASSIGNED", "TASK", "New task", "Prepare the report", "/employee/assigned-work", "HIGH"]
    );
    expect(mocks.sendPushToUsersService).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        title: "New task",
        body: "Prepare the report",
        url: "/employee/assigned-work",
        tag: "task-12",
        type: "TASK_ASSIGNED",
        urgency: "high",
      })
    );
    expect(result).toEqual({
      notificationCreated: true,
      push: { configured: true, subscriptions: 1, sent: 1, failed: 0 },
    });
  });

  it("reports notification database failures without skipping push dispatch", async () => {
    mocks.query.mockRejectedValue(new Error("database unavailable"));

    const result = await notifyUser(42, {
      title: "Chat message",
      body: "Hello",
      url: "/employee/team-chat",
      tag: "chat-1",
      type: "CHAT_MESSAGE",
    });

    expect(mocks.sendPushToUsersService).toHaveBeenCalledTimes(1);
    expect(result.notificationCreated).toBe(false);
    expect(result.push.sent).toBe(1);
  });

  it("does not resolve until push delivery dispatch has settled", async () => {
    let finishPush;
    mocks.sendPushToUsersService.mockImplementation(
      () => new Promise((resolve) => { finishPush = resolve; })
    );

    let finished = false;
    const pending = notifyUser(42, {
      title: "Chat message",
      body: "Hello",
      url: "/employee/team-chat",
      tag: "chat-1",
      type: "CHAT_MESSAGE",
    }).then(() => {
      finished = true;
    });

    await Promise.resolve();
    expect(finished).toBe(false);
    finishPush({ configured: true, subscriptions: 1, sent: 1, failed: 0 });
    await pending;
    expect(finished).toBe(true);
  });
});

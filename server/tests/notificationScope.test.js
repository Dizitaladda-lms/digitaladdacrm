import { afterEach, describe, expect, it, vi } from "vitest";
import pool from "../config/db.js";
import { getNotificationsController } from "../controllers/notificationController.js";

describe("notification scope", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns only the signed-in user's task-assignment and chat notifications", async () => {
    const query = vi.spyOn(pool, "query").mockResolvedValue({
      rows: [{ id: 7, type: "TASK_ASSIGNED", category: "TASK", created_at: "2026-10-23T08:00:00.000Z" }],
    });
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json };

    await getNotificationsController({ user: { id: 42 } }, res, vi.fn());

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE n.user_id = $1"),
      [42]
    );
    expect(query.mock.calls[0][0]).toContain("n.type = 'TASK_ASSIGNED'");
    expect(query.mock.calls[0][0]).toContain("'CHAT_DM', 'CHAT_MENTION', 'CHAT_MESSAGE'");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json.mock.calls[0][0].data.notifications).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  default: { query },
  withTransaction: vi.fn(),
}));

import { upsertEmployeeRosterRepository } from "../repositories/rosterRepository.js";

describe("employee roster upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.mockResolvedValue({ rows: [{ status: "SUBMITTED" }] });
  });

  it("clears the previous HR decision when the employee saves or resubmits", async () => {
    await upsertEmployeeRosterRepository({
      employee_id: 42,
      year: 2026,
      month: 10,
      status: "SUBMITTED",
      days_data: [{ day: 1, status: "WORKING" }],
      submitted_at: new Date(),
    });

    const [sql] = query.mock.calls[0];
    expect(sql).toContain("reviewed_by = NULL");
    expect(sql).toContain("reviewed_at = NULL");
    expect(sql).toContain("review_remarks = NULL");
    expect(sql).toContain("change_request_note = NULL");
  });
});

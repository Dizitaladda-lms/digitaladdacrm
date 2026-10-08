import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/db.js", () => ({
  default: { query: vi.fn() },
}));

import pool from "../config/db.js";
import {
  getReportVisibilityScope,
  invalidateReportVisibilityCache,
} from "../services/reportVisibilityPolicy.js";

describe("report visibility policy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateReportVisibilityCache();
    delete process.env.REPORT_GLOBAL_ACCESS_ENABLED;
    delete process.env.REPORT_HISTORY_VISIBILITY_MODE;
  });

  afterEach(() => {
    invalidateReportVisibilityCache();
  });

  it("limits an intern to their own reports and uses the recursive hierarchy query", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, department_id: 7, role: "INTERN", designation: "Intern" }] })
      .mockResolvedValueOnce({ rows: [{ department_id: 7 }] });

    const scope = await getReportVisibilityScope({ id: 10, role: "INTERN" });

    expect(scope.userIds).toEqual([10]);
    expect(scope.unrestricted).toBe(false);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it("includes every descendant for a Sub-TL, but not a peer branch", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 2, department_id: 7, role: "EMPLOYEE", designation: "Sub-Team Lead" }] })
      .mockResolvedValueOnce({ rows: [{ id: 20 }, { id: 21 }, { id: 22 }] })
      .mockResolvedValueOnce({ rows: [{ department_id: 7 }] });

    const scope = await getReportVisibilityScope({ id: 20, role: "EMPLOYEE" });

    expect(scope.userIds).toEqual([20, 21, 22]);
    expect(scope.userIds).not.toContain(23);
    expect(pool.query.mock.calls[1][0]).toContain("child.role_level < parent.role_level");
  });

  it("keeps TL1 and TL2 trees isolated", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      if (sql.includes("FROM employees") && sql.includes("WHERE user_id = $1")) {
        return { rows: [{ id: params[0], department_id: 7, role: "TL", designation: "Team Lead" }] };
      }
      if (sql.includes("WITH RECURSIVE report_tree")) {
        return { rows: params[0] === 30 ? [{ id: 30 }, { id: 31 }] : [{ id: 40 }, { id: 41 }] };
      }
      return { rows: [{ department_id: 7 }] };
    });

    const tl1 = await getReportVisibilityScope({ id: 30, role: "TL" });
    const tl2 = await getReportVisibilityScope({ id: 40, role: "TL" });

    expect(tl1.userIds).toEqual([30, 31]);
    expect(tl2.userIds).toEqual([40, 41]);
    expect(tl1.userIds).not.toContain(41);
    expect(pool.query.mock.calls[1][0]).toContain("child.role_level < parent.role_level");
  });

  it("limits a department head to users in their own department", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5, department_id: 8, role: "MANAGER", designation: "Department Head" }] })
      .mockResolvedValueOnce({ rows: [{ id: 50 }, { id: 51 }] })
      .mockResolvedValueOnce({ rows: [{ department_id: 8 }] });

    const scope = await getReportVisibilityScope({ id: 50, role: "MANAGER" });

    expect(scope.userIds).toEqual([50, 51]);
    expect(pool.query.mock.calls[1][0]).toContain("WHERE e.department_id = $1");
    expect(pool.query.mock.calls[1][1]).toEqual([8]);
  });

  it("grants HR all-company access only when the feature flag is enabled", async () => {
    process.env.REPORT_GLOBAL_ACCESS_ENABLED = "true";
    await expect(getReportVisibilityScope({ id: 60, role: "HR" })).resolves.toMatchObject({
      userIds: null,
      unrestricted: true,
    });
    expect(pool.query).not.toHaveBeenCalled();

    process.env.REPORT_GLOBAL_ACCESS_ENABLED = "false";
    invalidateReportVisibilityCache();
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const scope = await getReportVisibilityScope({ id: 60, role: "HR" });
    expect(scope.userIds).toEqual([60]);
    expect(scope.unrestricted).toBe(false);
  });

  it("can preserve report access from the hierarchy at submission time", async () => {
    process.env.REPORT_HISTORY_VISIBILITY_MODE = "submission";
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, department_id: 7, role: "EMPLOYEE", designation: "Employee" }] })
      .mockResolvedValueOnce({ rows: [{ report_id: 900 }] })
      .mockResolvedValueOnce({ rows: [{ department_id: 7 }] });

    const scope = await getReportVisibilityScope({ id: 10, role: "EMPLOYEE" });

    expect(scope.reportIds).toEqual([900]);
  });
});

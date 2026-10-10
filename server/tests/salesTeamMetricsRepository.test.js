import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  default: { query },
  withTransaction: vi.fn(),
}));

import { getSalesTeamMetricsRepository } from "../repositories/reportRepository.js";

describe("Sales Department overview database metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads leads, calls and revenue from their operational tables", async () => {
    query.mockResolvedValue({
      rows: [{
        employee_id: 12,
        employee_name: "Sales Counsellor",
        assigned_leads_count: "8",
        total_calls_count: "10",
        connected_calls_count: "6",
        admissions_count: "2",
        total_revenue: "90000",
      }],
    });

    const result = await getSalesTeamMetricsRepository({
      startDate: "2026-10-01",
      endDate: "2026-10-10",
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("FROM admissions a"),
      ["2026-10-01", "2026-10-10"]
    );
    const sql = query.mock.calls[0][0];
    expect(sql).toContain("f.followup_type = 'CALL'");
    expect(sql).toContain("SUM(a.total_fee)");
    expect(sql).not.toContain("CAST(l.budget AS numeric)");
    expect(result.kpi).toEqual({
      totalLeads: 8,
      totalCalls: 10,
      connectedCalls: 6,
      totalAdmissions: 2,
      totalRevenue: 90000,
    });
    expect(result.counsellors[0].conversion_rate).toBe("25.0");
  });

  it("queries all dates when no range is selected", async () => {
    query.mockResolvedValue({ rows: [] });

    await getSalesTeamMetricsRepository({});

    expect(query).toHaveBeenCalledWith(expect.any(String), [null, null]);
  });
});

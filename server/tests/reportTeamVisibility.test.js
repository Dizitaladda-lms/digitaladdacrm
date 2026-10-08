import { afterEach, describe, expect, it, vi } from "vitest";
import pool from "../config/db.js";
import { findTeamReportsRepository } from "../repositories/reportRepository.js";

describe("findTeamReportsRepository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes a TL's direct reports when a department filter is selected", async () => {
    const query = vi.spyOn(pool, "query")
      .mockResolvedValueOnce({ rows: [{ total: "1" }] })
      .mockResolvedValueOnce({ rows: [] });

    await findTeamReportsRepository({
      tlEmployeeId: 41,
      departmentId: 7,
      isSuperAdminOrHR: false,
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain("e.reporting_manager_id = $2");
    expect(query.mock.calls[0][1].slice(0, 2)).toEqual([7, 41]);
    expect(query.mock.calls[1][0]).toContain("e.reporting_manager_id = $2");
  });

  it("selects pending reviewer details when a bottleneck viewer requests them", async () => {
    const query = vi.spyOn(pool, "query")
      .mockResolvedValueOnce({ rows: [{ total: "1" }] })
      .mockResolvedValueOnce({ rows: [] });

    await findTeamReportsRepository({
      isSuperAdminOrHR: true,
      includePendingApprover: true,
    });

    expect(query.mock.calls[1][0]).toContain("tl_u.full_name AS pending_approver_name");
    expect(query.mock.calls[1][0]).toContain("tl_e.designation AS pending_approver_designation");
  });
});

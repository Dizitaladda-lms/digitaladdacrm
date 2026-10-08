import { afterEach, describe, expect, it, vi } from "vitest";
import pool from "../config/db.js";
import {
  getCompanyPresenceRepository,
  setEmployeeWorkModeRepository,
} from "../repositories/employeePresenceRepository.js";

describe("employee presence repository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("excludes super admins from the employee presence list", async () => {
    const query = vi.spyOn(pool, "query").mockResolvedValue({ rows: [] });

    await getCompanyPresenceRepository();

    const sql = query.mock.calls[0][0];
    expect(sql).toContain("UPPER(COALESCE(e.role, '')) <> 'SUPER_ADMIN'");
    expect(sql).toContain("UPPER(COALESCE(e.designation, '')) NOT LIKE '%SUPER ADMIN%'");
    expect(sql).toContain("UPPER(COALESCE(super_admin.role, '')) = 'SUPER_ADMIN'");
  });

  it("prevents assigning a work mode to a super-admin employee profile", async () => {
    const query = vi.spyOn(pool, "query").mockResolvedValue({ rows: [] });

    await setEmployeeWorkModeRepository(14, "WFH", 8);

    const sql = query.mock.calls[0][0];
    expect(sql).toContain("UPPER(COALESCE(e.role, '')) <> 'SUPER_ADMIN'");
    expect(sql).toContain("UPPER(COALESCE(super_admin.role, '')) = 'SUPER_ADMIN'");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCompanyPresenceRepository, setEmployeeWorkModeRepository } = vi.hoisted(() => ({
  getCompanyPresenceRepository: vi.fn(),
  setEmployeeWorkModeRepository: vi.fn(),
}));

vi.mock("../repositories/employeePresenceRepository.js", () => ({
  getCompanyPresenceRepository,
  setEmployeeWorkModeRepository,
}));

import {
  getCompanyPresenceService,
  setEmployeeWorkModeService,
} from "../services/employeePresenceService.js";

describe("company employee presence service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the company presence records from the repository", async () => {
    const rows = [{ employee_id: 12, attendance_status: "PRESENT", work_mode: "WFH" }];
    getCompanyPresenceRepository.mockResolvedValue(rows);

    await expect(getCompanyPresenceService()).resolves.toBe(rows);
  });

  it.each(["HR", "ADMIN", "MANAGER", "SUPER_ADMIN"])("lets %s set today's work mode", async (role) => {
    const record = { employee_id: 12, work_mode: "WFH" };
    setEmployeeWorkModeRepository.mockResolvedValue(record);

    await expect(
      setEmployeeWorkModeService(12, "wfh", { id: 8, role })
    ).resolves.toBe(record);
    expect(setEmployeeWorkModeRepository).toHaveBeenCalledWith(12, "WFH", 8);
  });

  it("prevents employees from changing work mode", async () => {
    await expect(
      setEmployeeWorkModeService(12, "WFH", { id: 9, role: "EMPLOYEE" })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(setEmployeeWorkModeRepository).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid employee id", "not-an-id", "OFFICE", { id: 8, role: "HR" }, 400],
    ["invalid work mode", 12, "REMOTE", { id: 8, role: "HR" }, 400],
  ])("rejects %s", async (_caseName, employeeId, workMode, user, statusCode) => {
    await expect(
      setEmployeeWorkModeService(employeeId, workMode, user)
    ).rejects.toMatchObject({ statusCode });
    expect(setEmployeeWorkModeRepository).not.toHaveBeenCalled();
  });

  it("reports a missing active employee instead of returning success", async () => {
    setEmployeeWorkModeRepository.mockResolvedValue(null);

    await expect(
      setEmployeeWorkModeService(12, "OFFICE", { id: 8, role: "ADMIN" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

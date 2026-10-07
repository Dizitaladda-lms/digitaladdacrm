import { afterEach, describe, expect, it, vi } from "vitest";
import * as attendanceRepository from "../repositories/attendanceRepository.js";
import { resetEmployeeBiometricService } from "../services/attendanceService.js";

describe("resetEmployeeBiometricService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not let an employee reset their own passkey", async () => {
    const deleteBiometric = vi.spyOn(attendanceRepository, "deleteEmployeeBiometricRepository");

    await expect(
      resetEmployeeBiometricService(23, { id: 23, role: "EMPLOYEE" })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(deleteBiometric).not.toHaveBeenCalled();
  });

  it("requires HR to provide a valid employee ID", async () => {
    const deleteBiometric = vi.spyOn(attendanceRepository, "deleteEmployeeBiometricRepository");

    await expect(
      resetEmployeeBiometricService(undefined, { id: 2, role: "HR" })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(deleteBiometric).not.toHaveBeenCalled();
  });

  it("lets HR reset the employee passkey", async () => {
    vi.spyOn(attendanceRepository, "deleteEmployeeBiometricRepository")
      .mockResolvedValue({ id: 7, employee_id: 23 });

    await expect(
      resetEmployeeBiometricService("23", { id: 2, role: "HR" })
    ).resolves.toMatchObject({ employee_id: 23 });
  });
});

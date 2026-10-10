import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findEmployeeByUserIdRepository,
  findEmployeeRosterByMonthRepository,
  upsertEmployeeRosterRepository,
} = vi.hoisted(() => ({
  findEmployeeByUserIdRepository: vi.fn(),
  findEmployeeRosterByMonthRepository: vi.fn(),
  upsertEmployeeRosterRepository: vi.fn(),
}));

vi.mock("../repositories/employeeRepository.js", () => ({
  findEmployeeByUserIdRepository,
}));

vi.mock("../repositories/rosterRepository.js", () => ({
  findRosterByIdRepository: vi.fn(),
  findEmployeeRosterByMonthRepository,
  upsertEmployeeRosterRepository,
  updateRosterStatusRepository: vi.fn(),
  updateRosterByHRRepository: vi.fn(),
  requestRosterChangeRepository: vi.fn(),
  getAllEmployeesRosterForMonthRepository: vi.fn(),
}));

import { saveMyMonthlyRosterService } from "../services/rosterService.js";

describe("approved roster resubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findEmployeeByUserIdRepository.mockResolvedValue({ id: 42, department_id: 3 });
    findEmployeeRosterByMonthRepository.mockResolvedValue({
      id: 17,
      status: "APPROVED",
      submitted_at: new Date("2026-10-01T00:00:00.000Z"),
    });
    upsertEmployeeRosterRepository.mockImplementation(async (roster) => roster);
  });

  it("allows an employee to edit an approved roster and resubmit it to HR", async () => {
    const updated = await saveMyMonthlyRosterService(
      { id: 8 },
      {
        year: 2026,
        month: 10,
        days_data: [{ day: 1, status: "WORKING" }, { day: 2, status: "WEEK_OFF" }],
        submission_note: "Updated schedule",
        isSubmit: true,
      }
    );

    expect(updated.status).toBe("SUBMITTED");
    expect(updated.employee_id).toBe(42);
    expect(updated.submitted_at).toBeInstanceOf(Date);
    expect(upsertEmployeeRosterRepository).toHaveBeenCalledOnce();
  });

  it("still allows saving an approved roster as a draft before resubmitting", async () => {
    const updated = await saveMyMonthlyRosterService(
      { id: 8 },
      {
        year: 2026,
        month: 10,
        days_data: [{ day: 1, status: "WORKING" }],
        isSubmit: false,
      }
    );

    expect(updated.status).toBe("DRAFT");
    expect(updated.submitted_at).toBeInstanceOf(Date);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindEmployeeById,
  mockUpsertEmployeeAttendance,
  mockGetEmployeeAttendanceQuotaSummary,
} = vi.hoisted(() => ({
  mockFindEmployeeById: vi.fn(),
  mockUpsertEmployeeAttendance: vi.fn(),
  mockGetEmployeeAttendanceQuotaSummary: vi.fn(),
}));

vi.mock("../repositories/attendanceRepository.js", () => ({
  getWhitelistedIPsRepository: vi.fn(),
  addWhitelistedIPRepository: vi.fn(),
  deleteWhitelistedIPRepository: vi.fn(),
  findEmployeeBiometricRepository: vi.fn(),
  saveEmployeeBiometricRepository: vi.fn(),
  deleteEmployeeBiometricRepository: vi.fn(),
  getPendingBiometricApprovalsRepository: vi.fn(),
  saveEmployeeBiometricChallengeRepository: vi.fn(),
  consumeEmployeeBiometricChallengeRepository: vi.fn(),
  updateEmployeeBiometricCounterRepository: vi.fn(),
  approveBiometricRepository: vi.fn(),
  rejectBiometricRepository: vi.fn(),
  findTodayAttendanceRepository: vi.fn(),
  createAttendanceCheckInRepository: vi.fn(),
  updateAttendanceCheckOutRepository: vi.fn(),
  autoCheckOutOpenAttendancesRepository: vi.fn(),
  getMyAttendanceHistoryRepository: vi.fn(),
  getHRAttendanceReportsRepository: vi.fn(),
  findEmployeeByIdForAttendanceRepository: mockFindEmployeeById,
  upsertEmployeeAttendanceByHRRepository: mockUpsertEmployeeAttendance,
  getEmployeeAttendanceQuotaSummaryRepository: mockGetEmployeeAttendanceQuotaSummary,
}));

vi.mock("../repositories/employeeRepository.js", () => ({
  findEmployeeByUserIdRepository: vi.fn(),
}));

import {
  upsertEmployeeAttendanceByHRService,
  getEmployeeAttendanceQuotaSummaryService,
} from "../services/attendanceService.js";

describe("HR Attendance Mark & Edit Time Service (upsertEmployeeAttendanceByHRService)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindEmployeeById.mockResolvedValue({
      id: 25,
      full_name: "Rohan Sharma",
      shift_timing_type: "DEFAULT",
      shift_start_time: "10:00",
      shift_end_time: "18:00",
    });
    mockUpsertEmployeeAttendance.mockImplementation(async (args) => ({
      id: 901,
      ...args,
    }));
  });

  it("allows HR to mark employee attendance and edits check-in / check-out times with accurate total_hours", async () => {
    const res = await upsertEmployeeAttendanceByHRService(
      {
        employee_id: 25,
        date: "2026-10-12",
        check_in_time: "09:55",
        check_out_time: "18:10",
        status: "AUTO",
      },
      { id: 5, role: "HR", full_name: "Neha HR" },
      { headers: {} }
    );

    expect(mockUpsertEmployeeAttendance).toHaveBeenCalledTimes(1);
    expect(res.employee_id).toBe(25);
    expect(res.date).toBe("2026-10-12");
    expect(res.status).toBe("PRESENT");
    expect(res.total_hours).toBe(8.25);
    expect(res.check_in_time).toBe(new Date("2026-10-12T09:55:00+05:30").toISOString());
    expect(res.check_out_time).toBe(new Date("2026-10-12T18:10:00+05:30").toISOString());
  });

  it("marks status as LATE in AUTO mode when check-in time is after shift start time", async () => {
    const res = await upsertEmployeeAttendanceByHRService(
      {
        employee_id: 25,
        date: "2026-10-12", // Monday
        check_in_time: "10:35",
        check_out_time: "",
        status: "AUTO",
      },
      { id: 5, role: "HR", full_name: "Neha HR" },
      { headers: {} }
    );

    expect(res.status).toBe("LATE");
    expect(res.check_out_time).toBeNull();
    expect(res.total_hours).toBe(0);
  });

  it("rejects unauthorized non-HR users with 403", async () => {
    await expect(
      upsertEmployeeAttendanceByHRService(
        { employee_id: 25, date: "2026-10-12", check_in_time: "10:00" },
        { id: 99, role: "COUNSELLOR" },
        { headers: {} }
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects check-out time earlier than check-in time with 400", async () => {
    await expect(
      upsertEmployeeAttendanceByHRService(
        {
          employee_id: 25,
          date: "2026-10-12",
          check_in_time: "14:00",
          check_out_time: "11:00",
        },
        { id: 5, role: "HR" },
        { headers: {} }
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("marks status as WEEK_OFF and clears check-in/out times and sets total_hours to 0", async () => {
    const res = await upsertEmployeeAttendanceByHRService(
      {
        employee_id: 25,
        date: "2026-10-18",
        status: "WEEK_OFF",
      },
      { id: 5, role: "HR" },
      { headers: {} }
    );

    expect(res.status).toBe("WEEK_OFF");
    expect(res.check_in_time).toBeNull();
    expect(res.check_out_time).toBeNull();
    expect(res.total_hours).toBe(0);
  });

  it("fetches employee attendance quota summary for authorized HR", async () => {
    mockGetEmployeeAttendanceQuotaSummary.mockResolvedValue({
      employee_id: 25,
      year: 2026,
      month: 10,
      monthly_week_offs: { allowed: 4, used: 1, remaining: 3 },
      yearly_leaves: { allowed: 12, used: 2, remaining: 10 },
    });

    const res = await getEmployeeAttendanceQuotaSummaryService(25, "2026-10-26", {
      id: 5,
      role: "HR",
    });

    expect(res.monthly_week_offs.remaining).toBe(3);
    expect(res.yearly_leaves.remaining).toBe(10);
  });
});

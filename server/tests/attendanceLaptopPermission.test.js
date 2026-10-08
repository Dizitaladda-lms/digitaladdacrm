import { beforeEach, describe, expect, it, vi } from "vitest";

const { findEmployeeByUserIdRepository } = vi.hoisted(() => ({
  findEmployeeByUserIdRepository: vi.fn(),
}));

vi.mock("../repositories/employeeRepository.js", () => ({
  findEmployeeByUserIdRepository,
}));

import {
  checkInAttendanceService,
  checkOutAttendanceService,
} from "../services/attendanceService.js";

const desktopRequest = {
  headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0" },
};

const mobileRequest = {
  headers: { "user-agent": "Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/130.0 Mobile" },
};

describe("laptop attendance permission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["check-in", checkInAttendanceService],
    ["check-out", checkOutAttendanceService],
  ])("blocks laptop %s when HR has not enabled it", async (_action, service) => {
    findEmployeeByUserIdRepository.mockResolvedValue({
      id: 42,
      laptop_attendance_enabled: false,
    });

    await expect(service({}, { id: 7 }, desktopRequest)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("allows a laptop with HR permission to proceed to geofence validation", async () => {
    findEmployeeByUserIdRepository.mockResolvedValue({
      id: 42,
      laptop_attendance_enabled: true,
    });

    await expect(
      checkInAttendanceService({}, { id: 7 }, desktopRequest)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("keeps mobile attendance available without laptop permission", async () => {
    findEmployeeByUserIdRepository.mockResolvedValue({
      id: 42,
      laptop_attendance_enabled: false,
    });

    await expect(
      checkInAttendanceService({}, { id: 7 }, mobileRequest)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

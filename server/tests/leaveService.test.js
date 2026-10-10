import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createLeaveRequestRepository,
  findDepartmentHeadRepository,
  findEmployeeLeaveDetailsRepository,
  getPendingDepartmentHeadLeaveRequestsRepository,
  getPendingHRLeaveRequestsRepository,
  isDepartmentHeadRepository,
} = vi.hoisted(() => ({
  createLeaveRequestRepository: vi.fn(),
  findDepartmentHeadRepository: vi.fn(),
  findEmployeeLeaveDetailsRepository: vi.fn(),
  getPendingDepartmentHeadLeaveRequestsRepository: vi.fn(),
  getPendingHRLeaveRequestsRepository: vi.fn(),
  isDepartmentHeadRepository: vi.fn(),
}));

vi.mock("../repositories/leaveRepository.js", () => ({
  createLeaveRequestRepository,
  decideLeaveRequestRepository: vi.fn(),
  findDepartmentHeadRepository,
  findEmployeeLeaveDetailsRepository,
  getMyLeaveRequestsRepository: vi.fn(),
  getPendingDepartmentHeadLeaveRequestsRepository,
  getPendingHRLeaveRequestsRepository,
  isDepartmentHeadRepository,
}));

import {
  createLeaveRequestService,
  getPendingLeaveApprovalsService,
} from "../services/leaveService.js";

describe("leave service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findEmployeeLeaveDetailsRepository.mockResolvedValue({ id: 21, department_id: 6 });
    findDepartmentHeadRepository.mockResolvedValue({ user_id: 44 });
    createLeaveRequestRepository.mockImplementation(async (request) => request);
    getPendingHRLeaveRequestsRepository.mockResolvedValue([]);
    getPendingDepartmentHeadLeaveRequestsRepository.mockResolvedValue([]);
    isDepartmentHeadRepository.mockResolvedValue(false);
  });

  it("routes future planned leave to department head approval first", async () => {
    const result = await createLeaveRequestService({
      leave_type: "PLANNED",
      start_date: "2099-05-10",
      end_date: "2099-05-12",
      reason: "Family event",
    }, { id: 9 });

    expect(result.status).toBe("PENDING_DEPARTMENT_HEAD");
    expect(findDepartmentHeadRepository).toHaveBeenCalledWith(6, 9);
  });

  it("routes urgent leave directly to HR without a department-head lookup", async () => {
    const result = await createLeaveRequestService({
      leave_type: "URGENT",
      start_date: "2026-10-10",
      end_date: "2026-10-10",
      reason: "Medical emergency",
    }, { id: 9 });

    expect(result.status).toBe("PENDING_HR_APPROVAL");
    expect(findDepartmentHeadRepository).not.toHaveBeenCalled();
  });

  it("does not create a planned leave request without a department head", async () => {
    findDepartmentHeadRepository.mockResolvedValue(null);

    await expect(createLeaveRequestService({
      leave_type: "PLANNED",
      start_date: "2099-05-10",
      end_date: "2099-05-10",
      reason: "Family event",
    }, { id: 9 })).rejects.toMatchObject({ statusCode: 409 });
    expect(createLeaveRequestRepository).not.toHaveBeenCalled();
  });

  it("rejects impossible calendar dates", async () => {
    await expect(createLeaveRequestService({
      leave_type: "URGENT",
      start_date: "2026-02-31",
      end_date: "2026-03-01",
      reason: "Medical emergency",
    }, { id: 9 })).rejects.toMatchObject({ statusCode: 400 });
    expect(findEmployeeLeaveDetailsRepository).not.toHaveBeenCalled();
  });

  it("requires planned leave to start in the future", async () => {
    const date = new Date().toISOString().slice(0, 10);
    await expect(createLeaveRequestService({
      leave_type: "PLANNED",
      start_date: date,
      end_date: date,
      reason: "Family event",
    }, { id: 9 })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("shows department approval queue to department heads by designation", async () => {
    isDepartmentHeadRepository.mockResolvedValue(true);

    await getPendingLeaveApprovalsService({ id: 44, role: "EMPLOYEE" });

    expect(getPendingDepartmentHeadLeaveRequestsRepository).toHaveBeenCalledWith(44);
    expect(getPendingHRLeaveRequestsRepository).not.toHaveBeenCalled();
  });

  it("shows HR approval queue to HR", async () => {
    await getPendingLeaveApprovalsService({ id: 5, role: "HR" });

    expect(getPendingHRLeaveRequestsRepository).toHaveBeenCalledOnce();
  });
});

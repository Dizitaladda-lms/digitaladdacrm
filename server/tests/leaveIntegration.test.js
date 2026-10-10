import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock("../config/db.js", () => ({
  default: mockPool,
  withTransaction: vi.fn((fn) => fn(mockPool)),
}));

import {
  createLeaveRequestRepository,
  findDepartmentHeadRepository,
  findEmployeeLeaveDetailsRepository,
  decideLeaveRequestRepository,
} from "../repositories/leaveRepository.js";

describe("leave integration flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a planned leave request routed to department head", async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 100, department_id: 5 }],
    });

    const request = await createLeaveRequestRepository({
      userId: 100,
      employeeId: 1,
      departmentId: 5,
      leaveType: "PLANNED",
      startDate: "2099-05-15",
      endDate: "2099-05-17",
      reason: "Vacation",
      status: "PENDING_DEPARTMENT_HEAD",
    });

    expect(request.status).toBe("PENDING_DEPARTMENT_HEAD");
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO employee_leave_requests"),
      expect.arrayContaining([
        100,
        1,
        5,
        "PLANNED",
        "2099-05-15",
        "2099-05-17",
        "Vacation",
        "PENDING_DEPARTMENT_HEAD",
      ])
    );
  });

  it("creates an urgent leave request routed to HR", async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 2, user_id: 100, department_id: 5, status: "PENDING_HR_APPROVAL" }],
    });

    const request = await createLeaveRequestRepository({
      userId: 100,
      employeeId: 1,
      departmentId: 5,
      leaveType: "URGENT",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
      reason: "Emergency",
      status: "PENDING_HR_APPROVAL",
    });

    expect(request.status).toBe("PENDING_HR_APPROVAL");
  });

  it("authorizes only department heads to approve planned leave", async () => {
    const mockTransaction = vi.fn();
    mockTransaction
      .mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 7, department_id: 5, status: "PENDING_DEPARTMENT_HEAD" }],
      })
      .mockResolvedValueOnce({
        rows: [{ allowed: true }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, status: "PENDING_HR_APPROVAL" }],
      });

    vi.mocked(mockPool).query = mockTransaction;

    const result = await decideLeaveRequestRepository({
      id: 1,
      user: { id: 44, role: "MANAGER" },
      decision: "APPROVE",
      reason: null,
    });

    expect(result.status).toBe("PENDING_HR_APPROVAL");
    expect(mockTransaction.mock.calls[1][0]).toContain("EXISTS");
  });

  it("enforces HR-only approval for final stage", async () => {
    const mockTransaction = vi.fn();
    mockTransaction.mockResolvedValueOnce({
      rows: [{ id: 2, user_id: 7, department_id: 5, status: "PENDING_HR_APPROVAL" }],
    });

    vi.mocked(mockPool).query = mockTransaction;

    const result = await decideLeaveRequestRepository({
      id: 2,
      user: { id: 5, role: "HR" },
      decision: "APPROVE",
      reason: null,
    });

    expect(result.status).toBe("APPROVED");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { findReportByIdRepository, reportExistsByIdRepository, reviewReportAsHRRepository } = vi.hoisted(() => ({
  findReportByIdRepository: vi.fn(),
  reportExistsByIdRepository: vi.fn(),
  reviewReportAsHRRepository: vi.fn(),
}));

vi.mock("../repositories/reportRepository.js", () => ({
  upsertDailyReportRepository: vi.fn(),
  syncReportClassesRepository: vi.fn(),
  findReportByIdRepository,
  reportExistsByIdRepository,
  findMyReportByDateRepository: vi.fn(),
  findMyReportsHistoryRepository: vi.fn(),
  findTeamReportsRepository: vi.fn(),
  reviewReportAsTLRepository: vi.fn(),
  reviewReportAsHRRepository,
  reviewReportAsSuperAdminRepository: vi.fn(),
  findHROverviewRepository: vi.fn(),
  findAllCompanyReportsRepository: vi.fn(),
  findClassesAuditRepository: vi.fn(),
}));

import { getReportByIdService, reviewReportAsHRService } from "../services/reportService.js";

describe("HR report review authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findReportByIdRepository.mockResolvedValue({
      id: 40,
      user_id: 90,
      hr_id: 8,
      status: "TL_REVIEWED",
    });
    reviewReportAsHRRepository.mockResolvedValue({ id: 40, status: "HR_APPROVED" });
  });

  it("allows an authenticated HR user to review a report assigned to another HR approver", async () => {
    await expect(
      reviewReportAsHRService(
        { id: 25, role: "HR" },
        40,
        { status: "HR_APPROVED" }
      )
    ).resolves.toEqual({ id: 40, status: "HR_APPROVED" });

    expect(reviewReportAsHRRepository).toHaveBeenCalledWith(
      40,
      25,
      "",
      "HR_APPROVED"
    );
  });

  it("continues to allow the assigned approver", async () => {
    await expect(
      reviewReportAsHRService(
        { id: 8, role: "EMPLOYEE" },
        40,
        { status: "HR_APPROVED" }
      )
    ).resolves.toEqual({ id: 40, status: "HR_APPROVED" });
  });

  it("rejects a non-HR user who is not the assigned approver", async () => {
    await expect(
      reviewReportAsHRService(
        { id: 25, role: "EMPLOYEE" },
        40,
        { status: "HR_APPROVED" }
      )
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(reviewReportAsHRRepository).not.toHaveBeenCalled();
  });

  it("returns 403 when a report ID belongs to a user outside the caller's visibility scope", async () => {
    await expect(
      getReportByIdService(40, { id: 25 }, { unrestricted: false, userIds: [25], reportIds: [] })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

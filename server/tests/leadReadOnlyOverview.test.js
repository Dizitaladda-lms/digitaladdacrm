import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  getLeadsRepository: vi.fn(),
}));

vi.mock("../repositories/leadRepository.js", () => ({
  getLeadsRepository: dependencies.getLeadsRepository,
  getNextLeadCodeRepository: vi.fn(),
  createLeadRepository: vi.fn(),
  findLeadByEmailRepository: vi.fn(),
  findLeadByMobileRepository: vi.fn(),
  findLeadByIdRepository: vi.fn(),
  updateLeadRepository: vi.fn(),
  deleteLeadRepository: vi.fn(),
  deleteBulkLeadsRepository: vi.fn(),
  restoreLeadRepository: vi.fn(),
  getLeadStatisticsRepository: vi.fn(),
  assignLeadRepository: vi.fn(),
  updateLeadStatusRepository: vi.fn(),
  assignBulkLeadsRepository: vi.fn(),
  addLeadNoteRepository: vi.fn(),
  getLeadNotesRepository: vi.fn(),
  getLeadTimelineRepository: vi.fn(),
}));

vi.mock("../repositories/leadCaptureRepository.js", () => ({
  updateExistingLeadRepository: vi.fn(),
}));

vi.mock("../repositories/employeeRepository.js", () => ({
  findEmployeeByIdRepository: vi.fn(),
  findEmployeeByUserIdRepository: vi.fn(),
}));

vi.mock("../repositories/leadAssignmentRepository.js", () => ({
  createAssignmentHistoryRepository: vi.fn(),
}));

vi.mock("../repositories/admissionRepository.js", () => ({
  getAdmissionByLeadIdRepository: vi.fn(),
}));

vi.mock("../services/leadTimeline.service.js", () => ({
  addTimelineEventService: vi.fn(),
}));

vi.mock("../services/pushNotificationService.js", () => ({
  sendPushToEmployeesService: vi.fn(),
}));

vi.mock("../utils/auditLogger.js", () => ({
  default: { log: vi.fn() },
}));

vi.mock("../config/db.js", () => ({
  default: { connect: vi.fn(), query: vi.fn() },
}));

import ApiError from "../utils/ApiError.js";
import { getReadOnlyLeadOverviewService } from "../services/leadService.js";

describe("read-only lead overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all lead table results for an explicitly enabled employee", async () => {
    const result = { leads: [{ id: 1 }], pagination: { totalRecords: 1 } };
    dependencies.getLeadsRepository.mockResolvedValue(result);
    const filters = { page: "2", limit: "25", status: "FOLLOW_UP" };

    await expect(
      getReadOnlyLeadOverviewService(filters, {
        id: 19,
        role: "EMPLOYEE",
        lead_overview_read_only: true,
      })
    ).resolves.toBe(result);

    expect(dependencies.getLeadsRepository).toHaveBeenCalledWith({
      ...filters,
      is_agency_lead: "all",
    });
  });

  it("denies overview access unless HR enabled it for the account", async () => {
    await expect(
      getReadOnlyLeadOverviewService({}, {
        id: 19,
        role: "EMPLOYEE",
        lead_overview_read_only: false,
      })
    ).rejects.toBeInstanceOf(ApiError);

    expect(dependencies.getLeadsRepository).not.toHaveBeenCalled();
  });
});

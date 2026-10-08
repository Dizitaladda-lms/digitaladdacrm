import { describe, it, expect, vi, beforeEach } from "vitest";
import pool from "../config/db.js";
import {
  canDepartmentHeadVerifyReport,
  getRoleLevel,
  assertNoReportingCycle,
  buildApprovalChain,
  getCurrentApproverForReport,
} from "../services/reportHierarchyService.js";

describe("report hierarchy service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps intern role to level 1", () => {
    expect(getRoleLevel({ role: "INTERN" })).toBe(1);
  });

  it("maps sub team lead role to level 2", () => {
    expect(getRoleLevel({ designation: "Sub-Team Lead" })).toBe(2);
  });

  it("maps department head to level 4", () => {
    expect(getRoleLevel({ designation: "Department Head" })).toBe(4);
  });

  it("rejects a manager assignment that would create a reporting cycle", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ creates_cycle: true, manager_exists: true }],
      }),
    };

    await expect(assertNoReportingCycle(client, 10, 20))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(client.query.mock.calls[0][1]).toEqual([20, 10]);
  });

  it("accepts a valid manager assignment", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ creates_cycle: false, manager_exists: true }],
      }),
    };

    await expect(assertNoReportingCycle(client, 10, 20)).resolves.toBeUndefined();
  });

  it("allows a department head to verify a pending report in an allowed department", () => {
    expect(canDepartmentHeadVerifyReport({
      reviewerUserId: 70,
      reviewerRole: "MANAGER",
      reviewerDesignation: "Department Head",
      reviewerDepartmentIds: [7],
      report: { user_id: 20, department_id: 7, status: "SUBMITTED" },
    })).toBe(true);
  });

  it("does not allow a department head to verify another department or a report already reviewed by its TL", () => {
    const reviewer = {
      reviewerUserId: 70,
      reviewerRole: "MANAGER",
      reviewerDesignation: "Department Head",
      reviewerDepartmentIds: [7],
    };

    expect(canDepartmentHeadVerifyReport({
      ...reviewer,
      report: { user_id: 20, department_id: 8, status: "SUBMITTED" },
    })).toBe(false);
    expect(canDepartmentHeadVerifyReport({
      ...reviewer,
      report: { user_id: 20, department_id: 7, status: "TL_REVIEWED" },
    })).toBe(false);
  });

  it("builds the expected chain for an intern report", async () => {
    vi.spyOn(pool, "query").mockImplementation(async (query, params) => {
      if (query.includes("FROM employees e") && query.includes("WHERE e.user_id = $1")) {
        return {
          rows: [{
            id: 100,
            user_id: 20,
            full_name: "Ava",
            role: "INTERN",
            designation: "Intern",
            department_id: 7,
            reporting_manager_id: 50,
            status: "ACTIVE",
            user_name: "Ava",
            employment_type: "INTERN",
          }],
        };
      }

      if (query.includes("WHERE e.id = $1") && params[0] === 50) {
        return {
          rows: [{
            id: 50,
            user_id: 51,
            full_name: "Bharat",
            role: "TL",
            designation: "Team Lead",
            department_id: 7,
            reporting_manager_id: 60,
            status: "ACTIVE",
            user_name: "Bharat",
            employment_type: "FULL_TIME",
          }],
        };
      }

      if (query.includes("WHERE e.id = $1") && params[0] === 60) {
        return {
          rows: [{
            id: 60,
            user_id: 70,
            full_name: "Kavya",
            role: "MANAGER",
            designation: "Department Head",
            department_id: 7,
            reporting_manager_id: null,
            status: "ACTIVE",
            user_name: "Kavya",
            employment_type: "FULL_TIME",
          }],
        };
      }

      if (query.includes("FROM users u") && query.includes("WHERE u.role IN ('HR', 'SUPER_ADMIN', 'ADMIN')")) {
        return {
          rows: [
            { id: 8, full_name: "HR One", role: "HR", designation: "HR Executive", department_id: 7 },
            { id: 9, full_name: "Admin One", role: "SUPER_ADMIN", designation: "Superadmin", department_id: null },
          ],
        };
      }

      return { rows: [] };
    });

    const chain = await buildApprovalChain({
      submitterUserId: 20,
      submitterRole: "INTERN",
      submitterDesignation: "Intern",
      departmentId: 7,
    });

    expect(chain.map((step) => step.level)).toEqual([3, 4, 5, 6]);
  });

  it("returns the current approver for a submitted report", async () => {
    const report = { status: "SUBMITTED", tl_id: 40, hr_id: 98, super_admin_id: 101 };
    expect(await getCurrentApproverForReport(report)).toEqual({ id: 40, label: "TL" });
  });
});

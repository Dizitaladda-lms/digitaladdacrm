import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient, mockPoolQuery, mockWithTransaction } = vi.hoisted(() => {
  const client = {
    query: vi.fn(),
  };
  return {
    mockClient: client,
    mockPoolQuery: vi.fn(),
    mockWithTransaction: vi.fn(async (cb) => cb(client)),
  };
});

vi.mock("../config/db.js", () => ({
  default: { query: mockPoolQuery },
  withTransaction: mockWithTransaction,
}));

vi.mock("../repositories/reportRepository.js", () => ({
  findReportByIdRepository: vi.fn(async (id) => ({
    id,
    user_id: 101,
    work_title: "Daily SEO Tasks",
    tasks_summary: "Completed keyword research and backlink audit",
    status: "SUBMITTED",
    current_status: "PENDING",
  })),
  syncReportClassesRepository: vi.fn(async () => []),
}));

import {
  buildAndPersistApprovalChain,
  approveReportHierarchicalService,
  rejectReportHierarchicalService,
  editAndResubmitReportService,
  getSubordinateUserIds,
} from "../services/reportApprovalService.js";
import { getRoleLevel, REPORT_ROLE_LEVELS } from "../services/reportHierarchyService.js";

/**
 * Sample 6-Level Hierarchy Fixtures:
 * Level 6: Super Admin      (userId: 600, empId: 60)
 * Level 5: HR               (userId: 500, empId: 50, managerEmpId: 60)
 * Level 4: Department Head  (userId: 400, empId: 40, managerEmpId: 50, deptId: 10)
 * Level 3: Team Lead (TL)   (userId: 300, empId: 30, managerEmpId: 40, deptId: 10)
 * Level 2: Sub-TL           (userId: 200, empId: 20, managerEmpId: 30, deptId: 10)
 * Level 1: Intern           (userId: 101, empId: 11, managerEmpId: 20, deptId: 10)
 */
const HIERARCHY_NODES = {
  101: {
    user_id: 101,
    full_name: "Aarav Intern",
    user_role: "INTERN",
    emp_role: "INTERN",
    designation: "Digital Marketing Intern",
    employment_type: "INTERN",
    employee_id: 11,
    department_id: 10,
    reporting_manager_id: 20,
    reports_to: 200,
    is_active: true,
    user_deleted: false,
    emp_deleted: false,
    emp_status: "ACTIVE",
  },
  200: {
    user_id: 200,
    full_name: "Rohan Sub-TL",
    user_role: "SUB_TL",
    emp_role: "SUB_TL",
    designation: "Sub-Team Lead",
    employment_type: "FULL_TIME",
    employee_id: 20,
    department_id: 10,
    reporting_manager_id: 30,
    reports_to: 300,
    is_active: true,
    user_deleted: false,
    emp_deleted: false,
    emp_status: "ACTIVE",
  },
  300: {
    user_id: 300,
    full_name: "Amit Team Lead",
    user_role: "TL",
    emp_role: "TL",
    designation: "Team Lead",
    employment_type: "FULL_TIME",
    employee_id: 30,
    department_id: 10,
    reporting_manager_id: 40,
    reports_to: 400,
    is_active: true,
    user_deleted: false,
    emp_deleted: false,
    emp_status: "ACTIVE",
  },
  400: {
    user_id: 400,
    full_name: "Rajesh Dept Head",
    user_role: "DEPARTMENT_HEAD",
    emp_role: "DEPARTMENT_HEAD",
    designation: "Department Head",
    employment_type: "FULL_TIME",
    employee_id: 40,
    department_id: 10,
    reporting_manager_id: 50,
    reports_to: 500,
    is_active: true,
    user_deleted: false,
    emp_deleted: false,
    emp_status: "ACTIVE",
  },
  500: {
    user_id: 500,
    full_name: "Neha HR",
    user_id_num: 500,
    user_role: "HR",
    emp_role: "HR",
    designation: "HR Manager",
    employment_type: "FULL_TIME",
    employee_id: 50,
    department_id: 10,
    reporting_manager_id: 60,
    reports_to: 600,
    is_active: true,
    user_deleted: false,
    emp_deleted: false,
    emp_status: "ACTIVE",
  },
  600: {
    user_id: 600,
    full_name: "Vikram Super Admin",
    user_role: "SUPER_ADMIN",
    emp_role: "SUPER_ADMIN",
    designation: "Super Admin",
    employment_type: "FULL_TIME",
    employee_id: 60,
    department_id: 10,
    reporting_manager_id: null,
    reports_to: null,
    is_active: true,
    user_deleted: false,
    emp_deleted: false,
    emp_status: "ACTIVE",
  },
};

const BY_EMP_ID = Object.values(HIERARCHY_NODES).reduce((acc, node) => {
  acc[node.employee_id] = node;
  return acc;
}, {});

describe("6-Level Hierarchical Report Approval System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Role Hierarchy Level Resolution", () => {
    it("maps all 6 roles in strict order from Intern (1) up to Super Admin (6)", () => {
      expect(getRoleLevel({ role: "INTERN" })).toBe(REPORT_ROLE_LEVELS.INTERN);
      expect(getRoleLevel({ role: "SUB_TL" })).toBe(REPORT_ROLE_LEVELS.SUB_TL);
      expect(getRoleLevel({ role: "TL" })).toBe(REPORT_ROLE_LEVELS.TL);
      expect(getRoleLevel({ role: "DEPARTMENT_HEAD" })).toBe(REPORT_ROLE_LEVELS.DEPARTMENT_HEAD);
      expect(getRoleLevel({ role: "HR" })).toBe(REPORT_ROLE_LEVELS.HR);
      expect(getRoleLevel({ role: "SUPER_ADMIN" })).toBe(REPORT_ROLE_LEVELS.SUPER_ADMIN);
    });
  });

  describe("2. Approval Chain Creation on Report Submit", () => {
    it("builds the full 5-step approval chain for an Intern (Sub-TL -> TL -> Dept Head -> HR -> Super Admin) and sets Sub-TL as direct current reviewer", async () => {
      const insertedSteps = [];
      let updatedReportParams = null;

      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("WHERE u.id = $1") && sql.includes("FROM users u")) {
          const node = HIERARCHY_NODES[params[0]];
          return { rows: node ? [node] : [] };
        }
        if (sql.includes("WHERE e.id = $1") && sql.includes("FROM employees e")) {
          const node = BY_EMP_ID[params[0]];
          return { rows: node ? [node] : [] };
        }
        if (sql.includes("INSERT INTO report_approvals")) {
          insertedSteps.push({
            reportId: params[0],
            approverId: params[1],
            level: params[2],
            roleLabel: params[3],
          });
          return { rows: [] };
        }
        if (sql.includes("UPDATE daily_work_reports") && sql.includes("current_level_user_id")) {
          updatedReportParams = params;
          return { rows: [] };
        }
        return { rows: [] };
      });

      const steps = await buildAndPersistApprovalChain(
        mockClient,
        { id: 77, user_id: 101, department_id: 10, report_date: "2026-10-10" },
        { id: 101, role: "INTERN" }
      );

      expect(steps).toEqual([
        { approverId: 200, level: 2, roleLabel: "SUB_TL" },
        { approverId: 300, level: 3, roleLabel: "TL" },
        { approverId: 400, level: 4, roleLabel: "DEPARTMENT_HEAD" },
        { approverId: 500, level: 5, roleLabel: "HR" },
        { approverId: 600, level: 6, roleLabel: "SUPER_ADMIN" },
      ]);
      expect(insertedSteps).toHaveLength(5);
      // Direct manager (Sub-TL, user 200, level 2) must be set as current_level_user_id
      expect(updatedReportParams[0]).toBe(200);
      expect(updatedReportParams[1]).toBe(2);
    });
  });

  describe("3. Skip / Auto-Approval Logic (Upper Authority Direct Approval)", () => {
    it("auto-approves Sub-TL and TL with is_auto_approved = true when Department Head approves an Intern's report directly", async () => {
      // Simulated DB state for Report #77 submitted by Intern (101)
      const approvalRows = [
        { id: 1, report_id: 77, approver_id: 200, level: 2, role_label: "SUB_TL", status: "PENDING", is_auto_approved: false },
        { id: 2, report_id: 77, approver_id: 300, level: 3, role_label: "TL", status: "PENDING", is_auto_approved: false },
        { id: 3, report_id: 77, approver_id: 400, level: 4, role_label: "DEPARTMENT_HEAD", status: "PENDING", is_auto_approved: false },
        { id: 4, report_id: 77, approver_id: 500, level: 5, role_label: "HR", status: "PENDING", is_auto_approved: false },
        { id: 5, report_id: 77, approver_id: 600, level: 6, role_label: "SUPER_ADMIN", status: "PENDING", is_auto_approved: false },
      ];

      let reportHeaderUpdate = null;

      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("SELECT * FROM daily_work_reports WHERE id = $1 FOR UPDATE")) {
          return {
            rows: [
              {
                id: 77,
                user_id: 101,
                department_id: 10,
                report_date: "2026-10-10",
                status: "SUBMITTED",
                current_status: "PENDING",
                current_level_user_id: 200,
                current_approval_level: 2,
              },
            ],
          };
        }
        if (sql.includes("WHERE u.id = $1") && sql.includes("FROM users u")) {
          return { rows: [HIERARCHY_NODES[params[0]]] };
        }
        if (sql.includes("SELECT * FROM report_approvals WHERE report_id = $1 ORDER BY level ASC")) {
          return { rows: approvalRows.map((r) => ({ ...r })) };
        }
        // 1. Skip / Auto-Approval for all lower pending levels (level < 4)
        if (
          sql.includes("UPDATE report_approvals") &&
          sql.includes("is_auto_approved = TRUE") &&
          sql.includes("level < $4")
        ) {
          const [actorId, autoNote, , actorLevel] = params;
          for (const row of approvalRows) {
            if (row.level < actorLevel && row.status === "PENDING") {
              row.status = "APPROVED";
              row.is_auto_approved = true;
              row.acted_by_id = actorId;
              row.remarks = autoNote;
              row.acted_at = new Date().toISOString();
            }
          }
          return { rows: [] };
        }
        // 2. Direct approval at actor's level (Level 4 - Department Head)
        if (
          sql.includes("INSERT INTO report_approvals") &&
          sql.includes("is_auto_approved = FALSE") &&
          sql.includes("status = 'APPROVED'")
        ) {
          const [, actorId, level, , remarks] = params;
          const row = approvalRows.find((r) => r.level === level);
          if (row) {
            row.status = "APPROVED";
            row.is_auto_approved = false;
            row.acted_by_id = actorId;
            row.remarks = remarks;
            row.acted_at = new Date().toISOString();
          }
          return { rows: [] };
        }
        // 3. Find next pending level above actorLevel
        if (sql.includes("WHERE report_id = $1 AND level > $2 AND status = 'PENDING'")) {
          const [, actorLevel] = params;
          const next = approvalRows
            .filter((r) => r.level > actorLevel && r.status === "PENDING")
            .sort((a, b) => a.level - b.level);
          return { rows: next.length ? [next[0]] : [] };
        }
        if (sql.includes("UPDATE daily_work_reports") && sql.includes("SET status = $1")) {
          reportHeaderUpdate = {
            legacyStatus: params[0],
            overallCurrentStatus: params[1],
            nextLevelUserId: params[2],
            nextLevel: params[3],
          };
          return { rows: [] };
        }
        return { rows: [] };
      });

      mockPoolQuery.mockImplementation(async (sql) => {
        if (sql.includes("FROM report_approvals ra")) {
          return { rows: approvalRows };
        }
        return { rows: [] };
      });

      const updatedReport = await approveReportHierarchicalService(
        { id: 400, role: "DEPARTMENT_HEAD" },
        77,
        { remarks: "Verified directly by Department Head" }
      );

      // Verify Sub-TL (Level 2) and TL (Level 3) were BOTH auto-approved!
      const subTlStep = approvalRows.find((r) => r.level === 2);
      const tlStep = approvalRows.find((r) => r.level === 3);
      const deptHeadStep = approvalRows.find((r) => r.level === 4);
      const hrStep = approvalRows.find((r) => r.level === 5);

      expect(subTlStep.status).toBe("APPROVED");
      expect(subTlStep.is_auto_approved).toBe(true);
      expect(subTlStep.acted_by_id).toBe(400);
      expect(subTlStep.remarks).toContain("Auto-approved by higher authority");

      expect(tlStep.status).toBe("APPROVED");
      expect(tlStep.is_auto_approved).toBe(true);
      expect(tlStep.acted_by_id).toBe(400);

      // Department Head's own level is normal approval (is_auto_approved = false)
      expect(deptHeadStep.status).toBe("APPROVED");
      expect(deptHeadStep.is_auto_approved).toBe(false);
      expect(deptHeadStep.acted_by_id).toBe(400);
      expect(deptHeadStep.remarks).toBe("Verified directly by Department Head");

      // Next level (HR - Level 5) remains PENDING and becomes current_level_user_id
      expect(hrStep.status).toBe("PENDING");
      expect(reportHeaderUpdate).toEqual({
        legacyStatus: "TL_REVIEWED",
        overallCurrentStatus: "IN_REVIEW",
        nextLevelUserId: 500,
        nextLevel: 5,
      });
      expect(updatedReport.approvals).toHaveLength(5);
    });
  });

  describe("4. Reject & Resubmit Flow", () => {
    it("requires remarks when rejecting a report and returns report to submitter", async () => {
      await expect(
        rejectReportHierarchicalService({ id: 200, role: "SUB_TL" }, 77, { remarks: "   " })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("marks the report as REJECTED / REVISION_REQUESTED with remarks when rejected by reviewer, and resets chain to PENDING on resubmit", async () => {
      let rejectedUpdateParams = null;

      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("SELECT * FROM daily_work_reports WHERE id = $1 FOR UPDATE")) {
          return {
            rows: [
              {
                id: 77,
                user_id: 101,
                department_id: 10,
                report_date: "2026-10-10",
                status: "SUBMITTED",
                current_status: "PENDING",
                current_level_user_id: 200,
                current_approval_level: 2,
              },
            ],
          };
        }
        if (sql.includes("WHERE u.id = $1") && sql.includes("FROM users u")) {
          return { rows: [HIERARCHY_NODES[params[0]]] };
        }
        if (sql.includes("WHERE e.id = $1") && sql.includes("FROM employees e")) {
          return { rows: [BY_EMP_ID[params[0]]] };
        }
        if (sql.includes("SELECT * FROM report_approvals WHERE report_id = $1 ORDER BY level ASC")) {
          return {
            rows: [
              { id: 1, report_id: 77, approver_id: 200, level: 2, role_label: "SUB_TL", status: "PENDING" },
            ],
          };
        }
        if (sql.includes("SET status = 'REVISION_REQUESTED'")) {
          rejectedUpdateParams = params;
          return { rows: [] };
        }
        return { rows: [] };
      });

      await rejectReportHierarchicalService(
        { id: 200, role: "SUB_TL" },
        77,
        { remarks: "Please attach the campaign analytics screenshot." }
      );

      expect(rejectedUpdateParams).toEqual([
        "Please attach the campaign analytics screenshot.",
        2,
        77,
      ]);

      // Now test Resubmit by Intern (user 101)
      let resubmitResetCalled = false;
      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("SELECT * FROM daily_work_reports WHERE id = $1 FOR UPDATE")) {
          return {
            rows: [
              {
                id: 77,
                user_id: 101,
                department_id: 10,
                report_date: "2026-10-10",
                work_title: "Old Title",
                tasks_summary: "Old Summary",
                status: "REVISION_REQUESTED",
                current_status: "REJECTED",
              },
            ],
          };
        }
        if (sql.includes("UPDATE daily_work_reports") && sql.includes("RETURNING *")) {
          return {
            rows: [
              {
                id: 77,
                user_id: 101,
                department_id: 10,
                report_date: "2026-10-10",
                work_title: params[0],
                tasks_summary: params[1],
                status: "SUBMITTED",
                current_status: "PENDING",
              },
            ],
          };
        }
        if (sql.includes("WHERE u.id = $1") && sql.includes("FROM users u")) {
          return { rows: [HIERARCHY_NODES[params[0]]] };
        }
        if (sql.includes("WHERE e.id = $1") && sql.includes("FROM employees e")) {
          return { rows: [BY_EMP_ID[params[0]]] };
        }
        if (sql.includes("DELETE FROM report_approvals WHERE report_id = $1")) {
          resubmitResetCalled = true;
          return { rows: [] };
        }
        return { rows: [] };
      });

      await editAndResubmitReportService(
        { id: 101, role: "INTERN" },
        77,
        {
          work_title: "Updated SEO Report",
          tasks_summary: "Added campaign analytics screenshot and completed audit.",
        }
      );

      expect(resubmitResetCalled).toBe(true);
    });
  });

  describe("5. Tree-Based Visibility Rules (getSubordinateUserIds)", () => {
    it("grants Super Admin and HR organisation-wide subordinate visibility", async () => {
      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("WHERE u.id = $1") && sql.includes("FROM users u")) {
          return { rows: [HIERARCHY_NODES[params[0]]] };
        }
        if (sql.includes("SELECT id FROM users WHERE is_deleted = FALSE")) {
          return {
            rows: [{ id: 600 }, { id: 500 }, { id: 400 }, { id: 300 }, { id: 200 }, { id: 101 }],
          };
        }
        if (sql.includes("SELECT u.id") && sql.includes("FROM users u")) {
          return {
            rows: [
              { id: 500, user_role: "HR", emp_role: "HR", designation: "HR Manager", employment_type: "FULL_TIME" },
              { id: 400, user_role: "DEPARTMENT_HEAD", emp_role: "DEPARTMENT_HEAD", designation: "Department Head", employment_type: "FULL_TIME" },
              { id: 300, user_role: "TL", emp_role: "TL", designation: "Team Lead", employment_type: "FULL_TIME" },
              { id: 200, user_role: "SUB_TL", emp_role: "SUB_TL", designation: "Sub-Team Lead", employment_type: "FULL_TIME" },
              { id: 101, user_role: "INTERN", emp_role: "INTERN", designation: "Intern", employment_type: "INTERN" },
            ],
          };
        }
        return { rows: [] };
      });

      const saIds = await getSubordinateUserIds({ id: 600, role: "SUPER_ADMIN" }, mockClient);
      expect(saIds).toEqual([600, 500, 400, 300, 200, 101]);

      const hrIds = await getSubordinateUserIds({ id: 500, role: "HR" }, mockClient);
      expect(hrIds).toEqual(expect.arrayContaining([500, 400, 300, 200, 101]));
    });

    it("restricts Intern to only their own reports", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [HIERARCHY_NODES[101]] });
      const internIds = await getSubordinateUserIds({ id: 101, role: "INTERN" }, mockClient);
      expect(internIds).toEqual([101]);
    });

    it("restricts TL to only their own recursive subordinate tree (Sub-TL + Interns under them)", async () => {
      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("WITH RECURSIVE subordinates AS")) {
          return { rows: [{ user_id: 300 }, { user_id: 200 }, { user_id: 101 }] };
        }
        if (sql.includes("WHERE u.id = $1") && sql.includes("FROM users u")) {
          return { rows: [HIERARCHY_NODES[params[0]]] };
        }
        return { rows: [] };
      });

      const tlIds = await getSubordinateUserIds({ id: 300, role: "TL" }, mockClient);
      expect(tlIds).toEqual([300, 200, 101]);
      // Does not include TL2 (302) or Intern2 (102)
      expect(tlIds).not.toContain(302);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient, mockPoolQuery } = vi.hoisted(() => {
  const client = {
    query: vi.fn(),
  };
  return {
    mockClient: client,
    mockPoolQuery: vi.fn(),
  };
});

vi.mock("../config/db.js", () => ({
  default: { query: mockPoolQuery },
  withTransaction: vi.fn(async (cb) => cb(mockClient)),
}));

import {
  HIERARCHY_LEVELS,
  resolveRoleHierarchyLevel,
  getUpwardApprovalChain,
  getDownwardSubordinateUserIds,
  validateManagerAssignment,
} from "../services/hierarchyService.js";

describe("Hierarchy Service - Centralized Tree & Workflow Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role Hierarchy Level Resolution", () => {
    it("correctly resolves hierarchy levels for all 6 tiers", () => {
      expect(resolveRoleHierarchyLevel({ role: "INTERN" })).toBe(HIERARCHY_LEVELS.INTERN);
      expect(resolveRoleHierarchyLevel({ role: "SUB_TL" })).toBe(HIERARCHY_LEVELS.SUB_TL);
      expect(resolveRoleHierarchyLevel({ designation: "Sub-Team Lead" })).toBe(HIERARCHY_LEVELS.SUB_TL);
      expect(resolveRoleHierarchyLevel({ role: "TL" })).toBe(HIERARCHY_LEVELS.TL);
      expect(resolveRoleHierarchyLevel({ designation: "Team Lead" })).toBe(HIERARCHY_LEVELS.TL);
      expect(resolveRoleHierarchyLevel({ role: "DEPARTMENT_HEAD" })).toBe(HIERARCHY_LEVELS.DEPARTMENT_HEAD);
      expect(resolveRoleHierarchyLevel({ role: "MANAGER" })).toBe(HIERARCHY_LEVELS.DEPARTMENT_HEAD);
      expect(resolveRoleHierarchyLevel({ role: "HR" })).toBe(HIERARCHY_LEVELS.HR);
      expect(resolveRoleHierarchyLevel({ role: "SUPER_ADMIN" })).toBe(HIERARCHY_LEVELS.SUPER_ADMIN);
    });
  });

  describe("1. Full chain Intern -> Sub-TL -> TL -> Dept Head -> Super Admin", () => {
    it("dynamically resolves the full upward chain across all tiers in strict order", async () => {
      mockClient.query.mockImplementation(async (sql, params) => {
        // Recursive CTE query must be checked first before anchor users query
        if (sql.includes("WITH RECURSIVE upward_chain")) {
          return {
            rows: [
              {
                emp_id: 20,
                user_id: 200,
                full_name: "Rohan Sub-TL",
                role: "SUB_TL",
                designation: "Sub-Team Lead",
                employment_type: "FULL_TIME",
                department_id: 10,
                user_active: true,
                user_deleted: false,
                emp_deleted: false,
                emp_status: "ACTIVE",
              },
              {
                emp_id: 30,
                user_id: 300,
                full_name: "Amit TL",
                role: "TL",
                designation: "Team Lead",
                employment_type: "FULL_TIME",
                department_id: 10,
                user_active: true,
                user_deleted: false,
                emp_deleted: false,
                emp_status: "ACTIVE",
              },
              {
                emp_id: 40,
                user_id: 400,
                full_name: "Rajesh Dept Head",
                role: "DEPARTMENT_HEAD",
                designation: "Department Head",
                employment_type: "FULL_TIME",
                department_id: 10,
                user_active: true,
                user_deleted: false,
                emp_deleted: false,
                emp_status: "ACTIVE",
              },
            ],
          };
        }

        if (sql.includes("FROM users u") && sql.includes("WHERE u.id = $1")) {
          return {
            rows: [{
              user_id: 101,
              user_name: "Aarav Intern",
              user_role: "INTERN",
              emp_dept_id: 10,
              employee_id: 11,
              employee_role: "INTERN",
              designation: "Marketing Intern",
              employment_type: "INTERN",
              reporting_manager_id: 20,
            }],
          };
        }

        if (sql.includes("UPPER(u.role) = 'HR'")) {
          return {
            rows: [{ user_id: 500, full_name: "Neha HR", department_id: 10 }],
          };
        }

        if (sql.includes("UPPER(u.role) = 'SUPER_ADMIN'")) {
          return {
            rows: [{ user_id: 600, full_name: "Vikram Super Admin" }],
          };
        }

        return { rows: [] };
      });

      const chain = await getUpwardApprovalChain({
        submitterUserId: 101,
        departmentId: 10,
        clientOrPool: mockClient,
      });

      expect(chain.map((c) => ({ approverId: c.approverId, level: c.level, roleLabel: c.roleLabel }))).toEqual([
        { approverId: 200, level: HIERARCHY_LEVELS.SUB_TL, roleLabel: "SUB_TL" },
        { approverId: 300, level: HIERARCHY_LEVELS.TL, roleLabel: "TL" },
        { approverId: 400, level: HIERARCHY_LEVELS.DEPARTMENT_HEAD, roleLabel: "DEPARTMENT_HEAD" },
        { approverId: 500, level: HIERARCHY_LEVELS.HR, roleLabel: "HR" },
        { approverId: 600, level: HIERARCHY_LEVELS.SUPER_ADMIN, roleLabel: "SUPER_ADMIN" },
      ]);
    });
  });

  describe("2. Missing middle level (no Sub-TL in pod)", () => {
    it("smoothly skips the missing Sub-TL level and routes directly to TL and above", async () => {
      mockClient.query.mockImplementation(async (sql) => {
        if (sql.includes("WITH RECURSIVE upward_chain")) {
          return {
            rows: [
              {
                emp_id: 30,
                user_id: 300,
                full_name: "Amit TL",
                role: "TL",
                designation: "Team Lead",
                department_id: 10,
                user_active: true,
                user_deleted: false,
                emp_deleted: false,
                emp_status: "ACTIVE",
              },
              {
                emp_id: 40,
                user_id: 400,
                full_name: "Rajesh Dept Head",
                role: "DEPARTMENT_HEAD",
                designation: "Department Head",
                department_id: 10,
                user_active: true,
                user_deleted: false,
                emp_deleted: false,
                emp_status: "ACTIVE",
              },
            ],
          };
        }

        if (sql.includes("FROM users u") && sql.includes("WHERE u.id = $1")) {
          return {
            rows: [{
              user_id: 102,
              user_name: "Direct Intern",
              user_role: "INTERN",
              emp_dept_id: 10,
              employee_id: 12,
              employee_role: "INTERN",
              designation: "Intern",
              reporting_manager_id: 30, // Reports directly to TL
            }],
          };
        }

        if (sql.includes("UPPER(u.role) = 'HR'")) {
          return { rows: [{ user_id: 500, full_name: "Neha HR", department_id: 10 }] };
        }
        if (sql.includes("UPPER(u.role) = 'SUPER_ADMIN'")) {
          return { rows: [{ user_id: 600, full_name: "Vikram Super Admin" }] };
        }
        return { rows: [] };
      });

      const chain = await getUpwardApprovalChain({
        submitterUserId: 102,
        departmentId: 10,
        clientOrPool: mockClient,
      });

      // Chain should start directly at TL (3), with Sub-TL (2) cleanly omitted
      expect(chain.map((c) => c.level)).toEqual([
        HIERARCHY_LEVELS.TL,
        HIERARCHY_LEVELS.DEPARTMENT_HEAD,
        HIERARCHY_LEVELS.HR,
        HIERARCHY_LEVELS.SUPER_ADMIN,
      ]);
    });
  });

  describe("3. Deactivated manager skipping", () => {
    it("detects inactive middle manager (user_active = false) and skips to next active manager", async () => {
      mockClient.query.mockImplementation(async (sql) => {
        if (sql.includes("WITH RECURSIVE upward_chain")) {
          return {
            rows: [
              // Rohan Sub-TL is deactivated!
              {
                emp_id: 20,
                user_id: 200,
                full_name: "Rohan Sub-TL",
                role: "SUB_TL",
                designation: "Sub-Team Lead",
                department_id: 10,
                user_active: false, // Inactive user
                user_deleted: false,
                emp_deleted: false,
                emp_status: "ACTIVE",
              },
              // Amit TL is active
              {
                emp_id: 30,
                user_id: 300,
                full_name: "Amit TL",
                role: "TL",
                designation: "Team Lead",
                department_id: 10,
                user_active: true,
                user_deleted: false,
                emp_deleted: false,
                emp_status: "ACTIVE",
              },
            ],
          };
        }

        if (sql.includes("FROM users u") && sql.includes("WHERE u.id = $1")) {
          return {
            rows: [{
              user_id: 103,
              user_name: "Pooja Intern",
              user_role: "INTERN",
              emp_dept_id: 10,
              employee_id: 13,
              employee_role: "INTERN",
              designation: "Intern",
              reporting_manager_id: 20,
            }],
          };
        }

        if (sql.includes("FROM employees e") && sql.includes("managed_department_ids")) {
          return {
            rows: [{ user_id: 400, full_name: "Rajesh Dept Head", role: "DEPARTMENT_HEAD", department_id: 10 }],
          };
        }
        if (sql.includes("UPPER(u.role) = 'HR'")) {
          return { rows: [{ user_id: 500, full_name: "Neha HR", department_id: 10 }] };
        }
        if (sql.includes("UPPER(u.role) = 'SUPER_ADMIN'")) {
          return { rows: [{ user_id: 600, full_name: "Vikram Super Admin" }] };
        }
        return { rows: [] };
      });

      const chain = await getUpwardApprovalChain({
        submitterUserId: 103,
        departmentId: 10,
        clientOrPool: mockClient,
      });

      // Rohan (userId: 200) was inactive, so chain must start directly at Amit TL (userId: 300)
      expect(chain.find((c) => c.approverId === 200)).toBeUndefined();
      expect(chain[0].approverId).toBe(300);
      expect(chain[0].roleLabel).toBe("TL");
    });
  });

  describe("4. TL isolation (TL A cannot see TL B's team)", () => {
    it("strictly isolates TL A's downward subordinate list to their own subtree, excluding TL B and their pod", async () => {
      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("WITH RECURSIVE subordinate_tree")) {
          const rootUserId = params[0];
          if (rootUserId === 301) {
            // TL A manages Sub-TL A1 (201) and Intern A2 (101)
            return { rows: [{ user_id: 301 }, { user_id: 201 }, { user_id: 101 }] };
          }
          if (rootUserId === 302) {
            // TL B manages Sub-TL B1 (202) and Intern B2 (102)
            return { rows: [{ user_id: 302 }, { user_id: 202 }, { user_id: 102 }] };
          }
        }

        if (sql.includes("FROM users u") && sql.includes("WHERE u.id = $1")) {
          const uId = params[0];
          if (uId === 301) {
            return {
              rows: [{
                user_id: 301,
                user_role: "TL",
                employee_role: "TL",
                designation: "Team Lead",
                emp_dept_id: 10,
              }],
            };
          }
          if (uId === 302) {
            return {
              rows: [{
                user_id: 302,
                user_role: "TL",
                employee_role: "TL",
                designation: "Team Lead",
                emp_dept_id: 10,
              }],
            };
          }
        }

        return { rows: [] };
      });

      const tlASubordinates = await getDownwardSubordinateUserIds({ id: 301, role: "TL" }, mockClient);
      const tlBSubordinates = await getDownwardSubordinateUserIds({ id: 302, role: "TL" }, mockClient);

      // TL A sees self and own team
      expect(tlASubordinates).toContain(301);
      expect(tlASubordinates).toContain(201);
      expect(tlASubordinates).toContain(101);

      // TL A CANNOT see any of TL B's members
      expect(tlASubordinates).not.toContain(302);
      expect(tlASubordinates).not.toContain(202);
      expect(tlASubordinates).not.toContain(102);

      // TL B sees only own team
      expect(tlBSubordinates).toContain(302);
      expect(tlBSubordinates).toContain(202);
      expect(tlBSubordinates).toContain(102);
      expect(tlBSubordinates).not.toContain(301);
      expect(tlBSubordinates).not.toContain(201);
      expect(tlBSubordinates).not.toContain(101);
    });
  });

  describe("5. Cross-department edge case", () => {
    it("handles an employee in Department 10 whose reporting manager is in Department 20", async () => {
      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("WITH RECURSIVE upward_chain")) {
          return {
            rows: [
              {
                emp_id: 55,
                user_id: 550,
                full_name: "External Dept Manager",
                role: "MANAGER",
                designation: "Tech Manager",
                department_id: 20, // Different department!
                user_active: true,
                user_deleted: false,
                emp_deleted: false,
                emp_status: "ACTIVE",
              },
            ],
          };
        }

        if (sql.includes("FROM users u") && sql.includes("WHERE u.id = $1")) {
          return {
            rows: [{
              user_id: 105,
              user_name: "Cross Dept Dev",
              user_role: "EMPLOYEE",
              emp_dept_id: 10,
              employee_id: 15,
              employee_role: "EMPLOYEE",
              designation: "Full Stack Developer",
              reporting_manager_id: 55, // Manager in Dept 20
            }],
          };
        }

        if (sql.includes("UPPER(u.role) = 'HR'")) {
          return { rows: [{ user_id: 500, full_name: "Neha HR", department_id: 10 }] };
        }
        if (sql.includes("UPPER(u.role) = 'SUPER_ADMIN'")) {
          return { rows: [{ user_id: 600, full_name: "Vikram Super Admin" }] };
        }
        return { rows: [] };
      });

      const chain = await getUpwardApprovalChain({
        submitterUserId: 105,
        departmentId: 10,
        clientOrPool: mockClient,
      });

      // Cross-department manager is successfully included in the chain
      const managerStep = chain.find((c) => c.approverId === 550);
      expect(managerStep).toBeDefined();
      expect(managerStep.departmentId).toBe(20);
      expect(managerStep.level).toBe(HIERARCHY_LEVELS.DEPARTMENT_HEAD);
    });
  });

  describe("6. Circular reference and self-reporting rejection", () => {
    it("rejects an employee attempting to assign themselves as their own reporting manager", async () => {
      await expect(
        validateManagerAssignment({
          employeeId: 10,
          managerId: 10,
          role: "COUNSELLOR",
          designation: "Counsellor",
          clientOrPool: mockClient,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/cannot be their own reporting manager/i),
      });
    });

    it("rejects circular reporting loops (e.g. A -> B -> A)", async () => {
      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("FROM employees e") && sql.includes("WHERE e.id = $1")) {
          return {
            rows: [{
              id: 20,
              user_id: 200,
              full_name: "Manager B",
              role: "MANAGER",
              designation: "Manager",
              status: "ACTIVE",
              is_deleted: false,
              user_active: true,
              user_deleted: false,
            }],
          };
        }

        if (sql.includes("WITH RECURSIVE mgr_path")) {
          // Detects loop: assigning manager 20 to employee 10 would create a cycle
          return { rows: [{ has_cycle: true }] };
        }

        return { rows: [] };
      });

      await expect(
        validateManagerAssignment({
          employeeId: 10,
          managerId: 20,
          role: "COUNSELLOR",
          designation: "Counsellor",
          clientOrPool: mockClient,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/circular reporting loop/i),
      });
    });

    it("rejects invalid role-to-role reporting hierarchy (e.g. TL reporting to an Intern)", async () => {
      mockClient.query.mockImplementation(async (sql) => {
        if (sql.includes("FROM employees e") && sql.includes("WHERE e.id = $1")) {
          return {
            rows: [{
              id: 5,
              user_id: 50,
              full_name: "Junior Intern",
              role: "INTERN",
              designation: "Intern",
              status: "ACTIVE",
              is_deleted: false,
              user_active: true,
              user_deleted: false,
            }],
          };
        }
        if (sql.includes("WITH RECURSIVE mgr_path")) {
          return { rows: [{ has_cycle: false }] };
        }
        return { rows: [] };
      });

      await expect(
        validateManagerAssignment({
          employeeId: 30,
          managerId: 5,
          role: "TL",
          designation: "Team Lead",
          clientOrPool: mockClient,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/cannot report to a lower level manager/i),
      });
    });
  });

  describe("7. Department Head sees every report in the department", () => {
    it("returns all users belonging to the managed department plus all reporting descendants", async () => {
      mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes("WITH RECURSIVE subordinate_tree")) {
          return { rows: [{ user_id: 401 }, { user_id: 301 }] };
        }

        if (sql.includes("COALESCE(e.department_id, u.department_id) = ANY")) {
          // Users in department 7 and 8
          return {
            rows: [
              { id: 101, emp_role: "INTERN", user_role: "INTERN", designation: "Intern" },
              { id: 102, emp_role: "COUNSELLOR", user_role: "COUNSELLOR", designation: "Counsellor" },
              { id: 301, emp_role: "TL", user_role: "TL", designation: "Team Lead" },
            ],
          };
        }

        if (sql.includes("FROM users u") && sql.includes("WHERE u.id = $1")) {
          return {
            rows: [{
              user_id: 401,
              user_role: "MANAGER",
              employee_role: "MANAGER",
              designation: "Department Head",
              emp_dept_id: 7,
              managed_department_ids: [7, 8],
            }],
          };
        }

        return { rows: [] };
      });

      const visibleUserIds = await getDownwardSubordinateUserIds(
        { id: 401, role: "MANAGER", designation: "Department Head" },
        mockClient
      );

      // Department Head sees self, their reporting descendants, and all department members
      expect(visibleUserIds).toContain(401);
      expect(visibleUserIds).toContain(301);
      expect(visibleUserIds).toContain(101);
      expect(visibleUserIds).toContain(102);
    });
  });
});

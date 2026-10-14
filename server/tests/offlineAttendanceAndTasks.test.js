import { afterEach, describe, expect, it, vi } from "vitest";
import pool from "../config/db.js";
import { syncOfflineAttendanceService } from "../services/attendanceService.js";
import { getTasksService } from "../services/taskService.js";
import * as employeeRepo from "../repositories/employeeRepository.js";
import * as attendanceRepo from "../repositories/attendanceRepository.js";
import * as taskRepo from "../repositories/taskRepository.js";

describe("Offline Attendance & Scoped Tasks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("syncOfflineAttendanceService", () => {
    it("successfully synchronizes offline check-in within office geofence", async () => {
      vi.spyOn(employeeRepo, "findEmployeeByUserIdRepository").mockResolvedValue({
        id: 101,
        user_id: 1,
        laptop_attendance_enabled: true,
      });

      vi.spyOn(attendanceRepo, "createAttendanceCheckInRepository").mockResolvedValue({
        id: 501,
        employee_id: 101,
        date: "2026-10-14",
        status: "PRESENT",
        check_in_location: "Dizital Adda Office Premises",
      });

      const req = {
        headers: {},
        ip: "127.0.0.1",
        get: () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      };

      const result = await syncOfflineAttendanceService(
        {
          punches: [
            {
              type: "check-in",
              latitude: 28.54175,
              longitude: 77.240611111,
              accuracy: 10,
              location_name: "Office Premises",
              punchTime: "2026-10-14T04:30:00.000Z",
            },
          ],
        },
        { id: 1, role: "EMPLOYEE" },
        req
      );

      expect(result.success).toBe(true);
      expect(result.processed_count).toBe(1);
      expect(result.results[0].action).toBe("check-in");
    });

    it("rejects offline punches that are outside the 100m geofence radius", async () => {
      vi.spyOn(employeeRepo, "findEmployeeByUserIdRepository").mockResolvedValue({
        id: 101,
        user_id: 1,
        laptop_attendance_enabled: true,
      });

      const req = {
        headers: {},
        ip: "127.0.0.1",
        get: () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      };

      await expect(
        syncOfflineAttendanceService(
          {
            punches: [
              {
                type: "check-in",
                latitude: 28.60000, // Several km away from office
                longitude: 77.20000,
                accuracy: 10,
                location_name: "Far Away",
                punchTime: "2026-10-14T04:30:00.000Z",
              },
            ],
          },
          { id: 1, role: "EMPLOYEE" },
          req
        )
      ).rejects.toThrow(/outside the 100m office geofence/i);
    });
  });

  describe("getTasksService Strict Scoping", () => {
    it("strictly isolates regular employee tasks so they can only see tasks assigned to them", async () => {
      vi.spyOn(pool, "query").mockResolvedValue({
        rows: [{ role: "EMPLOYEE", designation: "Junior SEO Executive" }],
      });

      const findSpy = vi.spyOn(taskRepo, "findTasksRepository").mockResolvedValue({
        tasks: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 1 },
      });

      // Regular employee attempts to view tasks of another user (assignedToId: 999)
      await getTasksService(
        { id: 45, role: "EMPLOYEE", designation: "Junior SEO Executive" },
        { assignedToId: 999 }
      );

      // Verify that assignedToId was strictly overridden to the caller's ID (45)
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedToId: 45,
          assignedById: undefined,
        })
      );
    });

    it("allows Department Head to view tasks assigned by them with scope=assigned_by_me", async () => {
      vi.spyOn(pool, "query").mockResolvedValue({
        rows: [{ role: "DEPARTMENT_HEAD", designation: "Head of Digital Marketing" }],
      });

      const findSpy = vi.spyOn(taskRepo, "findTasksRepository").mockResolvedValue({
        tasks: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 1 },
      });

      await getTasksService(
        { id: 12, role: "DEPARTMENT_HEAD", designation: "Head of Digital Marketing" },
        { scope: "assigned_by_me" }
      );

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedById: 12,
        })
      );
    });
  });
});

import pool from "../config/db.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";

const item = (row, data) => ({
  time: row.created_at || row.updated_at || row.registered_at || row.check_in_time || new Date().toISOString(),
  priority: "INFO",
  ...data,
});

/**
 * =========================================================================
 * Comprehensive Notification Service for All CRM Roles:
 * - Super Admin / Admin / Manager: Biometric Approvals, Reports, Leads, Admissions, Tasks, Attendance
 * - HR: Biometric Approvals, Reports Waiting HR Verification, Staff Attendance, Tasks
 * - Team Leader (TL): Reports Waiting TL Review from department, Assigned Tasks, Team Attendance
 * - Employees / Interns: Work Report Approvals/Revisions, Assigned Tasks, Follow-ups, Leads
 * =========================================================================
 */
export const getRoleNotificationsService = async (user) => {
  const role = String(user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isManager = ["ADMIN", "MANAGER"].includes(role);
  const isAdmin = isSuperAdmin || isManager;
  const isHR = role === "HR" || isAdmin;
  const isTL = role === "TL";
  const isCounsellor = role === "COUNSELLOR";

  const userId = Number(user?.id);
  const hasValidUserId = Number.isInteger(userId) && userId > 0;

  const notifications = [];

  try {
    // -------------------------------------------------------------
    // 1. PENDING FACE BIOMETRIC APPROVALS (For HR, Admin, Super Admin)
    // -------------------------------------------------------------
    if (isHR || isAdmin) {
      const { rows: biometrics } = await pool.query(`
        SELECT 
          b.id,
          b.approval_status,
          b.registered_at,
          e.full_name AS employee_name,
          e.employee_code,
          d.department_name
        FROM employee_biometrics b
        JOIN employees e ON b.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE b.approval_status = 'PENDING_APPROVAL'
        ORDER BY b.registered_at DESC
        LIMIT 10;
      `);

      biometrics.forEach((b) => {
        notifications.push(item(b, {
          id: `biometric_pending_${b.id}`,
          type: "BIOMETRIC_PENDING",
          category: "BIOMETRIC",
          title: "Face Biometric Approval Required",
          message: `${b.employee_name} (${b.department_name || "Staff"}) registered face recognition. Tap to approve.`,
          link: "/attendance-reports",
          priority: "URGENT",
          icon: "Fingerprint",
        }));
      });
    }

    // -------------------------------------------------------------
    // 2. DAILY WORK REPORTS WORKFLOW
    // -------------------------------------------------------------
    // (A) Team Leader: Reports from their direct reports needing TL review
    if (isTL && hasValidUserId) {
      const tlEmp = await findEmployeeByUserIdRepository(userId);
      if (tlEmp?.id) {
        const { rows: tlPendingReports } = await pool.query(`
          SELECT 
            r.id,
            r.user_id,
            r.report_date,
            r.role_type,
            r.work_title,
            r.tasks_summary,
            r.status,
            r.created_at,
            u.full_name AS user_name,
            d.department_name
          FROM daily_work_reports r
          JOIN users u ON r.user_id = u.id
          JOIN employees e ON e.user_id = r.user_id
          LEFT JOIN departments d ON r.department_id = d.id
          WHERE e.reporting_manager_id = $1
            AND r.user_id != $2
            AND r.status IN ('SUBMITTED', 'PENDING_TL_APPROVAL')
            AND r.report_date >= CURRENT_DATE - INTERVAL '3 days'
          ORDER BY r.created_at DESC
          LIMIT 10;
        `, [tlEmp.id, user.id]);

        tlPendingReports.forEach((rep) => {
          notifications.push(item(rep, {
            id: `rep_tl_pending_${rep.id}`,
            type: "DAILY_REPORT_TL_PENDING",
            category: "REPORT",
            title: "Team Report Awaiting TL Review",
            message: `${rep.user_name} (${rep.role_type || "Team Member"}) submitted report: ${rep.work_title || rep.tasks_summary || "Daily work log"}.`,
            link: "/team-reports",
            priority: "URGENT",
            icon: "ClipboardCheck",
          }));
        });
      }
    }

    // (B) HR & Admin: Reports verified by TL awaiting HR approval
    if (isHR || isAdmin) {
      const { rows: hrPendingReports } = await pool.query(`
        SELECT 
          r.id,
          r.user_id,
          r.report_date,
          r.role_type,
          r.work_title,
          r.tasks_summary,
          r.status,
          r.created_at,
          r.tl_reviewed_at,
          u.full_name AS user_name,
          d.department_name
        FROM daily_work_reports r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.status IN ('TL_REVIEWED', 'PENDING_HR_APPROVAL')
          AND r.report_date >= CURRENT_DATE - INTERVAL '4 days'
        ORDER BY COALESCE(r.tl_reviewed_at, r.created_at) DESC
        LIMIT 10;
      `);

      hrPendingReports.forEach((rep) => {
        notifications.push(item(rep, {
          id: `rep_hr_pending_${rep.id}`,
          type: "DAILY_REPORT_HR_PENDING",
          category: "REPORT",
          title: "Work Report Awaiting HR Approval",
          message: `TL verified report of ${rep.user_name} (${rep.department_name || "Team"}). Tap to review & approve.`,
          link: "/team-reports",
          priority: "URGENT",
          icon: "FileText",
        }));
      });
    }

    // (C) Admin / Super Admin: Today's department submissions overview
    if (isAdmin) {
      const { rows: recentSubmissions } = await pool.query(`
        SELECT 
          r.id,
          r.user_id,
          r.report_date,
          r.role_type,
          r.work_title,
          r.tasks_summary,
          r.status,
          r.created_at,
          u.full_name AS user_name,
          d.department_name
        FROM daily_work_reports r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.report_date = CURRENT_DATE
          AND r.status NOT IN ('TL_REVIEWED', 'PENDING_HR_APPROVAL')
        ORDER BY r.created_at DESC
        LIMIT 8;
      `);

      recentSubmissions.forEach((rep) => {
        notifications.push(item(rep, {
          id: `rep_submitted_${rep.id}`,
          type: "DAILY_REPORT_SUBMITTED",
          category: "REPORT",
          title: `Daily Work Report: ${rep.user_name}`,
          message: `${rep.role_type || "Staff"} (${rep.department_name || "General"}) submitted: ${rep.work_title || rep.tasks_summary || "Today's work"} [${rep.status}]`,
          link: "/team-reports",
          priority: "INFO",
          icon: "FileText",
        }));
      });
    }

    // (D) Individual User: Their own report review updates
    if (hasValidUserId) {
      const { rows: myReportStatus } = await pool.query(`
        SELECT r.id, r.report_date, r.status, r.tl_feedback, r.hr_feedback, r.updated_at
        FROM daily_work_reports r
        WHERE r.user_id = $1 
          AND r.status IN ('TL_REVIEWED', 'HR_APPROVED', 'HEAD_APPROVED', 'REVISION_REQUESTED')
          AND r.updated_at >= NOW() - INTERVAL '5 days'
        ORDER BY r.updated_at DESC
        LIMIT 5;
      `, [userId]);

      myReportStatus.forEach((rep) => {
        const isApproved = ["HR_APPROVED", "HEAD_APPROVED", "TL_REVIEWED"].includes(rep.status);
        notifications.push(item(rep, {
          id: `rep_status_${rep.id}_${new Date(rep.updated_at).getTime()}`,
          type: "DAILY_REPORT_STATUS",
          category: "REPORT",
          title: isApproved ? "Work Report Approved" : "Report Revision Requested",
          message: isApproved 
            ? `Your daily report for ${rep.report_date} was approved.`
            : `Feedback on your report for ${rep.report_date}: ${rep.tl_feedback || rep.hr_feedback || "Revision requested"}`,
          link: "/employee/daily-report",
          priority: isApproved ? "SUCCESS" : "WARNING",
          icon: isApproved ? "CheckCircle2" : "AlertCircle",
        }));
      });

      // -------------------------------------------------------------
      // 3. ASSIGNED TASKS & WORK REVISIONS
      // -------------------------------------------------------------
      // Tasks assigned to this user
      const { rows: myTasks } = await pool.query(`
        SELECT 
          t.id,
          t.title,
          t.priority,
          t.status,
          t.due_date,
          t.created_at,
          by_u.full_name AS assigned_by_name
        FROM assigned_tasks t
        LEFT JOIN users by_u ON t.assigned_by_id = by_u.id
        WHERE t.assigned_to_id = $1 
          AND t.status IN ('PENDING', 'IN_PROGRESS')
        ORDER BY t.created_at DESC
        LIMIT 5;
      `, [userId]);

      myTasks.forEach((t) => {
        notifications.push(item(t, {
          id: `task_assigned_${t.id}`,
          type: "TASK_ASSIGNED",
          category: "TASK",
          title: "New Work Task Assigned",
          message: `${t.assigned_by_name || "Manager"} assigned: ${t.title} ${t.due_date ? `(Due: ${t.due_date})` : ""}`,
          link: role === "EMPLOYEE" || isTL ? "/employee/my-tasks" : "/tasks",
          priority: t.priority === "URGENT" ? "URGENT" : "HIGH",
          icon: "CheckSquare",
        }));
      });

      // Tasks completed (for assigner / admin / manager)
      if (isAdmin || isTL || isHR) {
        const { rows: completedTasks } = await pool.query(`
          SELECT 
            t.id,
            t.title,
            t.status,
            t.updated_at,
            to_u.full_name AS assigned_to_name
          FROM assigned_tasks t
          JOIN users to_u ON t.assigned_to_id = to_u.id
          WHERE t.assigned_by_id = $1 
            AND t.status = 'COMPLETED'
            AND t.updated_at >= NOW() - INTERVAL '2 days'
          ORDER BY t.updated_at DESC
          LIMIT 5;
        `, [userId]);

        completedTasks.forEach((t) => {
          notifications.push(item(t, {
            id: `task_completed_${t.id}_${new Date(t.updated_at).getTime()}`,
            type: "TASK_UPDATE",
            category: "TASK",
            title: "Assigned Task Completed",
            message: `${t.assigned_to_name} completed task: "${t.title}"`,
            link: "/tasks",
            priority: "SUCCESS",
            icon: "CheckSquare",
          }));
        });
      }
    }

    // -------------------------------------------------------------
    // 4. LEADS & ADMISSIONS (Admin / Super Admin / Counsellor)
    // -------------------------------------------------------------
    if (isAdmin) {
      // Unassigned Leads
      const { rows: unassignedLeads } = await pool.query(`
        SELECT id, lead_code, full_name, interested_course, created_at 
        FROM leads
        WHERE assigned_to IS NULL AND is_deleted = FALSE 
        ORDER BY created_at DESC 
        LIMIT 8;
      `);

      unassignedLeads.forEach((lead) => {
        notifications.push(item(lead, {
          id: `unassigned_${lead.id}`,
          type: "UNASSIGNED_LEAD",
          category: "LEAD",
          title: "New Lead Needs Assignment",
          message: `${lead.full_name} inquired for ${lead.interested_course || "a course"} (${lead.lead_code}).`,
          link: "/leads",
          priority: "HIGH",
          icon: "UserPlus",
        }));
      });

      // Recent Admissions
      const { rows: admissions } = await pool.query(`
        SELECT id, admission_code, student_name, course_name, paid_fee, created_at 
        FROM admissions
        ORDER BY created_at DESC 
        LIMIT 5;
      `);

      admissions.forEach((a) => {
        notifications.push(item(a, {
          id: `adm_${a.id}`,
          type: "ADMISSION_DONE",
          category: "ADMISSION",
          title: "New Student Enrolled",
          message: `${a.student_name} confirmed enrollment for ${a.course_name}. Fee paid: ₹${Number(a.paid_fee || 0).toLocaleString("en-IN")}.`,
          link: "/admissions",
          priority: "SUCCESS",
          icon: "GraduationCap",
        }));
      });
    }

    // -------------------------------------------------------------
    // 5. ATTENDANCE LOGS (HR / Admin Check-in alerts)
    // -------------------------------------------------------------
    if (isHR || isAdmin) {
      const { rows: checkIns } = await pool.query(`
        SELECT 
          a.id,
          a.check_in_time,
          a.check_in_location,
          e.full_name AS employee_name,
          d.department_name
        FROM daily_attendance a
        JOIN employees e ON a.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE a.date = CURRENT_DATE 
          AND a.check_in_time >= NOW() - INTERVAL '3 hours'
        ORDER BY a.check_in_time DESC
        LIMIT 6;
      `);

      checkIns.forEach((a) => {
        const timeStr = new Date(a.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        notifications.push(item(a, {
          id: `att_in_${a.id}_${new Date(a.check_in_time).getTime()}`,
          type: "ATTENDANCE_CHECKIN",
          category: "ATTENDANCE",
          title: "Staff Check-In Marked",
          message: `${a.employee_name} (${a.department_name || "Staff"}) checked in at ${timeStr} ${a.check_in_location ? `📍 ${a.check_in_location}` : ""}`,
          link: "/attendance-reports",
          priority: "INFO",
          icon: "Fingerprint",
        }));
      });
    }

    // -------------------------------------------------------------
    // 6. COUNSELLOR / SALES FOLLOW-UPS & ASSIGNMENTS
    // -------------------------------------------------------------
    if (hasValidUserId && (isCounsellor || (!isAdmin && !isHR && !isTL))) {
      const employee = await findEmployeeByUserIdRepository(userId);
      if (employee) {
        const [dueNow, today, overdue, assignments] = await Promise.all([
          pool.query(`
            SELECT f.id, f.next_followup_at, l.full_name, l.mobile 
            FROM lead_followups f 
            JOIN leads l ON l.id = f.lead_id 
            WHERE f.employee_id = $1 
              AND f.status = 'PENDING' 
              AND f.is_deleted = FALSE 
              AND f.next_followup_at <= NOW() 
              AND f.next_followup_at > NOW() - INTERVAL '2 minutes' 
            ORDER BY f.next_followup_at ASC;
          `, [employee.id]),
          pool.query(`
            SELECT f.id, f.next_followup_at, l.full_name, l.mobile 
            FROM lead_followups f 
            JOIN leads l ON l.id = f.lead_id 
            WHERE f.employee_id = $1 
              AND f.status = 'PENDING' 
              AND f.is_deleted = FALSE 
              AND f.next_followup_at::date = CURRENT_DATE 
            ORDER BY f.next_followup_at ASC 
            LIMIT 10;
          `, [employee.id]),
          pool.query(`
            SELECT f.id, f.next_followup_at, l.full_name, l.mobile 
            FROM lead_followups f 
            JOIN leads l ON l.id = f.lead_id 
            WHERE f.employee_id = $1 
              AND f.status = 'PENDING' 
              AND f.is_deleted = FALSE 
              AND f.next_followup_at < NOW() - INTERVAL '2 minutes' 
            ORDER BY f.next_followup_at ASC 
            LIMIT 10;
          `, [employee.id]),
          pool.query(`
            SELECT la.id AS assignment_id, la.assigned_at, l.full_name, l.interested_course 
            FROM lead_assignments la 
            JOIN leads l ON l.id = la.lead_id 
            WHERE la.assigned_to = $1 
              AND l.is_deleted = FALSE 
            ORDER BY la.assigned_at DESC 
            LIMIT 10;
          `, [employee.id]),
        ]);

        dueNow.rows.forEach((row) => {
          notifications.push(item(row, {
            id: `due_now_${row.id}_${new Date(row.next_followup_at).toISOString()}`,
            type: "FOLLOWUP_DUE_NOW",
            category: "FOLLOWUP",
            title: "Follow-up due now",
            message: `It's time to call ${row.full_name} (${row.mobile}).`,
            time: row.next_followup_at,
            link: "/employee/followups",
            priority: "URGENT",
            icon: "PhoneCall",
          }));
        });

        today.rows.forEach((row) => {
          notifications.push(item(row, {
            id: `today_${row.id}`,
            type: "TODAY_FOLLOWUP",
            category: "FOLLOWUP",
            title: "Follow-up scheduled today",
            message: `Call ${row.full_name} (${row.mobile}) today.`,
            time: row.next_followup_at,
            link: "/employee/followups",
            priority: "HIGH",
            icon: "PhoneCall",
          }));
        });

        overdue.rows.forEach((row) => {
          notifications.push(item(row, {
            id: `overdue_${row.id}`,
            type: "OVERDUE_FOLLOWUP",
            category: "FOLLOWUP",
            title: "Overdue follow-up",
            message: `Callback to ${row.full_name} was missed.`,
            time: row.next_followup_at,
            link: "/employee/followups",
            priority: "URGENT",
            icon: "AlertCircle",
          }));
        });

        assignments.rows.forEach((row) => {
          notifications.push(item(row, {
            id: `assigned_${row.assignment_id}`,
            type: "NEW_ASSIGNED",
            category: "LEAD",
            title: "New lead assigned to you",
            message: `${row.full_name} — ${row.interested_course || "course inquiry"}.`,
            time: row.assigned_at,
            link: "/employee/leads",
            priority: "HIGH",
            icon: "UserPlus",
          }));
        });
      }
    }

    // -------------------------------------------------------------
    // 7. USER NOTIFICATIONS TABLE (Security / System alerts)
    // -------------------------------------------------------------
    if (isSuperAdmin && hasValidUserId) {
      const { rows: securityEvents } = await pool.query(`
        SELECT id, type, category, title, message, link, priority, created_at
        FROM user_notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10;
      `, [userId]);

      securityEvents.forEach((event) => {
        notifications.push(item(event, {
          id: `security_${event.id}`,
          type: event.type,
          category: event.category || "SYSTEM",
          title: event.title,
          message: event.message,
          link: event.link || "/employees",
          priority: event.priority || "INFO",
          time: event.created_at,
          icon: "ShieldCheck",
        }));
      });
    }

  } catch (err) {
    console.error("Error generating notifications:", err);
  }

  // Deduplicate by ID just in case
  const uniqueMap = new Map();
  notifications.forEach((n) => {
    if (!uniqueMap.has(n.id)) {
      uniqueMap.set(n.id, n);
    }
  });

  const uniqueNotifications = Array.from(uniqueMap.values());

  // Sort latest first
  uniqueNotifications.sort((a, b) => new Date(b.time) - new Date(a.time));

  return {
    notifications: uniqueNotifications,
    total_count: uniqueNotifications.length,
    unread_count: uniqueNotifications.length,
  };
};

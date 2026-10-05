import pool from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import {
  getVapidPublicKeyService,
  saveSubscriptionService,
  removeSubscriptionService,
  sendPushToUsersService,
} from "../services/pushNotificationService.js";

/**
 * =====================================================
 * Get Live Notifications for Authenticated User
 * (Supports both Admin & Counsellor/Employee Portals)
 * =====================================================
 */
export const getNotificationsController = asyncHandler(async (req, res) => {
  const user = req.user;
  const role = String(user.role || "").toUpperCase();
  const isHR = role === "HR";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isManager = ["ADMIN", "MANAGER"].includes(role);
  const isTL = role === "TL";
  const isExecutive = isHR || isSuperAdmin || isManager || isTL;

  const notifications = [];

  try {
    // ── 1. HR & Executive Real-Time Attendance Check-In / Check-Out Notifications ──
    if (isExecutive) {
      const { rows: attendanceLogs } = await pool.query(`
        SELECT 
          a.id,
          a.check_in_time,
          a.check_out_time,
          a.check_in_location,
          a.check_out_location,
          a.total_hours,
          e.full_name AS employee_name,
          e.employee_code,
          d.department_name
        FROM daily_attendance a
        JOIN employees e ON a.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE a.date = CURRENT_DATE
        ORDER BY COALESCE(a.check_out_time, a.check_in_time) DESC
        LIMIT 15;
      `);

      attendanceLogs.forEach((att) => {
        if (att.check_in_time) {
          const checkInStr = new Date(att.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
          notifications.push({
            id: `att_in_${att.id}_${new Date(att.check_in_time).getTime()}`,
            type: "ATTENDANCE_CHECKIN",
            category: "ATTENDANCE",
            title: "Employee Check-In Marked",
            message: `${att.employee_name} (${att.department_name || "Staff"}) checked in at ${checkInStr} ${att.check_in_location ? `📍 ${att.check_in_location}` : ""}`,
            time: att.check_in_time,
            link: isHR || isSuperAdmin ? "/attendance-reports" : "/employee/my-attendance",
            priority: "INFO",
            icon: "Fingerprint",
          });
        }

        if (att.check_out_time) {
          const checkOutStr = new Date(att.check_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
          notifications.push({
            id: `att_out_${att.id}_${new Date(att.check_out_time).getTime()}`,
            type: "ATTENDANCE_CHECKOUT",
            category: "ATTENDANCE",
            title: "Employee Shift Check-Out",
            message: `${att.employee_name} (${att.department_name || "Staff"}) completed shift at ${checkOutStr} (${att.total_hours || "0.0"} hrs)`,
            time: att.check_out_time,
            link: isHR || isSuperAdmin ? "/attendance-reports" : "/employee/my-attendance",
            priority: "SUCCESS",
            icon: "LogOut",
          });
        }
      });

      // ── 2. Daily Work Report Submission Alerts for HR & Department Leads ──
      const { rows: reportLogs } = await pool.query(`
        SELECT 
          r.id,
          r.report_date,
          r.tasks_summary,
          r.took_class,
          r.status,
          r.created_at,
          u.full_name AS user_name,
          d.department_name
        FROM daily_work_reports r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.report_date = CURRENT_DATE
        ORDER BY r.created_at DESC
        LIMIT 10;
      `);

      reportLogs.forEach((rep) => {
        notifications.push({
          id: `report_${rep.id}_${new Date(rep.created_at).getTime()}`,
          type: "DAILY_REPORT_SUBMITTED",
          category: "REPORT",
          title: "Daily Work Report Submitted",
          message: `${rep.user_name} (${rep.department_name || "Staff"}) logged today's report ${rep.took_class ? "📹 (Video Recording Proof Attached)" : ""}`,
          time: rep.created_at,
          link: "/team-reports",
          priority: "INFO",
          icon: "FileText",
        });
      });
    }

    if (isSuperAdmin) {
      const { rows: securityEvents } = await pool.query(`
        SELECT n.id, n.type, n.category, n.title, n.message, n.link, n.priority, n.created_at
        FROM user_notifications n
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 10;
      `, [user.id]);
      securityEvents.forEach((event) => {
        notifications.push({
          id: `security_${event.id}`,
          type: event.type,
          category: event.category,
          title: event.title,
          message: event.message,
          time: event.created_at,
          link: event.link,
          priority: event.priority,
          icon: "ShieldCheck",
        });
      });
    }

    // ── 3. Leads & Admissions Notifications for Sales / Admin ──
    if (isSuperAdmin || isManager || role === "COUNSELLOR") {
      // Unassigned Leads
      if (isSuperAdmin || isManager) {
        const { rows: unassigned } = await pool.query(`
          SELECT id, lead_code, full_name, mobile, interested_course, created_at
          FROM leads
          WHERE assigned_to IS NULL AND is_deleted = FALSE
          ORDER BY created_at DESC
          LIMIT 5;
        `);
        unassigned.forEach((l) => {
          notifications.push({
            id: `unassigned_${l.id}`,
            type: "UNASSIGNED_LEAD",
            category: "LEAD",
            title: "New Lead Needs Assignment",
            message: `${l.full_name} inquired for ${l.interested_course || "Course"} (${l.lead_code}).`,
            time: l.created_at,
            link: "/leads",
            priority: "HIGH",
            icon: "UserPlus",
          });
        });
      }

      // Admissions
      const { rows: recentAdm } = await pool.query(`
        SELECT a.id, a.student_name, a.course_name, a.paid_fee, a.created_at
        FROM admissions a
        ORDER BY a.created_at DESC
        LIMIT 5;
      `);
      recentAdm.forEach((a) => {
        notifications.push({
          id: `adm_${a.id}`,
          type: "ADMISSION_DONE",
          category: "ADMISSION",
          title: "New Student Enrolled",
          message: `${a.student_name} confirmed admission for ${a.course_name}. Fee paid: ₹${Number(a.paid_fee || 0).toLocaleString("en-IN")}.`,
          time: a.created_at,
          link: "/admissions",
          priority: "SUCCESS",
          icon: "GraduationCap",
        });
      });
    }

    // ── 4. Counsellor / Individual Employee Notifications ──
    let employeeId = user.employee_id;
    if (!employeeId) {
      const { rows: empRows } = await pool.query(
        "SELECT id FROM employees WHERE (user_id = $1 OR email = $2) AND is_deleted = FALSE LIMIT 1;",
        [user.id, user.email]
      );
      if (empRows.length > 0) employeeId = empRows[0].id;
    }

    if (employeeId) {
      // Today's Pending Follow-ups
      const { rows: todayFollowups } = await pool.query(`
        SELECT f.id, f.lead_id, f.next_followup_at, f.followup_type, l.full_name, l.mobile, l.interested_course
        FROM lead_followups f
        JOIN leads l ON f.lead_id = l.id
        WHERE f.employee_id = $1 
          AND f.status = 'PENDING'
          AND f.next_followup_at::date = CURRENT_DATE
          AND f.is_deleted = FALSE
        ORDER BY f.next_followup_at ASC
        LIMIT 8;
      `, [employeeId]);
      todayFollowups.forEach((f) => {
        notifications.push({
          id: `today_${f.id}`,
          type: "TODAY_FOLLOWUP",
          category: "FOLLOWUP",
          title: "Follow-up Call Scheduled Today",
          message: `Call ${f.full_name} (${f.mobile}) today for ${f.interested_course || "inquiry"}.`,
          time: f.next_followup_at,
          link: "/employee/followups",
          priority: "HIGH",
          icon: "PhoneCall",
        });
      });

      // Follow-up due now (within 2 mins)
      const { rows: dueNow } = await pool.query(`
        SELECT f.id, f.next_followup_at, l.full_name, l.mobile
        FROM lead_followups f
        JOIN leads l ON f.lead_id = l.id
        WHERE f.employee_id = $1
          AND f.status = 'PENDING'
          AND f.is_deleted = FALSE
          AND f.next_followup_at <= NOW()
          AND f.next_followup_at > NOW() - INTERVAL '2 minutes'
        ORDER BY f.next_followup_at ASC;
      `, [employeeId]);
      dueNow.forEach((f) => {
        notifications.push({
          id: `due_now_${f.id}_${new Date(f.next_followup_at).toISOString()}`,
          type: "FOLLOWUP_DUE_NOW",
          category: "FOLLOWUP",
          title: "Follow-up due now",
          message: `It's time to call ${f.full_name} (${f.mobile}).`,
          time: f.next_followup_at,
          link: "/employee/followups",
          priority: "URGENT",
          icon: "PhoneCall",
        });
      });

      // Overdue Follow-ups
      const { rows: overdueFollowups } = await pool.query(`
        SELECT f.id, f.lead_id, f.next_followup_at, l.full_name, l.mobile
        FROM lead_followups f
        JOIN leads l ON f.lead_id = l.id
        WHERE f.employee_id = $1 
          AND f.status = 'PENDING'
          AND f.next_followup_at < NOW()
          AND f.next_followup_at::date < CURRENT_DATE
          AND f.is_deleted = FALSE
        ORDER BY f.next_followup_at ASC
        LIMIT 5;
      `, [employeeId]);
      overdueFollowups.forEach((f) => {
        notifications.push({
          id: `overdue_${f.id}`,
          type: "OVERDUE_FOLLOWUP",
          category: "FOLLOWUP",
          title: "Action Required: Overdue Follow-up",
          message: `Callback to ${f.full_name} was missed. Please reschedule or call now.`,
          time: f.next_followup_at,
          link: "/employee/followups",
          priority: "URGENT",
          icon: "AlertCircle",
        });
      });

      // New Leads Assigned
      const { rows: newAssigned } = await pool.query(`
        SELECT la.id AS assignment_id, la.assigned_at, l.id, l.lead_code, l.full_name, l.mobile, l.interested_course
        FROM lead_assignments la
        JOIN leads l ON l.id = la.lead_id
        WHERE la.assigned_to = $1
          AND l.is_deleted = FALSE
        ORDER BY la.assigned_at DESC
        LIMIT 5;
      `, [employeeId]);
      newAssigned.forEach((l) => {
        notifications.push({
          id: `assigned_${l.assignment_id}`,
          type: "NEW_ASSIGNED",
          category: "LEAD",
          title: "New Lead Assigned to You",
          message: `${l.full_name} has been assigned for ${l.interested_course || "program inquiry"}.`,
          time: l.assigned_at,
          link: "/employee/leads",
          priority: "INFO",
          icon: "UserCheck",
        });
      });

      // Report Review / Approval Updates for Employee
      const { rows: myReportStatus } = await pool.query(`
        SELECT r.id, r.report_date, r.status, r.tl_feedback, r.hr_feedback, r.updated_at
        FROM daily_work_reports r
        WHERE r.user_id = $1 AND r.status IN ('HEAD_APPROVED', 'TL_REVIEWED', 'HR_APPROVED', 'REVISION_REQUESTED')
        ORDER BY r.updated_at DESC
        LIMIT 5;
      `, [user.id]);
      myReportStatus.forEach((rep) => {
        const isApproved = rep.status === "HR_APPROVED" || rep.status === "HEAD_APPROVED" || rep.status === "TL_REVIEWED";
        notifications.push({
          id: `rep_status_${rep.id}_${new Date(rep.updated_at).getTime()}`,
          type: "DAILY_REPORT_APPROVED",
          category: "REPORT",
          title: isApproved ? "Work Report Approved" : "Report Revision Requested",
          message: `Your daily report for ${rep.report_date} was ${isApproved ? "verified & approved" : "sent back for revision"}.`,
          time: rep.updated_at,
          link: "/employee/daily-report",
          priority: isApproved ? "SUCCESS" : "WARNING",
          icon: "CheckCircle2",
        });
      });
    }

    // Sort by latest time
    notifications.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          notifications,
          total_count: notifications.length,
          unread_count: notifications.length,
        },
        "Notifications fetched successfully."
      )
    );
  } catch (error) {
    console.error("Notifications error:", error);
    return res.status(200).json(
      new ApiResponse(200, { notifications: [], total_count: 0, unread_count: 0 }, "Empty notifications.")
    );
  }
});

/**
 * Get Public VAPID key so browser can subscribe
 */
export const getVapidPublicKeyController = asyncHandler(async (req, res) => {
  const publicKey = getVapidPublicKeyService();
  return res.status(200).json(
    new ApiResponse(200, { publicKey }, "VAPID public key retrieved successfully.")
  );
});

/**
 * Register or update push subscription for current user
 */
export const subscribePushController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { subscription, userAgent } = req.body;

  if (!subscription || !subscription.endpoint) {
    throw new ApiError(400, "Push subscription object is required.");
  }

  const result = await saveSubscriptionService(userId, subscription, userAgent || req.headers["user-agent"]);

  return res.status(201).json(
    new ApiResponse(201, result, "Push notification subscription registered successfully.")
  );
});

/**
 * Unsubscribe push subscription (e.g. user toggles off notifications)
 */
export const unsubscribePushController = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    throw new ApiError(400, "Subscription endpoint is required.");
  }

  await removeSubscriptionService(endpoint);

  return res.status(200).json(
    new ApiResponse(200, null, "Push notification subscription removed successfully.")
  );
});

/**
 * Send a test push notification to user's registered devices
 */
export const testPushNotificationController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const userName = req.user?.name || req.user?.full_name || "User";

  const result = await sendPushToUsersService(userId, {
    title: "🔔 Dizital Adda CRM Notifications Active",
    body: `Hello ${userName}! Mobile & background alerts are working properly even if CRM is closed.`,
    url: "/employee/dashboard",
    tag: "test-notification",
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Test push notification dispatched.")
  );
});

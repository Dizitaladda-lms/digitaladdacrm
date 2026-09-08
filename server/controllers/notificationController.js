import pool from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

/**
 * =====================================================
 * Get Live Notifications for Authenticated User
 * (Supports both Admin & Counsellor/Employee Portals)
 * =====================================================
 */
export const getNotificationsController = asyncHandler(async (req, res) => {
  const user = req.user;
  const role = String(user.role || "").toUpperCase();
  const isAdmin = role === "ADMIN" || role === "MANAGER";

  const notifications = [];

  try {
    if (isAdmin) {
      // 1. Admin: Unassigned Leads
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

      // 2. Admin: Recent Admissions (Note: admissions table has no is_deleted)
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
          message: `${a.student_name} confirmed admission for ${a.course_name}. Fee paid: ?${Number(a.paid_fee || 0).toLocaleString("en-IN")}.`,
          time: a.created_at,
          link: "/admissions",
          priority: "SUCCESS",
          icon: "GraduationCap",
        });
      });

      // 3. Admin: System Overdue Follow-ups
      const { rows: overdue } = await pool.query(`
        SELECT f.id, f.next_followup_at, l.full_name, l.lead_code, e.full_name AS counsellor_name
        FROM lead_followups f
        JOIN leads l ON f.lead_id = l.id
        LEFT JOIN employees e ON f.employee_id = e.id
        WHERE f.status = 'PENDING' AND f.next_followup_at < NOW() AND f.is_deleted = FALSE
        ORDER BY f.next_followup_at ASC
        LIMIT 5;
      `);
      overdue.forEach((f) => {
        notifications.push({
          id: `overdue_${f.id}`,
          type: "OVERDUE_FOLLOWUP",
          category: "FOLLOWUP",
          title: "Overdue Follow-up Notice",
          message: `${f.full_name} (${f.lead_code}) follow-up overdue with ${f.counsellor_name || "counsellor"}.`,
          time: f.next_followup_at,
          link: "/leads",
          priority: "WARNING",
          icon: "Clock",
        });
      });

    } else {
      // Counsellor / Employee Portal Notifications
      let employeeId = user.employee_id;
      if (!employeeId) {
        const { rows: empRows } = await pool.query(
          "SELECT id FROM employees WHERE (user_id = $1 OR email = $2) AND is_deleted = FALSE LIMIT 1;",
          [user.id, user.email]
        );
        if (empRows.length > 0) employeeId = empRows[0].id;
      }

      if (employeeId) {
        // 1. Today's Pending Follow-ups
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

        // 2. Overdue Follow-ups
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

        // 3. New Leads Assigned
        const { rows: newAssigned } = await pool.query(`
          SELECT id, lead_code, full_name, mobile, interested_course, created_at
          FROM leads
          WHERE assigned_to = $1 AND status = 'NEW' AND is_deleted = FALSE
          ORDER BY created_at DESC
          LIMIT 5;
        `, [employeeId]);
        newAssigned.forEach((l) => {
          notifications.push({
            id: `assigned_${l.id}`,
            type: "NEW_ASSIGNED",
            category: "LEAD",
            title: "New Lead Assigned to You",
            message: `${l.full_name} has been assigned for ${l.interested_course || "program inquiry"}.`,
            time: l.created_at,
            link: "/employee/my-leads",
            priority: "INFO",
            icon: "UserCheck",
          });
        });

        // 4. Pending Fee Installment Due Dates (admissions table)
        const { rows: pendingFees } = await pool.query(`
          SELECT id, student_name, pending_fee, next_due_date, course_name
          FROM admissions
          WHERE (assigned_counsellor_id = $1 OR created_by = $2)
            AND fee_status IN ('PENDING', 'PARTIAL', 'OVERDUE')
            AND next_due_date IS NOT NULL
            AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'
          ORDER BY next_due_date ASC
          LIMIT 5;
        `, [employeeId, user.id]);
        pendingFees.forEach((a) => {
          notifications.push({
            id: `fee_${a.id}`,
            type: "FEE_DUE",
            category: "ADMISSION",
            title: "Fee Installment Due Soon",
            message: `${a.student_name}'s balance of ?${Number(a.pending_fee || 0).toLocaleString("en-IN")} is due on ${new Date(a.next_due_date).toLocaleDateString("en-IN")}.`,
            time: a.next_due_date,
            link: "/employee/admissions",
            priority: "WARNING",
            icon: "IndianRupee",
          });
        });
      }
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

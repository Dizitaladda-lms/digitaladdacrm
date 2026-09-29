import pool from "../config/db.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";

const item = (row, data) => ({ time: row.created_at || new Date().toISOString(), priority: "INFO", ...data });

// The frontend polls this role-scoped endpoint. It only sounds an alert for
// items that appear after the initial poll, so opening the CRM is quiet.
export const getRoleNotificationsService = async (user) => {
  const role = String(user.role || "").toUpperCase();
  const isManager = ["ADMIN", "MANAGER"].includes(role);
  const isSuperAdmin = role === "SUPER_ADMIN";
  const notifications = [];

  if (isManager || isSuperAdmin) {
    const { rows } = await pool.query(`
      SELECT id, lead_code, full_name, interested_course, created_at FROM leads
      WHERE assigned_to IS NULL AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 10;
    `);
    notifications.push(...rows.map((lead) => item(lead, {
      id: `unassigned_${lead.id}`, type: "UNASSIGNED_LEAD", category: "LEAD",
      title: "New lead needs assignment",
      message: `${lead.full_name} inquired for ${lead.interested_course || "a course"}.`,
      link: "/leads", priority: "HIGH",
    })));
  }

  if (isSuperAdmin) {
    const { rows } = await pool.query(`
      SELECT id, type, category, title, message, link, priority, created_at
      FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20;
    `, [user.id]);
    notifications.push(...rows.map((event) => item(event, {
      id: `security_${event.id}`, type: event.type, category: event.category,
      title: event.title, message: event.message, link: event.link || "/employees",
      priority: event.priority, time: event.created_at,
    })));
  }

  if (!isManager && !isSuperAdmin) {
    const employee = await findEmployeeByUserIdRepository(user.id);
    if (!employee) return { notifications: [], total_count: 0, unread_count: 0 };

    const [dueNow, today, overdue, assignments] = await Promise.all([
      pool.query(`SELECT f.id, f.next_followup_at, l.full_name, l.mobile FROM lead_followups f JOIN leads l ON l.id=f.lead_id WHERE f.employee_id=$1 AND f.status='PENDING' AND f.is_deleted=FALSE AND f.next_followup_at <= NOW() AND f.next_followup_at > NOW() - INTERVAL '2 minutes' ORDER BY f.next_followup_at ASC`, [employee.id]),
      pool.query(`SELECT f.id, f.next_followup_at, l.full_name, l.mobile FROM lead_followups f JOIN leads l ON l.id=f.lead_id WHERE f.employee_id=$1 AND f.status='PENDING' AND f.is_deleted=FALSE AND f.next_followup_at::date=CURRENT_DATE ORDER BY f.next_followup_at ASC LIMIT 10`, [employee.id]),
      pool.query(`SELECT f.id, f.next_followup_at, l.full_name, l.mobile FROM lead_followups f JOIN leads l ON l.id=f.lead_id WHERE f.employee_id=$1 AND f.status='PENDING' AND f.is_deleted=FALSE AND f.next_followup_at < NOW() - INTERVAL '2 minutes' ORDER BY f.next_followup_at ASC LIMIT 10`, [employee.id]),
      pool.query(`SELECT la.id AS assignment_id, la.assigned_at, l.full_name, l.interested_course FROM lead_assignments la JOIN leads l ON l.id=la.lead_id WHERE la.assigned_to=$1 AND l.is_deleted=FALSE ORDER BY la.assigned_at DESC LIMIT 10`, [employee.id]),
    ]);

    notifications.push(...dueNow.rows.map((row) => item(row, {
      id: `due_now_${row.id}_${new Date(row.next_followup_at).toISOString()}`, type: "FOLLOWUP_DUE_NOW", category: "FOLLOWUP", title: "Follow-up due now",
      message: `It's time to call ${row.full_name} (${row.mobile}).`, time: row.next_followup_at, link: "/employee/followups", priority: "URGENT",
    })));
    notifications.push(...today.rows.map((row) => item(row, {
      id: `today_${row.id}`, type: "TODAY_FOLLOWUP", category: "FOLLOWUP", title: "Follow-up scheduled today",
      message: `Call ${row.full_name} (${row.mobile}) today.`, time: row.next_followup_at, link: "/employee/followups", priority: "HIGH",
    })));
    notifications.push(...overdue.rows.map((row) => item(row, {
      id: `overdue_${row.id}`, type: "OVERDUE_FOLLOWUP", category: "FOLLOWUP", title: "Overdue follow-up",
      message: `Callback to ${row.full_name} was missed.`, time: row.next_followup_at, link: "/employee/followups", priority: "URGENT",
    })));
    notifications.push(...assignments.rows.map((row) => item(row, {
      id: `assigned_${row.assignment_id}`, type: "NEW_ASSIGNED", category: "LEAD", title: "New lead assigned to you",
      message: `${row.full_name} — ${row.interested_course || "course inquiry"}.`, time: row.assigned_at, link: "/employee/leads",
    })));
  }

  notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
  return { notifications, total_count: notifications.length, unread_count: notifications.length };
};

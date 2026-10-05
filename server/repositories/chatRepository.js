import pool from "../config/db.js";

/**
 * =========================================================================
 * Chat Repository
 * Handles Team Groups, Messages, Members, and Live Availability Detection
 * =========================================================================
 */

/**
 * Find all groups accessible by an employee
 * (All Company, custom groups they are members of, + all groups if HR/Super Admin)
 */
export const findUserGroupsRepository = async (employeeId, userRole = "") => {
  const roleUpper = String(userRole).toUpperCase();
  const isSuperAdminOrHR = roleUpper === "SUPER_ADMIN" || roleUpper === "HR" || roleUpper === "ADMIN";

  const query = `
    SELECT 
      g.id,
      g.name,
      g.slug,
      g.description,
      g.group_type,
      g.department_id,
      g.created_by,
      g.is_default,
      g.created_at,
      g.updated_at,
      creator.full_name AS created_by_name,
      d.department_name,
      (
        SELECT COUNT(DISTINCT gm.employee_id) 
        FROM chat_group_members gm 
        WHERE gm.group_id = g.id
      ) AS members_count,
      lm.id AS last_message_id,
      lm.message_text AS last_message_text,
      lm.created_at AS last_message_at,
      lms.full_name AS last_message_sender_name,
      COALESCE(
        (
          SELECT COUNT(m.id)
          FROM chat_messages m
          LEFT JOIN chat_group_members cur_gm 
            ON cur_gm.group_id = g.id AND cur_gm.employee_id = $1
          WHERE m.group_id = g.id 
            AND m.id > COALESCE(cur_gm.last_read_message_id, 0)
            AND m.sender_id != $1
        ),
        0
      ) AS unread_count
    FROM chat_groups g
    LEFT JOIN employees creator ON g.created_by = creator.id
    LEFT JOIN departments d ON g.department_id = d.id
    LEFT JOIN LATERAL (
      SELECT m.id, m.message_text, m.created_at, m.sender_id
      FROM chat_messages m
      WHERE m.group_id = g.id
      ORDER BY m.id DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN employees lms ON lm.sender_id = lms.id
    WHERE g.is_archived = FALSE
      AND (
        g.is_default = TRUE 
        OR g.group_type = 'ALL_COMPANY'
        OR $2 = TRUE -- Super Admin & HR see all team groups
        OR EXISTS (
          SELECT 1 FROM chat_group_members cgm 
          WHERE cgm.group_id = g.id AND cgm.employee_id = $1
        )
      )
    ORDER BY COALESCE(lm.created_at, g.created_at) DESC;
  `;

  const { rows } = await pool.query(query, [employeeId, isSuperAdminOrHR]);
  return rows;
};

/**
 * Find group by ID
 */
export const findGroupByIdRepository = async (groupId) => {
  const query = `
    SELECT 
      g.*,
      creator.full_name AS created_by_name,
      d.department_name
    FROM chat_groups g
    LEFT JOIN employees creator ON g.created_by = creator.id
    LEFT JOIN departments d ON g.department_id = d.id
    WHERE g.id = $1 AND g.is_archived = FALSE
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [groupId]);
  return rows[0] || null;
};

/**
 * Create a new team group
 * Automatically adds Super Admin and HR employees to the group
 */
export const createGroupRepository = async ({
  name,
  slug,
  description = "",
  group_type = "CUSTOM",
  department_id = null,
  created_by = null,
  memberEmployeeIds = [],
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create group
    const insertGroupQuery = `
      INSERT INTO chat_groups (name, slug, description, group_type, department_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows: groupRows } = await client.query(insertGroupQuery, [
      name.trim(),
      slug.trim(),
      description ? description.trim() : "",
      group_type,
      department_id || null,
      created_by || null,
    ]);
    const group = groupRows[0];

    // 2. Fetch all Super Admin and HR employees so they are ALWAYS included
    const adminHREmpQuery = `
      SELECT id FROM employees 
      WHERE is_deleted = FALSE 
        AND status = 'ACTIVE' 
        AND role IN ('SUPER_ADMIN', 'HR', 'ADMIN');
    `;
    const { rows: adminHREmps } = await client.query(adminHREmpQuery);
    const adminHREmpIds = adminHREmps.map((e) => Number(e.id));

    // Combine members: Creator + Admin/HR + chosen members
    const allMembersSet = new Set([
      ...(created_by ? [Number(created_by)] : []),
      ...adminHREmpIds,
      ...(Array.isArray(memberEmployeeIds) ? memberEmployeeIds.map(Number) : []),
    ]);

    for (const empId of allMembersSet) {
      if (empId > 0) {
        const isOwner = Number(empId) === Number(created_by);
        await client.query(
          `
            INSERT INTO chat_group_members (group_id, employee_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (group_id, employee_id) DO NOTHING;
          `,
          [group.id, empId, isOwner ? "OWNER" : "MEMBER"]
        );
      }
    }

    await client.query("COMMIT");
    return group;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Fetch group members (or all active employees for All Company) with live availability & off status
 */
export const findGroupMembersWithLiveStatusRepository = async (groupId) => {
  const group = await findGroupByIdRepository(groupId);
  if (!group) return [];

  const isAllCompany = group.is_default || group.group_type === "ALL_COMPANY";

  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const query = `
    SELECT 
      e.id AS employee_id,
      e.full_name,
      e.employee_code,
      e.email,
      e.designation,
      e.role,
      e.profile_image,
      d.department_name,
      COALESCE(gm.role, 'MEMBER') AS group_member_role,
      da.check_in_time AS today_check_in_time,
      da.check_out_time AS today_check_out_time,
      da.status AS today_attendance_status,
      roster.days_data AS monthly_roster_days
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN chat_group_members gm ON gm.group_id = $1 AND gm.employee_id = e.id
    LEFT JOIN daily_attendance da ON da.employee_id = e.id AND da.date = $2::date
    LEFT JOIN employee_monthly_rosters roster 
      ON roster.employee_id = e.id AND roster.year = $3 AND roster.month = $4
    WHERE e.is_deleted = FALSE 
      AND e.status = 'ACTIVE'
      ${isAllCompany ? "" : "AND gm.group_id = $1"}
    ORDER BY 
      CASE WHEN gm.role = 'OWNER' THEN 0 WHEN gm.role = 'ADMIN' THEN 1 ELSE 2 END,
      e.full_name ASC;
  `;

  const { rows } = await pool.query(query, [groupId, todayStr, currentYear, currentMonth]);

  // Compute live availability and off status for each member
  return rows.map((row) => {
    let isOffToday = false;
    let offReason = "";
    let availabilityStatus = "NOT_CHECKED_IN";
    let availabilityLabel = "Not Checked In";

    // 1. Check if user already checked in today
    if (row.today_check_in_time) {
      if (row.today_check_out_time) {
        availabilityStatus = "CHECKED_OUT";
        availabilityLabel = "Checked Out";
      } else {
        availabilityStatus = "ONLINE";
        availabilityLabel = "In Office";
      }
    }

    // 2. Check Monthly Roster configuration for today
    let rosterDay = null;
    if (Array.isArray(row.monthly_roster_days)) {
      rosterDay = row.monthly_roster_days.find((d) => Number(d.day) === currentDay);
    }

    if (rosterDay) {
      if (rosterDay.status === "WEEK_OFF") {
        isOffToday = true;
        offReason = "Weekly Off (Scheduled)";
        if (!row.today_check_in_time) {
          availabilityStatus = "OFF_TODAY";
          availabilityLabel = "Weekly Off";
        }
      } else if (rosterDay.status === "LEAVE") {
        isOffToday = true;
        offReason = "Approved Leave";
        if (!row.today_check_in_time) {
          availabilityStatus = "ON_LEAVE";
          availabilityLabel = "On Leave";
        }
      } else if (rosterDay.status === "HALF_DAY") {
        if (!row.today_check_in_time) {
          availabilityLabel = "Half Day Shift";
        }
      }
    }

    // 3. Fallback: Sunday default check if no explicit roster entry
    const dayOfWeek = now.getDay(); // 0 is Sunday
    if (dayOfWeek === 0 && !rosterDay && !row.today_check_in_time) {
      isOffToday = true;
      offReason = "Sunday Off";
      availabilityStatus = "OFF_TODAY";
      availabilityLabel = "Sunday Off";
    }

    // 4. If attendance explicitly marked ON_LEAVE
    if (row.today_attendance_status === "ON_LEAVE") {
      isOffToday = true;
      offReason = "On Leave";
      availabilityStatus = "ON_LEAVE";
      availabilityLabel = "On Leave";
    }

    return {
      employee_id: row.employee_id,
      full_name: row.full_name,
      employee_code: row.employee_code,
      email: row.email,
      designation: row.designation,
      role: row.role,
      profile_image: row.profile_image,
      department_name: row.department_name,
      group_member_role: row.group_member_role,
      today_check_in_time: row.today_check_in_time,
      today_check_out_time: row.today_check_out_time,
      is_off_today: isOffToday,
      off_reason: offReason,
      availability_status: availabilityStatus,
      availability_label: availabilityLabel,
    };
  });
};

/**
 * Fetch messages in a group
 */
export const findGroupMessagesRepository = async (groupId, { limit = 60, beforeId = null } = {}) => {
  let query = `
    SELECT 
      m.id,
      m.group_id,
      m.sender_id,
      m.message_text,
      m.mentioned_employee_ids,
      m.attachments,
      m.is_pinned,
      m.created_at,
      m.updated_at,
      s.full_name AS sender_name,
      s.employee_code AS sender_code,
      s.role AS sender_role,
      s.designation AS sender_designation,
      s.profile_image AS sender_avatar,
      d.department_name AS sender_department
    FROM chat_messages m
    JOIN employees s ON m.sender_id = s.id
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE m.group_id = $1
  `;

  const values = [groupId];
  if (beforeId) {
    query += ` AND m.id < $2 ORDER BY m.id DESC LIMIT $3;`;
    values.push(beforeId, Number(limit));
  } else {
    query += ` ORDER BY m.id DESC LIMIT $2;`;
    values.push(Number(limit));
  }

  const { rows } = await pool.query(query, values);
  // Return in chronological order
  return rows.reverse();
};

/**
 * Create a new message in a group
 */
export const createChatMessageRepository = async ({
  groupId,
  senderId,
  messageText,
  mentionedEmployeeIds = [],
  attachments = [],
}) => {
  const query = `
    INSERT INTO chat_messages (
      group_id,
      sender_id,
      message_text,
      mentioned_employee_ids,
      attachments
    )
    VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    groupId,
    senderId,
    messageText.trim(),
    JSON.stringify(mentionedEmployeeIds || []),
    JSON.stringify(attachments || []),
  ]);

  const message = rows[0];

  // Mark this message as read for the sender
  await pool.query(
    `
      INSERT INTO chat_group_members (group_id, employee_id, last_read_message_id, last_read_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (group_id, employee_id)
      DO UPDATE SET 
        last_read_message_id = GREATEST(chat_group_members.last_read_message_id, $3),
        last_read_at = CURRENT_TIMESTAMP;
    `,
    [groupId, senderId, message.id]
  );

  // Return message with sender details
  const detailQuery = `
    SELECT 
      m.id,
      m.group_id,
      m.sender_id,
      m.message_text,
      m.mentioned_employee_ids,
      m.attachments,
      m.is_pinned,
      m.created_at,
      m.updated_at,
      s.full_name AS sender_name,
      s.employee_code AS sender_code,
      s.role AS sender_role,
      s.designation AS sender_designation,
      s.profile_image AS sender_avatar,
      d.department_name AS sender_department
    FROM chat_messages m
    JOIN employees s ON m.sender_id = s.id
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE m.id = $1
    LIMIT 1;
  `;
  const { rows: detailRows } = await pool.query(detailQuery, [message.id]);
  return detailRows[0];
};

/**
 * Update member last read message ID
 */
export const markGroupReadRepository = async (groupId, employeeId, messageId) => {
  const query = `
    INSERT INTO chat_group_members (group_id, employee_id, last_read_message_id, last_read_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (group_id, employee_id)
    DO UPDATE SET 
      last_read_message_id = GREATEST(chat_group_members.last_read_message_id, $3),
      last_read_at = CURRENT_TIMESTAMP;
  `;
  await pool.query(query, [groupId, employeeId, messageId]);
};

/**
 * Add members to an existing group
 */
export const addMembersToGroupRepository = async (groupId, employeeIds = []) => {
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) return [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const empId of employeeIds) {
      await client.query(
        `
          INSERT INTO chat_group_members (group_id, employee_id, role)
          VALUES ($1, $2, 'MEMBER')
          ON CONFLICT (group_id, employee_id) DO NOTHING;
        `,
        [groupId, empId]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

import pool from "../config/db.js";

/**
 * =========================================================================
 * Chat Repository
 * Handles Team Groups, Direct Messages (1-on-1 Chat), Members & Live Status
 * =========================================================================
 */

/**
 * Reusable helper to compute live employee availability and off status
 */
export const computeAvailability = (row = {}, now = new Date()) => {
  const currentDay = now.getDate();
  let isOffToday = false;
  let offReason = "";
  let availabilityStatus = "NOT_CHECKED_IN";
  let availabilityLabel = "Not Checked In";

  // 1. Check today's biometric / GPS attendance
  const checkIn = row.today_check_in_time || row.check_in_time;
  const checkOut = row.today_check_out_time || row.check_out_time;

  if (checkIn) {
    if (checkOut) {
      availabilityStatus = "CHECKED_OUT";
      availabilityLabel = "Checked Out";
    } else {
      availabilityStatus = "ONLINE";
      availabilityLabel = "In Office";
    }
  }

  // 2. Check Monthly Roster configuration for today
  let rosterDay = null;
  const daysData = row.monthly_roster_days || row.days_data;
  if (Array.isArray(daysData)) {
    rosterDay = daysData.find((d) => Number(d.day) === currentDay);
  }

  if (rosterDay) {
    if (rosterDay.status === "WEEK_OFF") {
      isOffToday = true;
      offReason = "Weekly Off (Scheduled)";
      if (!checkIn) {
        availabilityStatus = "OFF_TODAY";
        availabilityLabel = "Weekly Off";
      }
    } else if (rosterDay.status === "LEAVE") {
      isOffToday = true;
      offReason = "Approved Leave";
      if (!checkIn) {
        availabilityStatus = "ON_LEAVE";
        availabilityLabel = "On Leave";
      }
    } else if (rosterDay.status === "HALF_DAY") {
      if (!checkIn) {
        availabilityLabel = "Half Day Shift";
      }
    }
  }

  // 3. Fallback Sunday check
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0 && !rosterDay && !checkIn) {
    isOffToday = true;
    offReason = "Sunday Off";
    availabilityStatus = "OFF_TODAY";
    availabilityLabel = "Sunday Off";
  }

  // 4. Attendance marked ON_LEAVE
  const attStatus = row.today_attendance_status || row.status;
  if (attStatus === "ON_LEAVE") {
    isOffToday = true;
    offReason = "On Leave";
    availabilityStatus = "ON_LEAVE";
    availabilityLabel = "On Leave";
  }

  return {
    is_off_today: isOffToday,
    off_reason: offReason,
    availability_status: availabilityStatus,
    availability_label: availabilityLabel,
  };
};

/**
 * Fetch all colleagues & interns for starting personal chats
 */
export const getChatUsersRepository = async (currentEmployeeId) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

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
      da.check_in_time AS today_check_in_time,
      da.check_out_time AS today_check_out_time,
      da.status AS today_attendance_status,
      roster.days_data AS monthly_roster_days
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN daily_attendance da ON da.employee_id = e.id AND da.date = $1::date
    LEFT JOIN employee_monthly_rosters roster 
      ON roster.employee_id = e.id AND roster.year = $2 AND roster.month = $3
    WHERE e.is_deleted = FALSE 
      AND e.status = 'ACTIVE'
      AND e.id != $4
    ORDER BY 
      CASE WHEN e.role = 'INTERN' THEN 1 ELSE 0 END,
      e.full_name ASC;
  `;

  const { rows } = await pool.query(query, [todayStr, currentYear, currentMonth, currentEmployeeId]);

  return rows.map((r) => {
    const avail = computeAvailability(r, now);
    return {
      employee_id: r.employee_id,
      full_name: r.full_name,
      employee_code: r.employee_code,
      email: r.email,
      designation: r.designation,
      role: r.role,
      profile_image: r.profile_image,
      department_name: r.department_name,
      today_check_in_time: r.today_check_in_time,
      today_check_out_time: r.today_check_out_time,
      is_off_today: avail.is_off_today,
      off_reason: avail.off_reason,
      availability_status: avail.availability_status,
      availability_label: avail.availability_label,
    };
  });
};

/**
 * Get or create a 1-on-1 Direct Message group between 2 employees
 */
export const getOrCreateDirectGroupRepository = async (currentEmployeeId, targetEmployeeId) => {
  const currentId = Number(currentEmployeeId);
  const targetId = Number(targetEmployeeId);

  if (!currentId || !targetId || currentId === targetId) {
    throw new Error("Invalid participant IDs for direct message.");
  }

  const minId = Math.min(currentId, targetId);
  const maxId = Math.max(currentId, targetId);
  const slug = `dm-${minId}-${maxId}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check if group already exists
    const findQuery = `SELECT * FROM chat_groups WHERE slug = $1 LIMIT 1;`;
    const { rows: existingRows } = await client.query(findQuery, [slug]);

    let group = existingRows[0];

    if (!group) {
      // Fetch target employee name
      const { rows: empRows } = await client.query(
        `SELECT full_name FROM employees WHERE id = $1;`,
        [targetId]
      );
      const targetName = empRows[0]?.full_name || "Direct Message";

      const insertGroupQuery = `
        INSERT INTO chat_groups (name, slug, description, group_type, created_by)
        VALUES ($1, $2, 'Personal 1-on-1 direct conversation', 'DIRECT', $3)
        RETURNING *;
      `;
      const { rows: newGroupRows } = await client.query(insertGroupQuery, [
        targetName,
        slug,
        currentId,
      ]);
      group = newGroupRows[0];
    }

    // 2. Ensure both members are registered in chat_group_members
    await client.query(
      `
        INSERT INTO chat_group_members (group_id, employee_id, role)
        VALUES 
          ($1, $2, 'MEMBER'),
          ($1, $3, 'MEMBER')
        ON CONFLICT (group_id, employee_id) DO NOTHING;
      `,
      [group.id, currentId, targetId]
    );

    await client.query("COMMIT");

    // Return group with partner details populated
    return await findGroupByIdRepository(group.id, currentId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Check if employee is a member of the group (or if all-company)
 */
export const isGroupMemberRepository = async (groupId, employeeId) => {
  const group = await findGroupByIdRepository(groupId);
  if (!group) return false;
  if (group.is_default || group.group_type === "ALL_COMPANY") return true;

  const query = `
    SELECT 1 FROM chat_group_members 
    WHERE group_id = $1 AND employee_id = $2 LIMIT 1;
  `;
  const { rows } = await pool.query(query, [groupId, employeeId]);
  return rows.length > 0;
};

/**
 * Find all groups accessible by an employee
 * (All Company, custom groups, + personal direct messages they are members of)
 */
export const findUserGroupsRepository = async (employeeId, userRole = "") => {
  const roleUpper = String(userRole).toUpperCase();
  const isSuperAdminOrHR = roleUpper === "SUPER_ADMIN" || roleUpper === "HR" || roleUpper === "ADMIN";

  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

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
      ) AS unread_count,
      partner.partner_id,
      partner.partner_name,
      partner.partner_code,
      partner.partner_role,
      partner.partner_designation,
      partner.partner_avatar,
      partner.partner_department,
      partner.partner_check_in_time,
      partner.partner_check_out_time,
      partner.partner_attendance_status,
      partner.partner_roster_days
    FROM chat_groups g
    LEFT JOIN employees creator ON g.created_by = creator.id
    LEFT JOIN departments d ON g.department_id = d.id
    LEFT JOIN LATERAL (
      SELECT 
        pe.id AS partner_id,
        pe.full_name AS partner_name,
        pe.employee_code AS partner_code,
        pe.role AS partner_role,
        pe.designation AS partner_designation,
        pe.profile_image AS partner_avatar,
        pd.department_name AS partner_department,
        pda.check_in_time AS partner_check_in_time,
        pda.check_out_time AS partner_check_out_time,
        pda.status AS partner_attendance_status,
        proster.days_data AS partner_roster_days
      FROM chat_group_members pgm
      JOIN employees pe ON pgm.employee_id = pe.id
      LEFT JOIN departments pd ON pe.department_id = pd.id
      LEFT JOIN daily_attendance pda ON pda.employee_id = pe.id AND pda.date = $3::date
      LEFT JOIN employee_monthly_rosters proster 
        ON proster.employee_id = pe.id AND proster.year = $4 AND proster.month = $5
      WHERE pgm.group_id = g.id AND pgm.employee_id != $1
      LIMIT 1
    ) partner ON g.group_type = 'DIRECT'
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
        (
          g.group_type != 'DIRECT'
          AND (
            g.is_default = TRUE 
            OR g.group_type = 'ALL_COMPANY'
            OR $2 = TRUE -- Super Admin & HR see all team channels
            OR EXISTS (
              SELECT 1 FROM chat_group_members cgm 
              WHERE cgm.group_id = g.id AND cgm.employee_id = $1
            )
          )
        )
        OR (
          g.group_type = 'DIRECT'
          AND EXISTS (
            SELECT 1 FROM chat_group_members cgm 
            WHERE cgm.group_id = g.id AND cgm.employee_id = $1
          )
        )
      )
    ORDER BY COALESCE(lm.created_at, g.created_at) DESC;
  `;

  const { rows } = await pool.query(query, [employeeId, isSuperAdminOrHR, todayStr, currentYear, currentMonth]);

  return rows.map((r) => {
    if (r.group_type === "DIRECT" && r.partner_id) {
      const avail = computeAvailability(
        {
          today_check_in_time: r.partner_check_in_time,
          today_check_out_time: r.partner_check_out_time,
          today_attendance_status: r.partner_attendance_status,
          monthly_roster_days: r.partner_roster_days,
        },
        now
      );

      return {
        ...r,
        name: r.partner_name || r.name,
        partner: {
          id: r.partner_id,
          name: r.partner_name,
          code: r.partner_code,
          role: r.partner_role,
          designation: r.partner_designation,
          avatar: r.partner_avatar,
          department: r.partner_department,
          today_check_in_time: r.partner_check_in_time,
          today_check_out_time: r.partner_check_out_time,
          is_off_today: avail.is_off_today,
          off_reason: avail.off_reason,
          availability_status: avail.availability_status,
          availability_label: avail.availability_label,
        },
      };
    }
    return r;
  });
};

/**
 * Find group by ID (with partner details if direct group)
 */
export const findGroupByIdRepository = async (groupId, currentEmployeeId = null) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const query = `
    SELECT 
      g.*,
      creator.full_name AS created_by_name,
      d.department_name,
      partner.partner_id,
      partner.partner_name,
      partner.partner_code,
      partner.partner_role,
      partner.partner_designation,
      partner.partner_avatar,
      partner.partner_department,
      partner.partner_check_in_time,
      partner.partner_check_out_time,
      partner.partner_attendance_status,
      partner.partner_roster_days
    FROM chat_groups g
    LEFT JOIN employees creator ON g.created_by = creator.id
    LEFT JOIN departments d ON g.department_id = d.id
    LEFT JOIN LATERAL (
      SELECT 
        pe.id AS partner_id,
        pe.full_name AS partner_name,
        pe.employee_code AS partner_code,
        pe.role AS partner_role,
        pe.designation AS partner_designation,
        pe.profile_image AS partner_avatar,
        pd.department_name AS partner_department,
        pda.check_in_time AS partner_check_in_time,
        pda.check_out_time AS partner_check_out_time,
        pda.status AS partner_attendance_status,
        proster.days_data AS partner_roster_days
      FROM chat_group_members pgm
      JOIN employees pe ON pgm.employee_id = pe.id
      LEFT JOIN departments pd ON pe.department_id = pd.id
      LEFT JOIN daily_attendance pda ON pda.employee_id = pe.id AND pda.date = $2::date
      LEFT JOIN employee_monthly_rosters proster 
        ON proster.employee_id = pe.id AND proster.year = $3 AND proster.month = $4
      WHERE pgm.group_id = g.id AND pgm.employee_id != $5
      LIMIT 1
    ) partner ON g.group_type = 'DIRECT'
    WHERE g.id = $1 AND g.is_archived = FALSE
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [
    groupId,
    todayStr,
    currentYear,
    currentMonth,
    currentEmployeeId || 0,
  ]);

  if (!rows[0]) return null;
  const row = rows[0];

  if (row.group_type === "DIRECT" && row.partner_id) {
    const avail = computeAvailability(
      {
        today_check_in_time: row.partner_check_in_time,
        today_check_out_time: row.partner_check_out_time,
        today_attendance_status: row.partner_attendance_status,
        monthly_roster_days: row.partner_roster_days,
      },
      now
    );

    return {
      ...row,
      name: row.partner_name || row.name,
      partner: {
        id: row.partner_id,
        name: row.partner_name,
        code: row.partner_code,
        role: row.partner_role,
        designation: row.partner_designation,
        avatar: row.partner_avatar,
        department: row.partner_department,
        today_check_in_time: row.partner_check_in_time,
        today_check_out_time: row.partner_check_out_time,
        is_off_today: avail.is_off_today,
        off_reason: avail.off_reason,
        availability_status: avail.availability_status,
        availability_label: avail.availability_label,
      },
    };
  }

  return row;
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
    const avail = computeAvailability(row, now);
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
      is_off_today: avail.is_off_today,
      off_reason: avail.off_reason,
      availability_status: avail.availability_status,
      availability_label: avail.availability_label,
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

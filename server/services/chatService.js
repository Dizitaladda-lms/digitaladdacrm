import ApiError from "../utils/ApiError.js";
import pool from "../config/db.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import {
  findUserGroupsRepository,
  findGroupByIdRepository,
  createGroupRepository,
  findGroupMembersWithLiveStatusRepository,
  findGroupMessagesRepository,
  createChatMessageRepository,
  markGroupReadRepository,
  addMembersToGroupRepository,
  getChatUsersRepository,
  getOrCreateDirectGroupRepository,
  isGroupMemberRepository,
} from "../repositories/chatRepository.js";
import { sendPushToEmployeesService } from "./pushNotificationService.js";

const getEmployeeForUser = async (currentUser) => {
  const employee = await findEmployeeByUserIdRepository(currentUser.id);
  if (!employee) {
    throw new ApiError(404, "Employee record not found for your account.");
  }
  return employee;
};

/**
 * Get all active colleagues & interns for starting personal 1-on-1 chats
 */
export const getChatUsersService = async (currentUser) => {
  const employee = await getEmployeeForUser(currentUser);
  const users = await getChatUsersRepository(employee.id);
  return {
    employee_id: employee.id,
    users,
  };
};

/**
 * Get all groups & personal chats accessible by logged-in user
 */
export const getUserGroupsService = async (currentUser) => {
  const employee = await getEmployeeForUser(currentUser);
  const groups = await findUserGroupsRepository(employee.id, currentUser.role);
  return {
    employee_id: employee.id,
    groups,
  };
};

/**
 * Get or create a personal 1-on-1 direct message chat with a colleague or intern
 */
export const getOrCreateDirectChatService = async (payload = {}, currentUser) => {
  const { targetEmployeeId } = payload;
  const targetId = Number(targetEmployeeId);

  if (!targetId) {
    throw new ApiError(400, "Target employee ID is required.");
  }

  const employee = await getEmployeeForUser(currentUser);

  if (targetId === employee.id) {
    throw new ApiError(400, "You cannot start a direct chat with yourself.");
  }

  // Validate target exists and is active
  const { rows } = await pool.query(
    `SELECT id, full_name, status, is_deleted FROM employees WHERE id = $1;`,
    [targetId]
  );
  if (!rows[0] || rows[0].is_deleted || rows[0].status !== "ACTIVE") {
    throw new ApiError(404, "Selected employee or intern is not available.");
  }

  const group = await getOrCreateDirectGroupRepository(employee.id, targetId);
  return group;
};

/**
 * Get group details & its members with live availability & off status
 */
export const getGroupDetailsService = async (groupId, currentUser) => {
  const employee = await getEmployeeForUser(currentUser);
  const group = await findGroupByIdRepository(groupId, employee.id);
  if (!group) {
    throw new ApiError(404, "Chat conversation not found.");
  }

  // Privacy protection: Ensure user is a participant of direct message
  if (group.group_type === "DIRECT") {
    const isMember = await isGroupMemberRepository(groupId, employee.id);
    if (!isMember) {
      throw new ApiError(403, "You do not have permission to view this personal chat.");
    }
  }

  const members = await findGroupMembersWithLiveStatusRepository(groupId);
  return {
    group,
    members,
    total_members: members.length,
    off_members_count: members.filter((m) => m.is_off_today).length,
  };
};

/**
 * Create a new team group
 * Allowed for: Team Leaders (TL), Managers, HR, Super Admin
 * Rule: Super Admin and HR are ALWAYS automatically included!
 */
export const createTeamGroupService = async (payload = {}, currentUser) => {
  const { name, description, department_id, memberEmployeeIds = [] } = payload;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw new ApiError(400, "Group name must be at least 2 characters.");
  }

  const roleUpper = String(currentUser.role || "").toUpperCase();
  const isAllowed = ["TL", "MANAGER", "ADMIN", "SUPER_ADMIN", "HR"].includes(roleUpper);

  if (!isAllowed) {
    throw new ApiError(403, "Only Team Leaders, Managers, HR, and Admins can create team chat groups.");
  }

  const employee = await getEmployeeForUser(currentUser);

  // Generate unique slug
  const baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const group = await createGroupRepository({
    name: name.trim(),
    slug,
    description: description || `Team chat created by ${employee.full_name}`,
    group_type: "CUSTOM",
    department_id: department_id || employee.department_id || null,
    created_by: employee.id,
    memberEmployeeIds,
  });

  return group;
};

/**
 * Get messages in a group
 */
export const getGroupMessagesService = async (groupId, query = {}, currentUser) => {
  const employee = await getEmployeeForUser(currentUser);
  const group = await findGroupByIdRepository(groupId, employee.id);
  if (!group) {
    throw new ApiError(404, "Chat conversation not found.");
  }

  // Security check for direct chats
  if (group.group_type === "DIRECT") {
    const isMember = await isGroupMemberRepository(groupId, employee.id);
    if (!isMember) {
      throw new ApiError(403, "You do not have permission to view this personal chat.");
    }
  }

  const { limit = 60, beforeId = null } = query;

  const messages = await findGroupMessagesRepository(groupId, {
    limit: Math.min(Number(limit) || 60, 100),
    beforeId: beforeId ? Number(beforeId) : null,
  });

  // Mark latest message as read
  if (messages.length > 0) {
    const latestMessage = messages[messages.length - 1];
    await markGroupReadRepository(groupId, employee.id, latestMessage.id);
  }

  return {
    messages,
    count: messages.length,
  };
};

/**
 * Send a message in a group or direct chat
 * Checks mentioned employees or partner and alerts if recipient is OFF today
 */
export const sendChatMessageService = async (groupId, payload = {}, currentUser) => {
  const { messageText = "", mentionedEmployeeIds = [], attachments = [] } = payload;

  const trimmedText = typeof messageText === "string" ? messageText.trim() : "";
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (!trimmedText && !hasAttachments) {
    throw new ApiError(400, "Message or image attachment cannot be empty.");
  }

  const employee = await getEmployeeForUser(currentUser);

  const group = await findGroupByIdRepository(groupId, employee.id);
  if (!group) {
    throw new ApiError(404, "Chat conversation not found.");
  }

  // Security check for direct chats
  if (group.group_type === "DIRECT") {
    const isMember = await isGroupMemberRepository(groupId, employee.id);
    if (!isMember) {
      throw new ApiError(403, "You do not have permission to send messages in this personal chat.");
    }
  }

  // Create message
  const finalMessageText = trimmedText || (hasAttachments ? (attachments[0]?.name || "📷 Image") : "");
  const message = await createChatMessageRepository({
    groupId: Number(groupId),
    senderId: employee.id,
    messageText: finalMessageText,
    mentionedEmployeeIds: Array.isArray(mentionedEmployeeIds) ? mentionedEmployeeIds : [],
    attachments: Array.isArray(attachments) ? attachments : [],
  });

  let offAlerts = [];
  const senderName = employee.full_name || "Team Member";
  const preview = finalMessageText.length > 90 ? `${finalMessageText.slice(0, 87)}...` : finalMessageText;

  // 1. Direct 1-on-1 Message Handling: notify partner
  if (group.group_type === "DIRECT") {
    const { rows: partnerRows } = await pool.query(
      `SELECT employee_id FROM chat_group_members WHERE group_id = $1 AND employee_id != $2 LIMIT 1;`,
      [group.id, employee.id]
    );

    if (partnerRows[0]?.employee_id) {
      const partnerId = partnerRows[0].employee_id;

      // Check if partner is off today
      if (group.partner?.is_off_today) {
        offAlerts.push({
          employee_id: group.partner.id,
          full_name: group.partner.name,
          off_reason: group.partner.off_reason || "Off Today",
        });
      }

      // Send background web push to partner
      sendPushToEmployeesService([partnerId], {
        title: `💬 Personal message from ${senderName}`,
        body: preview,
        url: `/team-chat`,
        tag: `chat-dm-${group.id}`,
        data: { groupId: group.id, messageId: message.id },
      }).catch((err) => console.error("Push dispatch error on DM:", err.message));
    }
  }

  // 2. Mentions in Group Handling
  if (Array.isArray(mentionedEmployeeIds) && mentionedEmployeeIds.length > 0) {
    const members = await findGroupMembersWithLiveStatusRepository(groupId);
    const mentionedSet = new Set(mentionedEmployeeIds.map(Number));

    const groupOffAlerts = members
      .filter((m) => mentionedSet.has(Number(m.employee_id)) && m.is_off_today)
      .map((m) => ({
        employee_id: m.employee_id,
        full_name: m.full_name,
        off_reason: m.off_reason || "Off Today",
      }));

    offAlerts = [...offAlerts, ...groupOffAlerts];

    const groupName = group.name || "Chat";
    sendPushToEmployeesService(mentionedEmployeeIds, {
      title: `💬 ${senderName} mentioned you in #${groupName}`,
      body: preview,
      url: `/team-chat`,
      tag: `chat-mention-${groupId}`,
      data: { groupId, messageId: message.id },
    }).catch((err) => console.error("Push dispatch error on chat mention:", err.message));
  }

  return {
    message,
    off_alerts: offAlerts,
  };
};

/**
 * Mark group or direct messages as read
 */
export const markChatGroupReadService = async (groupId, payload = {}, currentUser) => {
  const employee = await getEmployeeForUser(currentUser);
  const { messageId } = payload;
  await markGroupReadRepository(groupId, employee.id, Number(messageId) || 0);
  return { success: true };
};

/**
 * Add members to an existing group
 */
export const addMembersToGroupService = async (groupId, payload = {}, currentUser) => {
  const { employeeIds = [] } = payload;
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new ApiError(400, "Please provide an array of employee IDs to add.");
  }
  await addMembersToGroupRepository(groupId, employeeIds);
  return { success: true };
};

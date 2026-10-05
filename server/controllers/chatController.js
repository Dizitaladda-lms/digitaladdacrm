import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  getUserGroupsService,
  getGroupDetailsService,
  createTeamGroupService,
  getGroupMessagesService,
  sendChatMessageService,
  markChatGroupReadService,
  addMembersToGroupService,
} from "../services/chatService.js";

export const getUserGroups = asyncHandler(async (req, res) => {
  const result = await getUserGroupsService(req.user);
  return res.status(200).json(new ApiResponse(200, result, "User chat groups retrieved successfully."));
});

export const getGroupDetails = asyncHandler(async (req, res) => {
  const result = await getGroupDetailsService(req.params.groupId, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Group details & members retrieved successfully."));
});

export const createTeamGroup = asyncHandler(async (req, res) => {
  const result = await createTeamGroupService(req.body, req.user);
  return res.status(201).json(new ApiResponse(201, result, "Team chat group created successfully."));
});

export const getGroupMessages = asyncHandler(async (req, res) => {
  const result = await getGroupMessagesService(req.params.groupId, req.query, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Group messages retrieved successfully."));
});

export const sendChatMessage = asyncHandler(async (req, res) => {
  const result = await sendChatMessageService(req.params.groupId, req.body, req.user);
  return res.status(201).json(new ApiResponse(201, result, "Message sent successfully."));
});

export const markChatGroupRead = asyncHandler(async (req, res) => {
  const result = await markChatGroupReadService(req.params.groupId, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Group marked as read."));
});

export const addMembersToGroup = asyncHandler(async (req, res) => {
  const result = await addMembersToGroupService(req.params.groupId, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Members added to group successfully."));
});

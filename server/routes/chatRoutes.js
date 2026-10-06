import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getChatUsers,
  getUserGroups,
  getOrCreateDirectChat,
  getGroupDetails,
  createTeamGroup,
  getGroupMessages,
  sendChatMessage,
  markChatGroupRead,
  addMembersToGroup,
} from "../controllers/chatController.js";

const router = express.Router();

router.use(authMiddleware);

// Active colleagues & interns for starting personal chats
router.get("/users", getChatUsers);

// Chat Channels / Groups / Direct Chats
router.get("/groups", getUserGroups);
router.post("/groups", createTeamGroup);
router.post("/direct", getOrCreateDirectChat);
router.get("/groups/:groupId", getGroupDetails);
router.post("/groups/:groupId/members", addMembersToGroup);

// Messages
router.get("/groups/:groupId/messages", getGroupMessages);
router.post("/groups/:groupId/messages", sendChatMessage);
router.post("/groups/:groupId/read", markChatGroupRead);

export default router;

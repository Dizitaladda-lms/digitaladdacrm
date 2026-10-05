import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getUserGroups,
  getGroupDetails,
  createTeamGroup,
  getGroupMessages,
  sendChatMessage,
  markChatGroupRead,
  addMembersToGroup,
} from "../controllers/chatController.js";

const router = express.Router();

router.use(authMiddleware);

// Chat Channels / Groups
router.get("/groups", getUserGroups);
router.post("/groups", createTeamGroup);
router.get("/groups/:groupId", getGroupDetails);
router.post("/groups/:groupId/members", addMembersToGroup);

// Messages
router.get("/groups/:groupId/messages", getGroupMessages);
router.post("/groups/:groupId/messages", sendChatMessage);
router.post("/groups/:groupId/read", markChatGroupRead);

export default router;

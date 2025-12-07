// backend/routes/chat.routes.js - COMPLETE FIXED VERSION
import express from "express";
import * as chatController from "../controllers/chat.controller.js";
import { isAuth } from "../middleware/auth.js";
import { checkUserBan } from "../middleware/checkBanStatus.js";
const router = express.Router();

// Dashboard data
router.get("/recent", isAuth, chatController.getRecentChats);

// Friend chat creation
router.get("/friend/:friendId", isAuth, chatController.getFriendChat);

// Message operations
router.get("/:chatId/messages", isAuth, chatController.getChatMessages);
router.post("/:chatId/mark-all-read", isAuth, chatController.markAllRead);
router.delete("/:chatId/messages", isAuth, chatController.clearChat);
router.post("/:chatId/mute", isAuth, chatController.muteChat);
router.get("/:chatId/meta", isAuth, chatController.getChatMeta);

// ✅ Block/Unblock
router.post("/:chatId/block-user", isAuth, chatController.blockUserInChat);
router.post("/:chatId/unblock-user", isAuth, chatController.unblockUserInChat);
router.get("/:chatId/block-status", isAuth, chatController.getBlockStatus);


// ✅ REMOVED: Disappearing messages route - replaced with unified 6-day auto-delete
// router.post("/:chatId/disappearing", isAuth, chatController.setDisappearingMessages);


// Cleanup
router.post("/cleanup", isAuth, chatController.cleanupDuplicateChats);
router.get("/recent", isAuth, checkUserBan, chatController.getRecentChats);
router.get(
  "/friend/:friendId",
  isAuth,
  checkUserBan,
  chatController.getFriendChat
);
export default router;

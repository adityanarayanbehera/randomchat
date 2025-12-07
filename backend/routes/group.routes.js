// backend/routes/group.routes.js
// ✅ UPDATED: Added disappearing messages routes
import express from "express";
import * as groupController from "../controllers/group.controller.js";
import { isAuth } from "../middleware/auth.js";
import { checkUserBan, checkGroupBan } from "../middleware/checkBanStatus.js";
const router = express.Router();

// Group CRUD
router.post("/create", isAuth, groupController.createGroup);
router.get("/my", isAuth, groupController.getMyGroups);
router.get("/search", isAuth, groupController.searchGroups);
router.get("/by-chat/:chatId", isAuth, groupController.getGroupByChatId);
router.get("/:groupId", isAuth, groupController.getGroup);
router.put("/:groupId", isAuth, groupController.updateGroup);

// Join/Leave
router.post("/:groupId/join", isAuth, groupController.joinGroup);
router.post("/join/:token", isAuth, groupController.joinViaInvite);
router.post("/:groupId/leave", isAuth, groupController.leaveGroup);

// Invite
router.post("/:groupId/invite", isAuth, groupController.generateInvite);
router.get("/invite/:token/preview", isAuth, groupController.previewInvite);

// Member Management (Admins only)
router.delete(
  "/:groupId/members/:memberId",
  isAuth,
  groupController.removeMember
);
router.post(
  "/:groupId/admins/:memberId",
  isAuth,
  groupController.promoteToAdmin
);
router.delete(
  "/:groupId/admins/:memberId/demote",
  isAuth,
  groupController.demoteAdmin
);

// ✅ NEW: Disappearing Messages (Owner only)
router.post(
  "/:groupId/disappearing",
  isAuth,
  groupController.setGroupDisappearing
);
router.get(
  "/:groupId/disappearing",
  isAuth,
  groupController.getGroupDisappearing
);

// ✅ NEW: Health check for debugging
router.get("/:groupId/health", isAuth, groupController.checkGroupHealth);

// APPLY to group routes:
router.post("/create", isAuth, checkUserBan, groupController.createGroup);
router.get("/my", isAuth, checkUserBan, groupController.getMyGroups);

// For specific group actions, check both user and group:
router.get(
  "/:groupId",
  isAuth,
  checkUserBan,
  checkGroupBan,
  groupController.getGroup
);
router.post(
  "/:groupId/join",
  isAuth,
  checkUserBan,
  checkGroupBan,
  groupController.joinGroup
);

export default router;

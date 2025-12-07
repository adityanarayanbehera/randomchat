
// backend/routes/user.routes.js
// ✅ CLEAN & WORKING
import express from "express";
import { isAuth } from "../middleware/auth.js";
import { checkUserBan } from "../middleware/checkBanStatus.js";
import * as userController from "../controllers/user.controller.js";

const router = express.Router();

// ✅ User Info
router.get("/me", isAuth, userController.getCurrentUser);

// ✅ Settings
router.put("/settings", isAuth, userController.updateSettings);

// ✅ Username
router.get("/check-username/:username", isAuth, userController.checkUsername);

// ✅ Profile
router.get("/profile/:userId", isAuth, userController.getUserProfile);
router.put("/profile", isAuth, checkUserBan, userController.updateProfile);

// ✅ Search
router.get("/search", isAuth, checkUserBan, userController.searchUsers);

// ✅ Account Management
router.delete("/account", isAuth, userController.deleteAccount);
router.post("/block/:userId", isAuth, userController.blockUser);
router.post("/unblock/:userId", isAuth, userController.unblockUser);
router.post("/report", isAuth, userController.reportUser);
router.get("/blocked", isAuth, userController.getBlockedUsers);

// ✅ Intro Message
router.get("/intro-message", isAuth, userController.getIntroMessage);
router.post("/intro-message", isAuth, userController.updateIntroMessage);

export default router;

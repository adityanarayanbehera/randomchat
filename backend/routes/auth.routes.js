// backend/routes/auth.routes.js
// ✅ NO MAJOR CHANGES - Routes are already correct, just added comments for clarity

import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { isAuth } from "../middleware/auth.js";

const router = express.Router();

// ✅ Public routes (no authentication required)
router.post("/anonymous", authController.createAnonymous); // Create anonymous user
router.post("/signup", authController.signup); // Email/password signup
router.post("/login", authController.login); // Email/password login
router.post("/google", authController.googleAuth); // Google OAuth
router.post("/forgot-password", authController.forgotPassword); // Request password reset
router.post("/reset-password", authController.resetPassword); // Reset password with code
router.post("/logout", authController.logout); // Logout
router.post("/verify-otp", authController.verifyOtp);
// ✅ Protected route (requires authentication)
router.get("/me", isAuth, authController.getCurrentUser); // Get current user profile

export default router;

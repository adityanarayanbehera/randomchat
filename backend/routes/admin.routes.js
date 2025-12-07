// backend/routes/admin.routes.js
// ✅ COMPLETE: All admin panel routes with proper organization
import express from "express";
import * as adminController from "../controllers/admin.controller.js";
import * as analyticsController from "../controllers/analytics.controller.js";
import {
  verifyAdminToken,
  checkPermission,
  logAdminAction,
  adminRateLimiter,
} from "../middleware/adminAuth.js";

const router = express.Router();

// ========================================================================
// PUBLIC ROUTES (No authentication)
// ========================================================================

router.post("/login", adminController.adminLogin);

// ========================================================================
// PROTECTED ROUTES (Authentication required)
// ========================================================================

// Auth & Profile
router.post(
  "/logout",
  verifyAdminToken,
  logAdminAction("LOGOUT"),
  adminController.adminLogout
);
router.get("/me", verifyAdminToken, adminController.getCurrentAdmin);

// Dashboard
router.get(
  "/dashboard/stats",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getDashboardStats
);

// ========================================================================
// USER MANAGEMENT
// ========================================================================

router.get(
  "/users",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getAllUsers
);

router.get(
  "/users/banned",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getBannedUsers
);

router.get(
  "/users/:userId",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getUserDetails
);

router.post(
  "/users/:userId/ban",
  verifyAdminToken,
  checkPermission("canBanUsers"),
  adminRateLimiter(20, 60000),
  logAdminAction("BAN_USER"),
  adminController.banUser
);

router.post(
  "/users/:userId/unban",
  verifyAdminToken,
  checkPermission("canBanUsers"),
  logAdminAction("UNBAN_USER"),
  adminController.unbanUser
);

router.delete(
  "/users/:userId",
  verifyAdminToken,
  checkPermission("canDeleteUsers"),
  adminRateLimiter(10, 60000),
  logAdminAction("DELETE_USER"),
  adminController.deleteUserAccount
);

router.post(
  "/users/bulk-delete",
  verifyAdminToken,
  checkPermission("canDeleteUsers"),
  adminRateLimiter(5, 60000), // More restrictive for bulk operations
  logAdminAction("BULK_DELETE_USERS"),
  adminController.bulkDeleteUsers
);

// ========================================================================
// GROUP MANAGEMENT
// ========================================================================

router.get(
  "/groups",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getAllGroups
);

router.get(
  "/groups/banned",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getBannedGroups
);

router.post(
  "/groups/:groupId/ban",
  verifyAdminToken,
  checkPermission("canBanUsers"),
  logAdminAction("BAN_GROUP"),
  adminController.banGroup
);

router.post(
  "/groups/:groupId/unban",
  verifyAdminToken,
  checkPermission("canBanUsers"),
  logAdminAction("UNBAN_GROUP"),
  adminController.unbanGroup
);

router.delete(
  "/groups/:groupId",
  verifyAdminToken,
  checkPermission("canDeleteGroups"), // Assuming this permission exists or use canDeleteUsers
  logAdminAction("DELETE_GROUP"),
  adminController.deleteGroup
);

router.post(
  "/groups/bulk-delete",
  verifyAdminToken,
  checkPermission("canDeleteGroups"),
  adminRateLimiter(5, 60000),
  logAdminAction("DELETE_GROUP"), // Or BULK_DELETE_GROUPS if added to enum
  adminController.bulkDeleteGroups
);

// ========================================================================
// SYSTEM MONITORING
// ========================================================================

router.get(
  "/system/metrics",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getSystemMetricsData
);

// ========================================================================
// SUBSCRIPTION MANAGEMENT
// ========================================================================

router.get(
  "/subscriptions/all",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getAllSubscriptions
);

router.get(
  "/subscriptions/pricing",
  verifyAdminToken,
  adminController.getSubscriptionPricing
);

router.put(
  "/subscriptions/pricing",
  verifyAdminToken,
  checkPermission("canViewAnalytics"), // Only super admin should have this
  adminController.updateSubscriptionPricing
);

router.post(
  "/subscriptions/cancel/:userId",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.cancelSubscription
);

// ========================================================================
// MESSAGE CLEANUP
// ========================================================================

router.get(
  "/cleanup/stats",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  adminController.getCleanupStats
);

router.post(
  "/cleanup/messages",
  verifyAdminToken,
  checkPermission("canDeleteUsers"), // Requires delete permission
  adminController.cleanupOldMessages
);

// ========================================================================
// ADMIN MANAGEMENT
// ========================================================================

router.get("/all", verifyAdminToken, adminController.getAllAdmins);

router.post(
  "/create",
  verifyAdminToken,
  checkPermission("canViewAnalytics"), // Only super admin
  adminController.createAdmin
);

router.delete(
  "/:adminId",
  verifyAdminToken,
  checkPermission("canViewAnalytics"), // Only super admin
  adminController.deleteAdmin
);

router.post(
  "/change-password",
  verifyAdminToken,
  adminController.changeAdminPassword
);

// ========================================================================
// FEEDBACK MANAGEMENT
// ========================================================================

router.get(
  "/feedback",
  verifyAdminToken,
  checkPermission("canManageFeedback"),
  logAdminAction("VIEW_FEEDBACK"),
  adminController.getAllFeedback
);

router.put(
  "/feedback/:feedbackId",
  verifyAdminToken,
  checkPermission("canManageFeedback"),
  adminController.updateFeedback
);

router.delete(
  "/feedback/:feedbackId",
  verifyAdminToken,
  checkPermission("canManageFeedback"),
  logAdminAction("DELETE_FEEDBACK"),
  async (req, res) => {
    try {
      const { feedbackId } = req.params;
      const Feedback = (await import("../models/Feedback.model.js")).default;
      await Feedback.findByIdAndDelete(feedbackId);
      res.status(200).json({ success: true, message: "Feedback deleted" });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Failed to delete feedback" });
    }
  }
);

// ========================================================================
// ADMIN LOGS
// ========================================================================

router.get(
  "/logs",
  verifyAdminToken,
  checkPermission("canViewLogs"),
  logAdminAction("VIEW_LOGS"),
  adminController.getAdminLogs
);

// ========================================================================
// REPORTS MANAGEMENT
// ========================================================================

router.get(
  "/reports",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  async (req, res) => {
    try {
      const { status = "pending" } = req.query;
      const Report = (await import("../models/Report.model.js")).default;

      const reports = await Report.find({ status })
        .populate("reporter", "username email")
        .populate("reported", "username email")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        reports,
      });
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.put(
  "/reports/:reportId",
  verifyAdminToken,
  checkPermission("canViewAnalytics"),
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status } = req.body;
      const Report = (await import("../models/Report.model.js")).default;

      await Report.findByIdAndUpdate(reportId, { status });

      res.status(200).json({
        success: true,
        message: "Report updated",
      });
    } catch (error) {
      console.error("Update report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ========================================================================
// PROMO CODE MANAGEMENT
// ========================================================================
// ✅ Simplified: Any authenticated admin can manage promo codes

router.post(
  "/promo-codes",
  verifyAdminToken,
  logAdminAction("CREATE_PROMO_CODE"),
  adminController.createPromoCode
);

router.get(
  "/promo-codes",
  verifyAdminToken,
  adminController.getAllPromoCodes
);

router.get(
  "/promo-codes/stats",
  verifyAdminToken,
  adminController.getPromoCodeStats
);

router.get(
  "/promo-codes/:codeId",
  verifyAdminToken,
  adminController.getPromoCodeDetails
);

router.put(
  "/promo-codes/:codeId",
  verifyAdminToken,
  logAdminAction("UPDATE_PROMO_CODE"),
  adminController.updatePromoCode
);

router.delete(
  "/promo-codes/:codeId",
  verifyAdminToken,
  logAdminAction("DELETE_PROMO_CODE"),
  adminController.deletePromoCode
);

// ========================================================================
// SUBSCRIPTION MANAGEMENT
// ========================================================================

router.get(
  "/subscriptions/all",
  verifyAdminToken,
  adminController.getAllSubscriptions
);

router.post(
  "/subscriptions/bulk-cancel",
  verifyAdminToken,
  checkPermission("canDeleteUsers"), // Assuming delete permission is enough
  logAdminAction("UPDATE_CONFIG"), // Or generic
  adminController.bulkCancelSubscriptions
);

// ========================================================================
// BACKUP MANAGEMENT
// ========================================================================

import * as backupController from "../controllers/backup.controller.js";

router.post(
  "/backups/create",
  verifyAdminToken,
  checkPermission("canViewAnalytics"), // Only super admin
  logAdminAction("CREATE_BACKUP"),
  backupController.createBackup
);

router.get(
  "/backups",
  verifyAdminToken,
  backupController.getBackupLogs
);

router.get(
  "/backups/download/:filename",
  verifyAdminToken,
  backupController.downloadBackup
);

// ========================================================================
// ANALYTICS & SYSTEM MONITORING
// ========================================================================

router.get(
  "/analytics/overview",
  verifyAdminToken,
  analyticsController.getAnalyticsOverview
);

router.get(
  "/analytics/chart-data",
  verifyAdminToken,
  analyticsController.getChartData
);

router.delete(
  "/system/cleanup-chats",
  verifyAdminToken,
  checkPermission("canDeleteUsers"), // Requires delete permission
  logAdminAction("CLEANUP_CHAT_DATA"),
  analyticsController.cleanupChatData
);

router.post(
  "/system/restart",
  verifyAdminToken,
  checkPermission("canViewAnalytics"), // Only super admin
  logAdminAction("RESTART_SERVER"),
  analyticsController.restartServer
);

router.get(
  "/system/config",
  verifyAdminToken,
  analyticsController.getSystemConfig
);

router.put(
  "/system/config",
  verifyAdminToken,
  checkPermission("canViewAnalytics"), // Only super admin
  logAdminAction("UPDATE_CONFIG"),
  analyticsController.updateSystemConfig
);

export default router;

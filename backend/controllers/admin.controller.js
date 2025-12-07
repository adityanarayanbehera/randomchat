
// backend/controllers/admin.controller.js
// ✅ COMPLETE: All admin functionalities
import Admin from "../models/Admin.model.js";
import AdminLog from "../models/AdminLog.model.js";
import User from "../models/User.model.js";
import Chat from "../models/Chat.model.js";
import Group from "../models/Group.model.js";
import Feedback from "../models/Feedback.model.js";
import Report from "../models/Report.model.js";
import Message from "../models/Message.model.js";
import jwt from "jsonwebtoken";
import {
  getSystemMetrics,
  getPerformanceHistory,
} from "../utils/systemMetrics.js";
import { redisClient } from "../server.js";
import { sendSubscriptionEmail } from "../utils/mailer.js";
import { SUBSCRIPTION_PRICES } from "../config/prices.js";
// ========================================================================
// AUTHENTICATION
// ========================================================================

/**
 * POST /api/admin/login
 * Admin login with email, password, and secret code
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password, secretCode } = req.body;

    if (!email || !password || !secretCode) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and secret code are required",
      });
    }

    // Find admin with password and secretCode
    const admin = await Admin.findOne({ email }).select(
      "+password +secretCode"
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({
        success: false,
        message: "Account locked due to too many failed attempts",
        lockUntil: admin.lockUntil,
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is deactivated",
      });
    }

    // Verify password
    const isPasswordMatch = await admin.comparePassword(password);
    if (!isPasswordMatch) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify secret code
    const isSecretMatch = await admin.compareSecretCode(secretCode);
    if (!isSecretMatch) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid secret code",
      });
    }

    // Reset login attempts
    await admin.resetLoginAttempts();

    // Generate JWT
    const token = jwt.sign(
      {
        adminId: admin._id,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Log login action
    await AdminLog.create({
      adminId: admin._id,
      action: "LOGIN",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: "SUCCESS",
    });

    console.log(`✅ Admin login: ${admin.email}`);

    res.status(200).json({
      success: true,
      message: "Login successful",
      admin: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

/**
 * POST /api/admin/logout
 */
export const adminLogout = async (req, res) => {
  try {
    res.clearCookie("adminToken");

    // Log logout
    await AdminLog.create({
      adminId: req.adminId,
      action: "LOGOUT",
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("❌ Admin logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

/**
 * GET /api/admin/me
 */
export const getCurrentAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId);

    res.status(200).json({
      success: true,
      admin: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    console.error("❌ Get current admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get admin details",
    });
  }
};

// ========================================================================
// DASHBOARD STATS
// ========================================================================

/**
 * GET /api/admin/dashboard/stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      maleUsers,
      femaleUsers,
      anonymousUsers,
      registeredUsers,
      premiumUsers,
      totalChats,
      totalGroups,
      activeUsers,
      pendingReports,
      pendingFeedback,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ gender: "male" }),
      User.countDocuments({ gender: "female" }),
      User.countDocuments({ isAnonymous: true }),
      User.countDocuments({ isAnonymous: false }),
      User.countDocuments({ "subscription.tier": { $ne: "free" } }),
      Chat.countDocuments(),
      Group.countDocuments(),
      User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }),
      Report.countDocuments({ status: "pending" }),
      Feedback.countDocuments({ status: "PENDING" }),
    ]);

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newUsersToday, newChatsToday, newGroupsToday] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: today } }),
      Chat.countDocuments({ createdAt: { $gte: today } }),
      Group.countDocuments({ createdAt: { $gte: today } }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          male: maleUsers,
          female: femaleUsers,
          anonymous: anonymousUsers,
          registered: registeredUsers,
          premium: premiumUsers,
          active: activeUsers,
          newToday: newUsersToday,
        },
        chats: {
          total: totalChats,
          newToday: newChatsToday,
        },
        groups: {
          total: totalGroups,
          newToday: newGroupsToday,
        },
        reports: {
          pending: pendingReports,
        },
        feedback: {
          pending: pendingFeedback,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard stats",
    });
  }
};

// ========================================================================
// USER MANAGEMENT
// ========================================================================

/**
 * GET /api/admin/users
 * Get all users with advanced filters, sorting, and pagination
 */
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      gender,
      isAnonymous,
      subscriptionTier,
      inactiveFor, // "1", "2", "3", "6", "12" (months)
      tier, // "free", "premium"
      banStatus, // "banned", "active"
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Gender filter
    if (gender) query.gender = gender;

    // Account Type Filter (Enhanced)
    // Values: "google", "email", "registered", "anonymous"
    if (req.query.accountType) {
      const type = req.query.accountType;
      
      if (type === "google") {
        query.googleId = { $exists: true, $ne: null, $ne: "" };
      } else if (type === "email") {
        query.email = { $exists: true, $ne: null, $ne: "" };
        query.$or = [
          { googleId: { $exists: false } },
          { googleId: null },
          { googleId: "" }
        ];
      } else if (type === "registered") {
        // All registered users (Google OR Email)
        // Basically anyone with an email
        query.email = { $exists: true, $ne: null, $ne: "" };
      } else if (type === "anonymous") {
        // No email = anonymous
        query.$or = [
          { email: { $exists: false } },
          { email: null },
          { email: "" }
        ];
      }
    }

    // Legacy Anonymous filter (backward compatibility)
    if (isAnonymous !== undefined && !req.query.accountType) {
      query.isAnonymous = isAnonymous === "true";
    }

    // Inactive filter (new)
    if (inactiveFor) {
      const months = parseInt(inactiveFor);
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      query.lastActive = { $lt: cutoffDate };
    }

    // Tier filter (enhanced)
    if (tier === "free") {
      query.$or = [
        { "subscription.tier": "free" },
        { "subscription.tier": { $exists: false } },
        { "subscription.tier": null },
      ];
    } else if (tier === "premium") {
      query["subscription.tier"] = "premium";
    }

    // Legacy subscription tier filter (for backward compatibility)
    if (subscriptionTier && !tier) {
      query["subscription.tier"] = subscriptionTier;
    }

    // Ban status filter (new)
    if (banStatus === "banned") {
      query.isBanned = true;
    } else if (banStatus === "active") {
      query.isBanned = false;
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query)
        .select(
          "username email gender age location isAnonymous subscription createdAt lastActive avatar friends blockedUsers isBanned banReason"
        )
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("❌ Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

/**
 * GET /api/admin/users/:userId
 * Get detailed user profile
 */
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate("friends", "username avatar gender")
      .populate("blockedUsers", "username avatar")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's chats and groups
    const [userChats, userGroups] = await Promise.all([
      Chat.countDocuments({ participants: userId }),
      Group.countDocuments({ members: userId }),
    ]);

    res.status(200).json({
      success: true,
      user: {
        ...user,
        stats: {
          totalChats: userChats,
          totalGroups: userGroups,
          friendsCount: user.friends?.length || 0,
          blockedCount: user.blockedUsers?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
};

/**
 * POST /api/admin/users/:userId/ban
 * Ban a user permanently
 */
export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in days (0 = permanent)

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user status
    user.isBanned = true;
    user.banReason = reason || "Violation of terms";
    user.bannedAt = new Date();
    user.banExpiresAt =
      duration > 0
        ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
        : null;
    await user.save();

    // Disconnect user if online
    if (global.io) {
      global.io.to(`user:${userId}`).emit("banned", {
        reason: user.banReason,
        permanent: !user.banExpiresAt,
      });
    }

    console.log(`🚫 User banned: ${userId}`);

    res.status(200).json({
      success: true,
      message: "User banned successfully",
    });
  } catch (error) {
    console.error("❌ Ban user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to ban user",
    });
  }
};

/**
 * POST /api/admin/users/:userId/unban
 */
export const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBanned: false,
        banReason: null,
        bannedAt: null,
        banExpiresAt: null,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User unbanned successfully",
    });
  } catch (error) {
    console.error("❌ Unban user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unban user",
    });
  }
};

/**
 * GET /api/admin/users/:userId
 * Get single user details
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

/**
 * POST /api/admin/users/bulk-delete
 * Delete multiple users at once
 */
export const bulkDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    // Get user details before deletion for logging
    const usersToDelete = await User.find({
      _id: { $in: userIds },
    }).select("username email");

    // Delete users
    const result = await User.deleteMany({
      _id: { $in: userIds },
    });

    // Clean up related data (same as single delete)
    await Promise.all([
      Chat.deleteMany({ 
        $or: [
          { participants: { $in: userIds } },
          { user1: { $in: userIds } },
          { user2: { $in: userIds } }
        ]
      }),
      Message.deleteMany({ sender: { $in: userIds } }),
      Group.updateMany(
        { members: { $in: userIds } },
        { $pull: { members: { $in: userIds } } }
      ),
      Report.deleteMany({ 
        $or: [
          { reporter: { $in: userIds } }, 
          { reported: { $in: userIds } }
        ] 
      }),
      Feedback.deleteMany({ userId: { $in: userIds } }),
    ]);

    // Disconnect if online
    if (global.io) {
      userIds.forEach(userId => {
        global.io.to(`user:${userId}`).emit("account_deleted");
      });
    }

    // Log action
    await AdminLog.create({
      adminId: req.adminId,
      action: "BULK_DELETE_USERS",
      details: `Deleted ${result.deletedCount} users`,
      metadata: {
        userIds,
        count: result.deletedCount,
        users: usersToDelete.map((u) => ({
          id: u._id,
          username: u.username,
          email: u.email,
        })),
      },
      status: "SUCCESS",
    });

    console.log(
      `🗑️ Bulk deleted ${result.deletedCount} users by admin ${req.adminId}`
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} user(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("❌ Bulk delete users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete users",
    });
  }
};

/**
 * DELETE /api/admin/users/:userId
 * Permanently delete user account
 */
export const deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete user
    await User.findByIdAndDelete(userId);

    // Clean up related data
    await Promise.all([
      Chat.deleteMany({ participants: userId }),
      Group.updateMany({ members: userId }, { $pull: { members: userId } }),
      Report.deleteMany({ $or: [{ reporter: userId }, { reported: userId }] }),
      Feedback.deleteMany({ userId }),
    ]);

    // Disconnect if online
    if (global.io) {
      global.io.to(`user:${userId}`).emit("account_deleted");
    }

    console.log(`🗑️ User deleted: ${userId}`);

    res.status(200).json({
      success: true,
      message: "User account deleted permanently",
    });
  } catch (error) {
    console.error("❌ Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

// ========================================================================
// SYSTEM METRICS & PERFORMANCE
// ========================================================================

/**
 * GET /api/admin/system/metrics
 */
export const getSystemMetricsData = async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    const history = await getPerformanceHistory();

    res.status(200).json({
      success: true,
      metrics,
      history,
    });
  } catch (error) {
    console.error("❌ Get system metrics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get system metrics",
    });
  }
};

// ========================================================================
// GROUPS MANAGEMENT
// ========================================================================

/**
 * GET /api/admin/groups
 */
export const getAllGroups = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      inactiveFor, // "1", "2", "6", "12" (months)
      banStatus, // "banned", "active"
      sortBy = "lastActivity",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Inactive filter
    if (inactiveFor) {
      const months = parseInt(inactiveFor);
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      query.lastActivity = { $lt: cutoffDate };
    }

    // Ban status filter
    if (banStatus === "banned") {
      query.isBanned = true;
    } else if (banStatus === "active") {
      query.isBanned = false;
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [groups, total] = await Promise.all([
      Group.find(query)
        .populate("owner", "username email")
        .populate("admins", "username")
        .select(
          "name owner admins members isPublic createdAt avatar isBanned banReason bannedAt lastActivity"
        )
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Group.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      groups,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("❌ Get groups error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/groups/bulk-delete
 */
export const bulkDeleteGroups = async (req, res) => {
  try {
    const { groupIds } = req.body;

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Group IDs array is required",
      });
    }

    // Get group details before deletion for logging
    const groupsToDelete = await Group.find({
      _id: { $in: groupIds },
    }).select("name");

    // Delete groups
    const result = await Group.deleteMany({
      _id: { $in: groupIds },
    });

    // Clean up related data
    await Promise.all([
      Message.deleteMany({ groupId: { $in: groupIds } }),
      // Optionally remove group references from users if you store them there
    ]);

    // Log action
    await AdminLog.create({
      adminId: req.adminId,
      action: "DELETE_GROUP", // Using existing action or add BULK_DELETE_GROUPS
      details: `Bulk deleted ${result.deletedCount} groups`,
      metadata: {
        groupIds,
        count: result.deletedCount,
        groups: groupsToDelete.map((g) => ({
          id: g._id,
          name: g.name,
        })),
      },
      status: "SUCCESS",
    });

    console.log(
      `🗑️ Bulk deleted ${result.deletedCount} groups by admin ${req.adminId}`
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} group(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("❌ Bulk delete groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete groups",
    });
  }
};

/**
 * POST /api/admin/groups/:groupId/ban
 */
export const banGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { reason } = req.body;

    await Group.findByIdAndUpdate(groupId, {
      isBanned: true,
      banReason: reason || "Violation of terms",
      bannedAt: new Date(),
    });

    console.log(`🚫 Group banned: ${groupId}`);

    res.status(200).json({
      success: true,
      message: "Group banned successfully",
    });
  } catch (error) {
    console.error("❌ Ban group error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/groups/:groupId/unban
 */
export const unbanGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    await Group.findByIdAndUpdate(groupId, {
      isBanned: false,
      banReason: null,
      bannedAt: null,
    });

    console.log(`✅ Group unbanned: ${groupId}`);

    res.status(200).json({
      success: true,
      message: "Group unbanned successfully",
    });
  } catch (error) {
    console.error("❌ Unban group error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/admin/groups/:groupId
 */
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Delete group
    await Group.findByIdAndDelete(groupId);

    // Delete associated chat
    const group = await Group.findById(groupId).lean();
    if (group?.chatId) {
      await Chat.findByIdAndDelete(group.chatId);
      await ChatMeta.deleteMany({ chatId: group.chatId });
    }

    console.log(`🗑️ Group deleted: ${groupId}`);

    res.status(200).json({
      success: true,
      message: "Group deleted permanently",
    });
  } catch (error) {
    console.error("❌ Delete group error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/admin/users/banned
 */
export const getBannedUsers = async (req, res) => {
  try {
    const users = await User.find({ isBanned: true })
      .select("username email banReason bannedAt banExpiresAt avatar")
      .sort({ bannedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("❌ Get banned users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/admin/groups/banned
 */
export const getBannedGroups = async (req, res) => {
  try {
    const groups = await Group.find({ isBanned: true })
      .populate("owner", "username email")
      .select("name owner banReason bannedAt avatar")
      .sort({ bannedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error("❌ Get banned groups error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================================================
// SUBSCRIPTION MANAGEMENT
// ========================================================================
/**
 * GET /api/admin/subscriptions/pricing
 * Get current subscription pricing
 */
export const getSubscriptionPricing = async (req, res) => {
  try {
    const pricing = {
      monthly: SUBSCRIPTION_PRICES.tier1.monthly,
      yearly: SUBSCRIPTION_PRICES.tier1.yearly,
    };

    res.status(200).json({ success: true, pricing });
  } catch (error) {
    console.error("❌ Get pricing error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PUT /api/admin/subscriptions/pricing
 * Update subscription pricing with auto-upgrade logic
 */
export const updateSubscriptionPricing = async (req, res) => {
  try {
    const { monthly, yearly } = req.body;

    // ✅ Allow negative values for "Coming Soon" mode
    // Validate input type only (not value range)
    if (typeof monthly !== "number") {
      return res.status(400).json({
        success: false,
        message: "Invalid monthly price - must be a number",
      });
    }

    // Update prices.js file dynamically
    const fs = await import("fs");
    const path = await import("path");

    const pricesPath = path.join(process.cwd(), "config", "prices.js");
    const newContent = `// backend/config/prices.js
export const SUBSCRIPTION_PRICES = {
  tier1: {
    monthly: ${monthly},
    yearly: ${yearly || monthly * 12},
  },
  tier2: {
    monthly: ${monthly * 2},
    yearly: ${(yearly || monthly * 12) * 2},
  },
  tier3: {
    monthly: ${monthly * 3},
    yearly: ${(yearly || monthly * 12) * 3},
  },
};
`;


    fs.writeFileSync(pricesPath, newContent);

    // ✅ Clear Redis cache so new price is fetched on next request
    try {
      const { redisClient } = await import("../config/redis.js");
      await redisClient.del("subscription:price");
      console.log("🗑️  Price cache cleared");
    } catch (redisError) {
      console.error("⚠️  Redis cache clear failed:", redisError.message);
    }

    console.log(`💰 Pricing updated: ₹${monthly}/month`);

    // ✅ AUTO-UPGRADE LOGIC: If price is set to 0
    if (monthly === 0) {
      console.log("🎁 FREE SUBSCRIPTION MODE ACTIVATED");

      // Find all non-premium users
      const nonPremiumUsers = await User.find({
        $or: [
          { "subscription.tier": "free" },
          { "subscription.tier": { $exists: false } },
          {
            "subscription.expiresAt": { $lt: new Date() },
          },
        ],
      });

      console.log(`📢 Found ${nonPremiumUsers.length} users to upgrade`);

      // Upgrade all users to premium (lifetime)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 100); // 100 years = lifetime

      for (const user of nonPremiumUsers) {
        await User.findByIdAndUpdate(user._id, {
          "subscription.tier": "premium",
          "subscription.duration": "lifetime",
          "subscription.expiresAt": expiryDate,
          "subscription.paymentId": "FREE_ADMIN_UPGRADE",
          "subscription.activatedAt": new Date(),
          "settings.hasGenderFilter": true,
          "settings.genderFilterEnabled": false,
          "settings.genderPreference": "any",
          "settings.fallbackToRandom": true,
        });

        // ✅ Send free subscription email
        try {
          await sendSubscriptionEmail({
            email: user.email || `${user.username}@temp.com`,
            username: user.username,
            amount: 0,
            duration: "Lifetime",
            transactionId: "FREE_ADMIN_UPGRADE",
            expiryDate: expiryDate.toLocaleDateString("en-IN"),
            isFree: true,
          });
          console.log(`📧 Free subscription email sent to ${user.username}`);
        } catch (emailError) {
          console.error(
            `❌ Email failed for ${user.username}:`,
            emailError.message
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Pricing set to FREE! ${nonPremiumUsers.length} users upgraded to premium`,
        pricing: { monthly, yearly: yearly || monthly * 12 },
        upgradedUsers: nonPremiumUsers.length,
      });
    }

    // Normal price update
    res.status(200).json({
      success: true,
      message: "Pricing updated successfully",
      pricing: { monthly, yearly: yearly || monthly * 12 },
    });
  } catch (error) {
    console.error("❌ Update pricing error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/admin/subscriptions/all
 * Get all subscribed users with filters
 */
export const getAllSubscriptions = async (req, res) => {
  try {
    const { paymentType, status } = req.query;

    const query = {};

    // Payment type filter
    if (paymentType === "paid") {
      query["subscription.paymentId"] = {
        $regex: /^pay_/, // Razorpay payment IDs
        $ne: null,
      };
    } else if (paymentType === "promo") {
      query["subscription.paymentId"] = {
        $regex: /^PROMO_/,
      };
    }

    // Status filter
    if (status === "active") {
      query["subscription.tier"] = "premium";
      query["subscription.expiresAt"] = { $gte: new Date() };
    } else if (status === "expired") {
      query["subscription.expiresAt"] = { $lt: new Date() };
    } else {
      // Default: show all users who have/had premium
      // If no specific filter, we default to showing current premium users
      // to match previous behavior, OR we can show anyone with a subscription record
      if (!paymentType) {
        query["subscription.tier"] = "premium";
      }
    }

    const users = await User.find(query)
      .select("username email avatar subscription")
      .sort({ "subscription.activatedAt": -1 })
      .lean();

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("❌ Get subscriptions error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/subscriptions/bulk-cancel
 */
export const bulkCancelSubscriptions = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    // Cancel subscriptions
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      {
        $set: {
          "subscription.tier": "free",
          "subscription.expiresAt": new Date(),
          "settings.hasGenderFilter": false,
        },
      }
    );

    // Log action
    await AdminLog.create({
      adminId: req.adminId,
      action: "UPDATE_CONFIG", // Using generic action to avoid model update
      details: `Bulk cancelled ${result.modifiedCount} subscriptions`,
      metadata: {
        userIds,
        count: result.modifiedCount,
      },
      status: "SUCCESS",
    });

    console.log(
      `📉 Bulk cancelled ${result.modifiedCount} subscriptions by admin ${req.adminId}`
    );

    res.status(200).json({
      success: true,
      message: `Successfully cancelled ${result.modifiedCount} subscription(s)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Bulk cancel subscriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscriptions",
    });
  }
};

/**
 * POST /api/admin/subscriptions/cancel/:userId
 * Cancel user subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        "subscription.tier": "free",
        "subscription.expiresAt": new Date(), // Expire immediately
        "settings.hasGenderFilter": false,
        "settings.genderFilterEnabled": false,
      },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log(`❌ Subscription cancelled for ${user.username}`);

    res.status(200).json({
      success: true,
      message: "Subscription cancelled",
    });
  } catch (error) {
    console.error("❌ Cancel subscription error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================================================
// MESSAGE CLEANUP
// ========================================================================

/**
 * GET /api/admin/cleanup/stats
 */
export const getCleanupStats = async (req, res) => {
  try {
    // Get total messages count
    const allChats = await Chat.find().lean();
    let totalMessages = 0;
    let oldMessages = 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const chat of allChats) {
      totalMessages += chat.messages?.length || 0;

      if (chat.messages) {
        oldMessages += chat.messages.filter(
          (msg) => new Date(msg.createdAt) < thirtyDaysAgo
        ).length;
      }
    }

    // Get MongoDB stats
    const dbStats = await mongoose.connection.db.stats();
    const storageUsed = `${(dbStats.dataSize / (1024 * 1024)).toFixed(2)} MB`;
    const storageTotal = `${(dbStats.storageSize / (1024 * 1024)).toFixed(
      2
    )} MB`;

    res.status(200).json({
      success: true,
      stats: {
        totalMessages,
        oldMessages,
        storageUsed,
        storageTotal,
        chatMessages: totalMessages,
        groupMessages: 0, // Can be calculated separately if needed
        chatStorage: storageUsed,
        groupStorage: "0 MB",
        images: 0,
        imageStorage: "0 MB",
      },
    });
  } catch (error) {
    console.error("❌ Get cleanup stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/cleanup/messages
 */
export const cleanupOldMessages = async (req, res) => {
  try {
    const { days = 30 } = req.body;

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let deletedCount = 0;
    const chats = await Chat.find();

    for (const chat of chats) {
      const initialCount = chat.messages?.length || 0;

      chat.messages = chat.messages.filter(
        (msg) => new Date(msg.createdAt) > cutoffDate
      );

      deletedCount += initialCount - chat.messages.length;

      if (initialCount !== chat.messages.length) {
        await chat.save();

        // Clear Redis cache
        await redisClient.del(`chat:messages:${chat._id}`);
      }
    }

    console.log(
      `🗑️ Cleanup: Deleted ${deletedCount} messages older than ${days} days`
    );

    res.status(200).json({
      success: true,
      message: "Cleanup completed successfully",
      deletedCount,
      freedSpace: "~MB", // Approximate
    });
  } catch (error) {
    console.error("❌ Cleanup messages error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================================================
// ADMIN MANAGEMENT
// ========================================================================

/**
 * GET /api/admin/all
 */
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select("name email role createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      admins,
    });
  } catch (error) {
    console.error("❌ Get admins error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/create (Super Admin only)
 */
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, secretCode, role } = req.body;

    // Check if admin with email exists
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Admin with this email already exists",
      });
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password,
      secretCode,
      role: role || "admin",
    });

    console.log(`✅ Admin created: ${email}`);

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("❌ Create admin error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/admin/:adminId (Super Admin only)
 */
export const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Don't allow deleting super_admin
    const admin = await Admin.findById(adminId);
    if (admin.role === "super_admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete super admin",
      });
    }

    await Admin.findByIdAndDelete(adminId);

    console.log(`🗑️ Admin deleted: ${adminId}`);

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete admin error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/change-password
 */
export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.adminId;

    const admin = await Admin.findById(adminId).select("+password");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    console.log(`🔑 Password changed: ${admin.email}`);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================================================
// FEEDBACK MANAGEMENT
// ========================================================================

/**
 * GET /api/admin/feedback
 */
export const getAllFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, priority } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const [feedback, total] = await Promise.all([
      Feedback.find(query)
        .populate("userId", "username email gender")
        .populate("resolvedBy", "name email")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Feedback.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      feedback,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
    });
  }
};

/**
 * PUT /api/admin/feedback/:feedbackId
 */
export const updateFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status, priority, adminNotes } = req.body;

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      {
        status,
        priority,
        adminNotes,
        ...(status === "RESOLVED" && {
          resolvedBy: req.adminId,
          resolvedAt: new Date(),
        }),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("❌ Update feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update feedback",
    });
  }
};

// ========================================================================
// ADMIN LOGS
// ========================================================================

/**
 * GET /api/admin/logs
 */
export const getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, adminId } = req.query;

    const query = {};
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;

    const [logs, total] = await Promise.all([
      AdminLog.find(query)
        .populate("adminId", "name email role")
        .populate("targetUserId", "username email")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      AdminLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get admin logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
    });
  }
};

// ========================================================================
// PROMO CODE MANAGEMENT
// ========================================================================

/**
 * POST /api/admin/promo-codes
 * Create a new promo code (superadmin only)
 */
export const createPromoCode = async (req, res) => {
  try {
    const { code, description, maxUses, expiresAt } = req.body;

    console.log("📝 Creating promo code:", {
      adminId: req.adminId,
      adminRole: req.adminRole,
      code,
      description,
    });

    // Validate input
    if (!code || !description) {
      return res.status(400).json({
        success: false,
        message: "Code and description are required",
      });
    }

    // Import PromoCode model
    const PromoCode = (await import("../models/PromoCode.model.js")).default;

    // Check if code already exists
    const existingCode = await PromoCode.findOne({
      code: code.toUpperCase().trim(),
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: "Promo code already exists",
      });
    }

    // Create promo code
    const promoCode = await PromoCode.create({
      code: code.toUpperCase().trim(),
      description,
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.adminId,
    });

    // Log action (non-blocking - don't fail if logging fails)
    try {
      await AdminLog.create({
        adminId: req.adminId,
        action: "CREATE_PROMO_CODE",
        details: { code: promoCode.code },
        status: "SUCCESS",
      });
    } catch (logError) {
      console.warn("⚠️ Failed to log promo code creation:", logError.message);
      // Continue anyway - logging failure shouldn't stop promo code creation
    }

    console.log(`✅ Promo code created: ${promoCode.code}`);

    res.status(201).json({
      success: true,
      message: "Promo code created successfully",
      promoCode: {
        _id: promoCode._id,
        code: promoCode.code,
        description: promoCode.description,
        maxUses: promoCode.maxUses,
        usedCount: promoCode.usedCount,
        expiresAt: promoCode.expiresAt,
        isActive: promoCode.isActive,
        createdAt: promoCode.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Create promo code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create promo code",
    });
  }
};

/**
 * GET /api/admin/promo-codes
 * Get all promo codes with pagination and filters
 */
export const getAllPromoCodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const PromoCode = (await import("../models/PromoCode.model.js")).default;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [promoCodes, total] = await Promise.all([
      PromoCode.find(query)
        .populate("createdBy", "name email")
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      PromoCode.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      promoCodes,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("❌ Get promo codes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promo codes",
    });
  }
};

/**
 * GET /api/admin/promo-codes/:codeId
 * Get detailed promo code information including users who redeemed it
 */
export const getPromoCodeDetails = async (req, res) => {
  try {
    const { codeId } = req.params;

    const PromoCode = (await import("../models/PromoCode.model.js")).default;

    const promoCode = await PromoCode.findById(codeId)
      .populate("createdBy", "name email")
      .populate("usedBy.userId", "username email avatar")
      .lean();

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    res.status(200).json({
      success: true,
      promoCode,
    });
  } catch (error) {
    console.error("❌ Get promo code details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promo code details",
    });
  }
};

/**
 * PUT /api/admin/promo-codes/:codeId
 * Update promo code (cannot change the code itself)
 */
export const updatePromoCode = async (req, res) => {
  try {
    const { codeId } = req.params;
    const { description, maxUses, expiresAt, isActive } = req.body;

    const PromoCode = (await import("../models/PromoCode.model.js")).default;

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (expiresAt !== undefined)
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const promoCode = await PromoCode.findByIdAndUpdate(codeId, updateData, {
      new: true,
    });

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    // Log action
    await AdminLog.create({
      adminId: req.adminId,
      action: "UPDATE_PROMO_CODE",
      details: { code: promoCode.code, updates: updateData },
      status: "SUCCESS",
    });

    console.log(`✅ Promo code updated: ${promoCode.code}`);

    res.status(200).json({
      success: true,
      message: "Promo code updated successfully",
      promoCode,
    });
  } catch (error) {
    console.error("❌ Update promo code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update promo code",
    });
  }
};

/**
 * DELETE /api/admin/promo-codes/:codeId
 * Delete (deactivate) promo code
 */
export const deletePromoCode = async (req, res) => {
  try {
    const { codeId } = req.params;

    const PromoCode = (await import("../models/PromoCode.model.js")).default;

    const promoCode = await PromoCode.findByIdAndUpdate(
      codeId,
      { isActive: false },
      { new: true }
    );

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    // Log action
    await AdminLog.create({
      adminId: req.adminId,
      action: "DELETE_PROMO_CODE",
      details: { code: promoCode.code },
      status: "SUCCESS",
    });

    console.log(`🗑️ Promo code deactivated: ${promoCode.code}`);

    res.status(200).json({
      success: true,
      message: "Promo code deactivated successfully",
    });
  } catch (error) {
    console.error("❌ Delete promo code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete promo code",
    });
  }
};

/**
 * GET /api/admin/promo-codes/stats
 * Get promo code usage statistics
 */
export const getPromoCodeStats = async (req, res) => {
  try {
    const PromoCode = (await import("../models/PromoCode.model.js")).default;

    const [totalCodes, activeCodes, totalRedemptions, expiredCodes] =
      await Promise.all([
        PromoCode.countDocuments(),
        PromoCode.countDocuments({ isActive: true }),
        PromoCode.aggregate([
          { $group: { _id: null, total: { $sum: "$usedCount" } } },
        ]),
        PromoCode.countDocuments({
          expiresAt: { $lt: new Date() },
          isActive: true,
        }),
      ]);

    // Get top used promo codes
    const topCodes = await PromoCode.find({ usedCount: { $gt: 0 } })
      .sort({ usedCount: -1 })
      .limit(5)
      .select("code description usedCount maxUses")
      .lean();

    res.status(200).json({
      success: true,
      stats: {
        totalCodes,
        activeCodes,
        totalRedemptions: totalRedemptions[0]?.total || 0,
        expiredCodes,
        topCodes,
      },
    });
  } catch (error) {
    console.error("❌ Get promo code stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promo code statistics",
    });
  }
};

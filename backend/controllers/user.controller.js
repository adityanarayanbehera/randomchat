// backend/controllers/user.controller.js
import { userCache } from "../socket/matchWorker.js"; // at top of file
import User from "../models/User.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { redisClient } from "../server.js";
// ✅ ADD IMPORT AT TOP
import {
  isUsernameAvailable,
  generateSuggestions,
} from "../utils/usernameGenerator.js";
// Check Username Availability
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const userId = req.userId;

    const existing = await User.findOne({
      username,
      _id: { $ne: userId },
    });

    if (existing) {
      // Generate suggestions
      const suggestions = [];
      for (let i = 1; i <= 3; i++) {
        const suggestion = `${username}_${Math.floor(Math.random() * 1000)}`;
        const exists = await User.findOne({ username: suggestion });
        if (!exists) suggestions.push(suggestion);
      }

      return res.status(200).json({
        available: false,
        suggestions,
      });
    }

    res.status(200).json({ available: true });
  } catch (error) {
    console.error("Check username error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Profile (Enhanced with better validation)
export const updateProfile = async (req, res) => {
  try {
    const { username, age, location, avatar, state, country, gender } =
      req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ ENHANCED: Username validation
    if (username) {
      // Validate format
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({
          message: "Username must be 3-30 characters",
        });
      }

      // Check availability
      const available = await isUsernameAvailable(username, userId);

      if (!available) {
        // Generate suggestions
        const suggestions = await generateSuggestions(username, user.gender);

        return res.status(400).json({
          message: "Username already taken",
          suggestions,
        });
      }

      user.username = username;
    }

    // ✅ Update other fields
    if (age) user.age = age;
    if (location) user.location = location;
    if (avatar !== undefined) user.avatar = avatar; // Allow null to remove avatar
    if (state) user.state = state;
    if (country) user.country = country;
    if (gender && ["male", "female"].includes(gender)) user.gender = gender;

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/user/settings
 * Update user settings (including gender filter)
 */
// ✅ ADD THIS FUNCTION
export const updateSettings = async (req, res) => {
  try {
    const {
      notifications,
      genderFilterEnabled,
      genderPreference,
      fallbackToRandom,
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check gender filter access
    const hasGenderFilter = user.settings?.hasGenderFilter;
    const isExpired =
      user.subscription?.expiresAt &&
      new Date(user.subscription.expiresAt) < new Date();

    if (genderFilterEnabled && (!hasGenderFilter || isExpired)) {
      return res.status(403).json({
        message: "Premium subscription required for gender filter",
      });
    }

    // Update settings
    user.settings.notifications = notifications ?? user.settings.notifications;

    if (hasGenderFilter && !isExpired) {
      user.settings.genderFilterEnabled = genderFilterEnabled ?? false;
      user.settings.genderPreference = genderPreference || "any";
      user.settings.fallbackToRandom = fallbackToRandom ?? true;

      console.log(`🎯 Gender filter updated for ${user.username}:`, {
        enabled: user.settings.genderFilterEnabled,
        preference: user.settings.genderPreference,
      });
    }

    await user.save();
    console.log(`✅ Settings saved for ${user.username}`);

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        gender: user.gender,
        settings: user.settings,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    console.error("❌ Update settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ ADD THIS FUNCTION
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "-password -otp -otpExpiry"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check subscription expiry
    if (
      user.subscription?.expiresAt &&
      new Date(user.subscription.expiresAt) < new Date()
    ) {
      user.subscription.tier = "free";
      user.subscription.expiresAt = null;
      user.settings.hasGenderFilter = false;
      user.settings.genderFilterEnabled = false;
      await user.save();
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("❌ Get current user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Search Users
export const searchUsers = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: "Username required" });
    }

    const users = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.userId },
    }).select("username gender avatar lastActive");

    res.status(200).json({
      success: true,
      user: users,
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Account
export const deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
/**
 * GET /api/user/profile/:userId (UPDATE - Check if blocked)
 */
export const getUserProfile = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const userId = req.userId;

    const user = await User.findById(targetUserId)
      .select("username avatar gender age location lastActive")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if blocked
    const currentUser = await User.findById(userId).select("blockedUsers");
    const isBlocked = currentUser.blockedUsers.includes(targetUserId);

    res.status(200).json({
      success: true,
      user: {
        ...user,
        isBlocked,
      },
    });
  } catch (error) {
    console.error("❌ Get user profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const userId = req.userId;

    console.log(
      `🚫 Blocking user: ${targetUserId.substring(0, 8)} by ${userId.substring(
        0,
        8
      )}`
    );

    // Validation
    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot block yourself",
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already blocked
    const alreadyBlocked = user.blockedUsers.some(
      (id) => id.toString() === targetUserId
    );

    if (alreadyBlocked) {
      return res.status(400).json({
        success: false,
        message: "User already blocked",
      });
    }

    // Add to blockedUsers array
    user.blockedUsers.push(targetUserId);
    await user.save();

    console.log(`✅ User blocked successfully`);

    res.status(200).json({
      success: true,
      message: "User blocked successfully",
    });
  } catch (error) {
    console.error("❌ Block user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to block user",
      error: error.message,
    });
  }
};
/**
 * POST /api/user/unblock/:userId
 * Unblock a user
 */
export const unblockUser = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const userId = req.userId;

    console.log(
      `✅ Unblocking user: ${targetUserId.substring(
        0,
        8
      )} by ${userId.substring(0, 8)}`
    );

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove from blockedUsers array
    const initialLength = user.blockedUsers.length;
    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== targetUserId
    );

    // Check if user was actually in the blocked list
    if (initialLength === user.blockedUsers.length) {
      return res.status(400).json({
        success: false,
        message: "User was not blocked",
      });
    }

    await user.save();

    console.log(`✅ User unblocked successfully`);

    res.status(200).json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (error) {
    console.error("❌ Unblock user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unblock user",
      error: error.message,
    });
  }
};

/**
 * POST /api/user/report
 * Report a user
 */
export const reportUser = async (req, res) => {
  try {
    const { reportedUserId, reason, chatId } = req.body;
    const reporterId = req.userId;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create report (you can create a Report model if needed)
    // For now, just log it or send notification to admin
    console.log("📢 User Report:", {
      reporter: reporterId,
      reported: reportedUserId,
      reason,
      chatId,
      timestamp: new Date(),
    });

    res.json({ success: true, message: "Report submitted" });
  } catch (error) {
    console.error("❌ Report user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.userId;

    console.log(`📋 Fetching blocked users for: ${userId.substring(0, 8)}`);

    // Find user and populate blocked users
    const user = await User.findById(userId)
      .populate({
        path: "blockedUsers",
        select: "username avatar gender lastActive",
      })
      .lean();

    if (!user) {
      console.error("❌ User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get blocked users array (handle both array formats)
    let blockedUsersList = [];

    if (user.blockedUsers && Array.isArray(user.blockedUsers)) {
      // Filter out any null/undefined values
      blockedUsersList = user.blockedUsers.filter(Boolean);
    }

    console.log(`✅ Found ${blockedUsersList.length} blocked users`);

    res.status(200).json({
      success: true,
      blockedUsers: blockedUsersList,
    });
  } catch (error) {
    console.error("❌ Get blocked users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch blocked users",
      error: error.message,
    });
  }
};
// ========================================================================
// FILE 3: backend/controllers/user.controller.js (ADD THESE METHODS)
// ========================================================================

/**
 * GET /api/user/intro-message
 * Get user's intro message
 */
export const getIntroMessage = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("introMessage").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: user.introMessage || "Hello",
    });
  } catch (error) {
    console.error("❌ Get intro message error:", error);
    res.status(500).json({ message: "Failed to get intro message" });
  }
};

/**
 * POST /api/user/intro-message
 * Update user's intro message
 */
// ✅ Update Intro Message Controller (Permanent Fix)
export const updateIntroMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { message } = req.body;

    if (!userId) {
      console.log("❌ Missing userId in request");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!message || message.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Message cannot be empty" });
    }

    const trimmed = message.trim().slice(0, 200);

    // ✅ 1. Update DB
    const user = await User.findByIdAndUpdate(
      userId,
      { introMessage: trimmed },
      { new: true, select: "username gender avatar introMessage" }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ 2. Update Redis cache
    await redisClient.hSet(`user_cache:${userId}`, {
      username: user.username,
      gender: user.gender,
      avatar: user.avatar || "",
      introMessage: trimmed,
    });
    await redisClient.expire(`user_cache:${userId}`, 3600);

    // ✅ 3. Update in-memory cache
    userCache.set(userId, {
      data: {
        _id: userId,
        username: user.username,
        gender: user.gender,
        avatar: user.avatar,
        introMessage: trimmed,
      },
      cachedAt: Date.now(),
    });

    console.log(`✅ Intro message updated for ${userId}: "${trimmed}"`);

    res.json({ success: true, message: trimmed });
  } catch (error) {
    console.error("❌ Intro update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * GET /api/chats/:chatId/block-status
 * Check if chat is blocked and by whom
 */
export const getBlockStatus = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is participant
    if (!chat.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const partnerId = chat.participants
      .find((p) => p.toString() !== userId)
      ?.toString();

    const isBlocked = !!chat.blockedBy;
    const blockedBy = chat.blockedBy
      ? chat.blockedBy.toString() === userId
        ? "me"
        : "partner"
      : null;

    res.json({
      success: true,
      isBlocked,
      blockedBy,
      blockedAt: chat.blockedAt,
      partnerId,
    });
  } catch (error) {
    console.error("❌ Get block status error:", error);
    res.status(500).json({ message: "Failed to check block status" });
  }
};

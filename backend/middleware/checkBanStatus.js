// backend/middleware/checkBanStatus.js
// ✅ NEW: Middleware to check if user or group is banned
import User from "../models/User.model.js";
import Group from "../models/Group.model.js";

/**
 * Check if user is banned before allowing access
 * Use this middleware in protected routes
 */
export const checkUserBan = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return next();
    }

    const user = await User.findById(userId)
      .select("isBanned banReason banExpiresAt")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      // Check if ban has expired
      if (user.banExpiresAt && new Date(user.banExpiresAt) < new Date()) {
        // Unban user automatically
        await User.findByIdAndUpdate(userId, {
          isBanned: false,
          banReason: null,
          bannedAt: null,
          banExpiresAt: null,
        });
        return next();
      }

      // User is still banned
      return res.status(403).json({
        success: false,
        message: "Your account has been banned",
        reason: user.banReason || "Violation of terms",
        permanent: !user.banExpiresAt,
        expiresAt: user.banExpiresAt,
      });
    }

    next();
  } catch (error) {
    console.error("❌ Check ban error:", error);
    next(); // Continue on error to avoid blocking legitimate users
  }
};

/**
 * Check if group is banned before allowing access
 * Use this in group-related routes
 */
export const checkGroupBan = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return next();
    }

    const group = await Group.findById(groupId)
      .select("isBanned banReason")
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (group.isBanned) {
      return res.status(403).json({
        success: false,
        message: "This group has been banned",
        reason: group.banReason || "Violation of terms",
      });
    }

    next();
  } catch (error) {
    console.error("❌ Check group ban error:", error);
    next();
  }
};

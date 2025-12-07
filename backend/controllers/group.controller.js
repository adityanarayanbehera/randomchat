// backend/controllers/group.controller.js
// ✅ NEW: Complete group management API
import Group from "../models/Group.model.js";
import Chat from "../models/Chat.model.js";
import ChatMeta from "../models/ChatMeta.model.js";
import User from "../models/User.model.js";
import SystemConfig from "../models/SystemConfig.model.js";
import { redisClient } from "../server.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// backend/controllers/group.controller.js
// ✅ FIXED: createGroup function
export const createGroup = async (req, res) => {
  try {
    const { name, description, isPublic, initialMembers } = req.body;
    const ownerId = req.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Fetch User and System Config
    const [user, config] = await Promise.all([
      User.findById(ownerId),
      SystemConfig.getConfig(),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Check daily limits
    user.checkDailyReset();
    
    const dailyLimit = config.groups?.maxCreationPerDay || 10;

    // ✅ CRASH PROOF: Safe access
    const groupsCreated = user.usageStats?.groupsCreatedToday || 0;

    if (groupsCreated >= dailyLimit) {
      return res.status(403).json({ 
        message: `Daily group creation limit reached (${dailyLimit}). Please try again tomorrow.` 
      });
    }

    // ✅ CRITICAL: Create chat with proper structure
    const chat = await Chat.create({
      type: "group", // Not chatType!
      participants: [ownerId],
      messages: [], // Initialize empty array
      lastMessageAt: new Date(),
      isActive: true,
    });

    console.log(
      `✅ Chat created: ${chat._id}, Type: ${
        chat.type
      }, Messages array: ${Array.isArray(chat.messages)}`
    );

    // Create group
    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || "",
      chatId: chat._id,
      owner: ownerId,
      admins: [ownerId],
      members: [ownerId],
      isPublic: isPublic || false,
    });

    console.log(`✅ Group created: ${group._id}, Chat: ${group.chatId}`);

    // Generate invite
    const inviteToken = group.generateInviteToken();
    await group.save();

    // Create ChatMeta
    await ChatMeta.create({
      chatId: chat._id,
      userId: ownerId,
      unreadCount: 0,
      lastMessageAt: new Date(),
    });

    // Add initial members
    if (initialMembers && Array.isArray(initialMembers)) {
      const owner = await User.findById(ownerId).select("friends");
      const validMembers = initialMembers.filter((memberId) =>
        owner.friends.includes(memberId)
      );

      for (const memberId of validMembers) {
        await addMemberToGroup(group, chat, memberId);
      }
    }

    const populated = await Group.findById(group._id)
      .populate("owner", "username avatar")
      .populate("members", "username avatar lastActive");

    // Increment usage stats
    user.usageStats.groupsCreatedToday += 1;
    await user.save();

    res.status(201).json({
      success: true,
      group: populated,
      inviteLink: `${process.env.FRONTEND_URL}/groups/join/${inviteToken}`,
    });
  } catch (error) {
    console.error("❌ Create group error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      message: "Failed to create group",
      error: error.message,
    });
  }
};

/**
 * GET /api/groups/:groupId
 * Get group details
 */
export const getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId)
      .populate("owner", "username avatar")
      .populate("admins", "username avatar lastActive")
      .populate("members", "username avatar lastActive")
      .lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is member or if group is public
    const isMember = group.members.some((m) => m._id.toString() === userId);
    const isAdmin = group.admins.some((a) => a._id.toString() === userId);

    if (!isMember && !group.isPublic) {
      return res.status(403).json({
        message: "This is a private group",
        canRequest: true,
      });
    }

    res.json({
      success: true,
      group: {
        ...group,
        isMember,
        isAdmin,
        canInvite: isAdmin || group.settings.membersCanInvite,
      },
    });
  } catch (error) {
    console.error("❌ Get group error:", error);
    res.status(500).json({ message: "Failed to fetch group" });
  }
};

/**
 * POST /api/groups/:groupId/join
 * Join a public group
 */
export const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if already member
    if (group.isMember(userId)) {
      return res.status(400).json({ message: "Already a member" });
    }

    // Check if public
    if (!group.isPublic) {
      return res.status(403).json({
        message: "This group is private. You need an invite link.",
      });
    }

    // Check member limit
    if (group.members.length >= group.settings.maxMembers) {
      return res.status(400).json({ message: "Group is full" });
    }

    // Add user
    const chat = await Chat.findById(group.chatId);
    await addMemberToGroup(group, chat, userId);

    console.log(`✅ User ${userId.substring(0, 8)} joined group ${group.name}`);

    res.json({
      success: true,
      message: "Successfully joined group",
      chatId: group.chatId,
    });
  } catch (error) {
    console.error("❌ Join group error:", error);
    res.status(500).json({ message: "Failed to join group" });
  }
};

/**
 * POST /api/groups/join/:token
 * Join group via invite link
 */
export const joinViaInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId;

    const group = await Group.findOne({
      inviteToken: token,
      inviteExpiry: { $gt: new Date() },
    });

    if (!group) {
      return res.status(400).json({
        message: "Invalid or expired invite link",
      });
    }

    // Check if already member
    if (group.isMember(userId)) {
      return res.status(400).json({
        message: "You are already a member",
        chatId: group.chatId,
      });
    }

    // Check member limit
    if (group.members.length >= group.settings.maxMembers) {
      return res.status(400).json({ message: "Group is full" });
    }

    // Add user
    const chat = await Chat.findById(group.chatId);
    await addMemberToGroup(group, chat, userId);

    console.log(`✅ User joined via invite: ${group.name}`);

    res.json({
      success: true,
      message: `Welcome to ${group.name}!`,
      chatId: group.chatId,
      groupId: group._id,
    });
  } catch (error) {
    console.error("❌ Join via invite error:", error);
    res.status(500).json({ message: "Failed to join group" });
  }
};

/**
 * POST /api/groups/:groupId/invite
 * Generate new invite link (admins only)
 */
export const generateInvite = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if admin or if members can invite
    if (!group.isAdmin(userId) && !group.settings.membersCanInvite) {
      return res.status(403).json({
        message: "Only admins can generate invite links",
      });
    }

    const token = group.generateInviteToken();
    await group.save();

    res.json({
      success: true,
      inviteLink: `${process.env.FRONTEND_URL}/groups/join/${token}`,
      expiresAt: group.inviteExpiry,
    });
  } catch (error) {
    console.error("❌ Generate invite error:", error);
    res.status(500).json({ message: "Failed to generate invite" });
  }
};

/**
 * POST /api/groups/:groupId/leave
 * Leave group
 */
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if owner
    if (group.owner.toString() === userId) {
      return res.status(400).json({
        message: "Owner cannot leave. Transfer ownership or delete group.",
      });
    }

    // Check if member
    if (!group.isMember(userId)) {
      return res.status(400).json({ message: "You are not a member" });
    }

    // Remove from group
    group.members = group.members.filter((m) => m.toString() !== userId);
    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    // Remove from chat
    const chat = await Chat.findById(group.chatId);
    chat.participants = chat.participants.filter(
      (p) => p.toString() !== userId
    );
    await chat.save();

    // Delete ChatMeta
    await ChatMeta.findOneAndDelete({
      chatId: group.chatId,
      userId,
    });

    console.log(`✅ User left group: ${group.name}`);

    res.json({
      success: true,
      message: "Left group successfully",
    });
  } catch (error) {
    console.error("❌ Leave group error:", error);
    res.status(500).json({ message: "Failed to leave group" });
  }
};

/**
 * PUT /api/groups/:groupId
 * Update group (admins only)
 */
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;
    const { name, description, avatar, isPublic } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.isAdmin(userId)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (avatar) group.avatar = avatar;
    if (isPublic !== undefined) group.isPublic = isPublic;

    await group.save();

    // Update Redis cache
    await redisClient.hSet(`group:${group._id}`, {
      name: group.name,
      isPublic: group.isPublic.toString(),
    });

    res.json({
      success: true,
      group,
    });
  } catch (error) {
    console.error("❌ Update group error:", error);
    res.status(500).json({ message: "Failed to update group" });
  }
};

/**
 * GET /api/groups/search?q=query
 * Search public groups
 */
export const searchGroups = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search query required" });
    }

    const groups = await Group.find({
      isPublic: true,
      name: { $regex: q.trim(), $options: "i" },
    })
      .populate("owner", "username avatar")
      .select("name description avatar memberCount owner createdAt")
      .limit(20)
      .lean();

    res.json({
      success: true,
      groups: groups.map((g) => ({
        ...g,
        memberCount: g.members?.length || 0,
      })),
    });
  } catch (error) {
    console.error("❌ Search groups error:", error);
    res.status(500).json({ message: "Search failed" });
  }
};

/**
 * GET /api/groups/my
 * Get user's groups
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.userId;

    const groups = await Group.find({
      members: userId,
    })
      .populate("owner", "username avatar")
      .sort({ lastActivity: -1 })
      .lean();

    res.json({
      success: true,
      groups: groups.map((g) => ({
        ...g,
        memberCount: g.members?.length || 0,
        isAdmin: g.admins.some((a) => a.toString() === userId),
      })),
    });
  } catch (error) {
    console.error("❌ Get my groups error:", error);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
};

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

// In backend/controllers/group.controller.js
async function addMemberToGroup(group, chat, userId) {
  // Add to group
  group.members.push(userId);
  await group.save();

  // Add to chat
  if (!chat.participants.includes(userId)) {
    chat.participants.push(userId);
    await chat.save();
  }

  // ✅ Create ChatMeta (this makes group appear on dashboard)
  await ChatMeta.create({
    chatId: chat._id,
    userId,
    unreadCount: 0,
    lastMessageAt: new Date(),
  });

  // ✅ Notify user via socket that they joined a group
  const io = global.io;
  if (io) {
    const groupData = await Group.findById(group._id)
      .populate("owner", "username")
      .lean();

    io.to(`user:${userId}`).emit("group_joined", {
      group: {
        _id: group._id,
        name: group.name,
        chatId: chat._id,
        avatar: group.avatar,
        memberCount: group.members.length,
        isAdmin: group.admins.includes(userId),
      },
    });
  }

  console.log(`✅ User ${userId.substring(0, 8)} added to group ${group.name}`);
}
// ========================================================================
// FILE 4: backend/controllers/group.controller.js (ADD MISSING METHODS)
// ✅ ADD TO EXISTING FILE
// ========================================================================

/**
 * GET /api/groups/invite/:token/preview
 * Preview group before joining
 */
export const previewInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId;

    const group = await Group.findOne({
      inviteToken: token,
    })
      .populate("owner", "username avatar")
      .populate("members", "username avatar")
      .lean();

    if (!group) {
      return res.status(400).json({
        message: "Invalid invite link",
      });
    }

    // Check if expired
    if (group.inviteExpiry && new Date(group.inviteExpiry) < new Date()) {
      return res.status(400).json({
        message: "This invite link has expired",
      });
    }

    // Check if already member
    if (group.members.some((m) => m._id.toString() === userId)) {
      return res.status(403).json({
        message: "You are already a member of this group",
        alreadyMember: true,
        groupId: group._id,
      });
    }

    res.json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        isPublic: group.isPublic,
        owner: group.owner,
        members: group.members,
      },
    });
  } catch (error) {
    console.error("❌ Preview invite error:", error);
    res.status(500).json({ message: "Failed to load invite" });
  }
};

/**
 * DELETE /api/groups/:groupId/members/:memberId
 * Remove member from group (Admin only)
 */
export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Cannot remove owner
    if (group.owner.toString() === memberId) {
      return res.status(400).json({ message: "Cannot remove owner" });
    }

    // Remove member
    group.members = group.members.filter((m) => m.toString() !== memberId);
    group.admins = group.admins.filter((a) => a.toString() !== memberId);
    await group.save();

    // Remove from chat
    const chat = await Chat.findById(group.chatId);
    chat.participants = chat.participants.filter(
      (p) => p.toString() !== memberId
    );
    await chat.save();

    // Delete ChatMeta
    await ChatMeta.findOneAndDelete({
      chatId: group.chatId,
      userId: memberId,
    });

    // Notify via socket
    const io = global.io;
    if (io) {
      io.to(`user:${memberId}`).emit("kicked_from_group", {
        groupId,
        groupName: group.name,
      });

      io.to(`group:${groupId}`).emit("member_removed", {
        groupId,
        userId: memberId,
      });
    }

    res.json({
      success: true,
      message: "Member removed",
    });
  } catch (error) {
    console.error("❌ Remove member error:", error);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

/**
 * POST /api/groups/:groupId/admins/:memberId
 * Promote member to admin (Owner only)
 */
export const promoteToAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only owner can promote
    if (group.owner.toString() !== userId) {
      return res.status(403).json({ message: "Owner access required" });
    }

    // Check if already admin
    if (group.admins.some((a) => a.toString() === memberId)) {
      return res.status(400).json({ message: "Already an admin" });
    }

    // Add to admins
    group.admins.push(memberId);
    await group.save();

    // Notify via socket
    const io = global.io;
    if (io) {
      io.to(`user:${memberId}`).emit("promoted_to_admin", {
        groupId,
        groupName: group.name,
      });

      io.to(`group:${groupId}`).emit("admin_promoted", {
        groupId,
        userId: memberId,
      });
    }

    res.json({
      success: true,
      message: "Admin promoted",
    });
  } catch (error) {
    console.error("❌ Promote admin error:", error);
    res.status(500).json({ message: "Failed to promote" });
  }
};
/**
 * POST /api/groups/:groupId/admins/:memberId/demote
 * Demote admin to regular member (Owner only)
 */
export const demoteAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only owner can demote
    if (group.owner.toString() !== userId) {
      return res.status(403).json({ message: "Owner access required" });
    }

    // Cannot demote owner
    if (group.owner.toString() === memberId) {
      return res.status(400).json({ message: "Cannot demote owner" });
    }

    // Check if actually an admin
    if (!group.admins.some((a) => a.toString() === memberId)) {
      return res.status(400).json({ message: "User is not an admin" });
    }

    // Remove from admins
    group.admins = group.admins.filter((a) => a.toString() !== memberId);
    await group.save();

    console.log(`✅ Admin demoted: ${memberId} in group ${groupId}`);

    res.json({
      success: true,
      message: "Admin demoted",
    });
  } catch (error) {
    console.error("❌ Demote admin error:", error);
    res.status(500).json({ message: "Failed to demote admin" });
  }
};
// ========================================================================
// FILE 1: backend/controllers/group.controller.js (ADD THIS METHOD)
// ========================================================================

/**
 * GET /api/groups/by-chat/:chatId
 * Get group by chatId (for notifications routing)
 */
export const getGroupByChatId = async (req, res) => {
  try {
    const { chatId } = req.params;

    const group = await Group.findOne({ chatId }).lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json({
      success: true,
      groupId: group._id,
    });
  } catch (error) {
    console.error("❌ Get group by chatId error:", error);
    res.status(500).json({ message: "Failed to find group" });
  }
};

// ========================================================================
// ADD THESE METHODS TO: backend/controllers/group.controller.js
// ✅ Group Disappearing Messages (Owner-Only Control)
// ========================================================================

/**
 * POST /api/groups/:groupId/disappearing
 * Set disappearing messages duration (Owner only)
 */
export const setGroupDisappearing = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { duration } = req.body; // 1440 (24h), 4320 (3d), 10080 (7d), 21600 (15d)
    const userId = req.userId;

    // Validate duration
    const validDurations = [1440, 4320, 10080, 21600];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({
        message:
          "Invalid duration. Valid options: 1440, 4320, 10080, 21600 minutes",
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // ✅ CRITICAL: Only owner can change disappearing settings
    if (!group.isOwner(userId)) {
      return res.status(403).json({
        message: "Only group owner can change disappearing messages settings",
      });
    }

    // Update group disappearing duration
    group.disappearingDuration = duration;
    group.disappearingUpdatedAt = new Date();
    await group.save();

    // ✅ Notify all group members via socket
    const io = global.io;
    if (io) {
      io.to(`group:${groupId}`).emit("group_disappearing_updated", {
        groupId,
        duration,
        updatedBy: userId,
        timestamp: Date.now(),
      });
    }

    console.log(
      `⏱️ Group ${groupId.substring(
        0,
        8
      )}: Owner set disappearing to ${duration}min`
    );

    res.json({
      success: true,
      duration,
      message: `Disappearing messages set to ${formatGroupDuration(duration)}`,
    });
  } catch (error) {
    console.error("❌ Set group disappearing error:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
};

/**
 * GET /api/groups/:groupId/disappearing
 * Get group disappearing duration
 */
export const getGroupDisappearing = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if member
    if (!group.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({
      success: true,
      duration: group.disappearingDuration || 10080, // Default 7 days
      isOwner: group.owner.toString() === userId,
    });
  } catch (error) {
    console.error("❌ Get group disappearing error:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};

/**
 * GET /api/groups/:groupId/health
 * ✅ NEW: Verify group chat message persistence
 */
export const checkGroupHealth = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const chat = await Chat.findById(group.chatId).lean();

    res.json({
      success: true,
      health: {
        groupExists: !!group,
        groupName: group.name,
        chatExists: !!chat,
        chatId: group.chatId,
        chatType: chat?.type,
        messagesArrayExists: Array.isArray(chat?.messages),
        messagesCount: chat?.messages?.length || 0,
        lastMessage: chat?.messages?.[chat.messages.length - 1]
          ? {
              id: chat.messages[chat.messages.length - 1]._id,
              text: chat.messages[chat.messages.length - 1].text,
              createdAt: chat.messages[chat.messages.length - 1].createdAt,
            }
          : null,
        lastActivity: group.lastActivity,
        disappearingDuration: group.disappearingDuration,
      },
    });
  } catch (error) {
    console.error("❌ Check group health error:", error);
    res.status(500).json({ message: "Failed to check group health" });
  }
};

/**
 * ✅ Cleanup disappearing messages for groups
 * Called by worker every 5 minutes
 */
export const cleanupGroupDisappearingMessages = async () => {
  try {
    console.log("🧹 Starting group disappearing messages cleanup...");

    // Get all groups
    const groups = await Group.find({}).lean();

    let totalDeleted = 0;
    let groupsProcessed = 0;

    for (const group of groups) {
      try {
        const duration = group.disappearingDuration || 10080; // Default 7 days

        // Calculate cutoff time
        const cutoffTime = new Date(Date.now() - duration * 60 * 1000);

        // Get chat and filter messages
        const chat = await Chat.findById(group.chatId);
        if (!chat || !chat.messages || chat.messages.length === 0) continue;

        const initialCount = chat.messages.length;

        // ✅ Filter out expired messages
        chat.messages = chat.messages.filter((msg) => {
          const msgTime = new Date(msg.createdAt || msg.timestamp);
          return msgTime > cutoffTime;
        });

        const deletedCount = initialCount - chat.messages.length;

        if (deletedCount > 0) {
          await chat.save();
          totalDeleted += deletedCount;
          groupsProcessed++;

          // ✅ Update Redis cache
          await redisClient.del(`chat:messages:${group.chatId}`);

          // Cache remaining messages (last 200)
          const remaining = chat.messages.slice(-200).map((msg) => ({
            id: msg._id.toString(),
            sender: msg.sender.toString(),
            senderName: msg.senderName,
            text: msg.text,
            image: msg.image,
            type: msg.type,
            replyTo: msg.replyTo,
            replyToText: msg.replyToText,
            replyToSender: msg.replyToSender,
            mentions: msg.mentions,
            timestamp: new Date(msg.createdAt).getTime(),
            createdAt: msg.createdAt,
          }));

          if (remaining.length > 0) {
            await redisClient.rPush(
              `chat:messages:${group.chatId}`,
              ...remaining.map((m) => JSON.stringify(m))
            );
            await redisClient.expire(
              `chat:messages:${group.chatId}`,
              7 * 24 * 60 * 60
            );
          }

          // ✅ Notify all group members via socket
          const io = global.io;
          if (io) {
            io.to(`group:${group._id}`).emit("group_messages_disappeared", {
              groupId: group._id.toString(),
              chatId: group.chatId.toString(),
              deletedCount,
              duration,
              timestamp: Date.now(),
            });
          }

          console.log(
            `🗑️ Group ${group._id
              .toString()
              .substring(
                0,
                8
              )}: Deleted ${deletedCount} messages (${duration}min)`
          );
        }
      } catch (groupError) {
        console.error(`❌ Error processing group ${group._id}:`, groupError);
      }
    }

    if (totalDeleted > 0) {
      console.log(
        `✅ Group cleanup complete: ${totalDeleted} messages deleted from ${groupsProcessed} groups`
      );
    } else {
      console.log("✅ Group cleanup complete: No expired messages found");
    }
  } catch (error) {
    console.error("❌ Cleanup group disappearing messages error:", error);
  }
};

// ✅ Helper: Format group duration
function formatGroupDuration(minutes) {
  if (minutes === 1440) return "24 hours";
  if (minutes === 4320) return "3 days";
  if (minutes === 10080) return "7 days";
  if (minutes === 21600) return "15 days";
  return `${minutes} minutes`;
}

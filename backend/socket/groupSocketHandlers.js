// backend/socket/groupSocketHandlers.js
// ✅ CRITICAL FIX: Messages must be saved to MongoDB immediately

import Chat from "../models/Chat.model.js";
import Group from "../models/Group.model.js";
import ChatMeta from "../models/ChatMeta.model.js";
import User from "../models/User.model.js";
import { redisClient } from "../server.js";
import { createNotification } from "../utils/notification.js";

export const initGroupSocketHandlers = (io, socket, userId) => {
  /**
   * JOIN GROUP ROOM
   */
  socket.on("join_group", async ({ groupId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.isMember(userId)) {
        return socket.emit("error", { message: "Access denied" });
      }

      socket.join(`group:${groupId}`);

      await ChatMeta.findOneAndUpdate(
        { chatId: group.chatId, userId },
        { unreadCount: 0, lastReadAt: new Date() },
        { upsert: true }
      );

      console.log(`✅ User ${userId.substring(0, 8)} joined group: ${groupId}`);

      io.to(`group:${groupId}`).emit("member_online", {
        groupId,
        userId,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("❌ Join group error:", err);
    }
  });

  /**
   * LEAVE GROUP ROOM
   */
  socket.on("leave_group", async ({ groupId }) => {
    try {
      socket.leave(`group:${groupId}`);

      io.to(`group:${groupId}`).emit("member_offline", {
        groupId,
        userId,
        timestamp: Date.now(),
      });

      console.log(`👋 User ${userId.substring(0, 8)} left group: ${groupId}`);
    } catch (err) {
      console.error("❌ Leave group error:", err);
    }
  });

  /**
   * SEND GROUP MESSAGE
   * ✅ ENHANCED: Robust save with validation and error recovery
   */
  socket.on("send_group_message", async (data) => {
    const startTime = Date.now();
    let savedMessage = null;

    try {
      const { groupId, text, image, replyTo, mentions } = data;

      // Validate input
      if (!text && !image) {
        return socket.emit("error", { message: "Message content required" });
      }

      console.log(`📥 [GROUP MESSAGE] Received for group: ${groupId.substring(0, 8)}...`);

      // Get group with validation
      const group = await Group.findById(groupId);
      if (!group) {
        console.error(`❌ [GROUP MESSAGE] Group not found: ${groupId}`);
        return socket.emit("error", { message: "Group not found" });
      }

      if (!group.isMember(userId)) {
        console.error(`❌ [GROUP MESSAGE] Access denied for user ${userId.substring(0, 8)}... to group ${groupId.substring(0, 8)}...`);
        return socket.emit("error", { message: "Access denied" });
      }

      // ✅ CRITICAL: Get chat document with additional validation
      const chat = await Chat.findById(group.chatId);
      if (!chat) {
        console.error(`❌ [GROUP MESSAGE] CRITICAL: Chat not found for chatId: ${group.chatId}`);
        return socket.emit("error", { message: "Chat configuration error" });
      }

      // ✅ CRITICAL: Validate chat type
      if (chat.type !== "group") {
        console.warn(`⚠️ [GROUP MESSAGE] Chat type mismatch: expected 'group', got '${chat.type}'. Fixing...`);
        chat.type = "group";
      }

      console.log(`✅ [GROUP MESSAGE] Chat validated: ${chat._id}, Type: ${chat.type}, Messages: ${chat.messages?.length || 0}`);

      // ✅ CRITICAL: Initialize/validate messages array
      if (!chat.messages || !Array.isArray(chat.messages)) {
        console.warn(`⚠️ [GROUP MESSAGE] Messages array invalid, initializing...`);
        chat.messages = [];
      }

      // Get sender info
      const sender = await User.findById(userId).select("username").lean();
      if (!sender) {
        console.error(`❌ [GROUP MESSAGE] Sender not found: ${userId}`);
        return socket.emit("error", { message: "User not found" });
      }

      // Parse mentions
      const mentionedUserIds = [];
      if (text && text.includes("@")) {
        const mentionPattern = /@(\w+)/g;
        const matches = [...text.matchAll(mentionPattern)];

        for (const match of matches) {
          const username = match[1];
          const mentionedUser = await User.findOne({ username }).select("_id").lean();
          if (mentionedUser && group.isMember(mentionedUser._id)) {
            mentionedUserIds.push(mentionedUser._id.toString());
          }
        }
      }

      const validMentions = mentions?.filter((id) => group.isMember(id)) || [];
      const allMentions = [...new Set([...mentionedUserIds, ...validMentions])].slice(0, 5);

      // Handle reply
      let replyData = {};
      if (replyTo) {
        const originalMsg = chat.messages.id(replyTo);
        if (originalMsg) {
          replyData = {
            replyTo,
            replyToText: originalMsg.text || "📷 Image",
            replyToSender: originalMsg.senderName || "Unknown",
          };
        }
      }

      // ✅ Create message object with all required fields
      const newMessage = {
        sender: userId,
        senderName: sender.username,
        text: text || "",
        image: image || "",
        type: image ? "image" : "text",
        mentions: allMentions,
        ...replyData,
        readBy: [{ userId, readAt: new Date() }],
        reactions: [],
        createdAt: new Date(),
      };

      // ✅ CRITICAL: Record message count BEFORE save
      const messageCountBefore = chat.messages.length;

      // ✅ CRITICAL: Push to messages array
      chat.messages.push(newMessage);

      // ✅ CRITICAL: Update lastMessage timestamp
      chat.lastMessage = new Date();

      console.log(`💾 [GROUP MESSAGE] Saving to MongoDB... (message #${messageCountBefore + 1})`);

      // ✅ CRITICAL: Save with error handling and retry
      try {
        await chat.save();
        console.log(`✅ [GROUP MESSAGE] MongoDB save successful!`);
      } catch (saveError) {
        console.error(`❌ [GROUP MESSAGE] CRITICAL: MongoDB save failed!`, saveError);
        
        // Retry once before giving up
        console.log(`🔄 [GROUP MESSAGE] Retrying save...`);
        try {
          // Reload chat and try again
          const freshChat = await Chat.findById(group.chatId);
          if (!freshChat.messages) freshChat.messages = [];
          freshChat.messages.push(newMessage);
          freshChat.lastMessage = new Date();
          await freshChat.save();
          console.log(`✅ [GROUP MESSAGE] Retry successful!`);
        } catch (retryError) {
          console.error(`❌ [GROUP MESSAGE] CRITICAL: Retry failed!`, retryError);
          throw new Error("Failed to save message after retry");
        }
      }

      // ✅ VERIFICATION: Reload chat to confirm save
      const verifyChat = await Chat.findById(group.chatId).select("messages").lean();
      const messageCountAfter = verifyChat.messages?.length || 0;

      if (messageCountAfter !== messageCountBefore + 1) {
        console.error(`❌ [GROUP MESSAGE] CRITICAL: Verification failed! Expected ${messageCountBefore + 1} messages, found ${messageCountAfter}`);
        throw new Error("Message save verification failed");
      }

      console.log(`✅ [GROUP MESSAGE] Verification passed: ${messageCountAfter} messages in database`);

      // ✅ Get the saved message with auto-generated _id
      savedMessage = chat.messages[chat.messages.length - 1];
      console.log(`✅ [GROUP MESSAGE] Message saved with ID: ${savedMessage._id}`);

      // ✅ Create message for socket broadcast
      const messageForSocket = {
        id: savedMessage._id.toString(),
        sender: userId,
        senderName: sender.username,
        text: text || "",
        image: image || "",
        type: image ? "image" : "text",
        mentions: allMentions,
        ...replyData,
        timestamp: savedMessage.createdAt.getTime(),
        createdAt: savedMessage.createdAt,
        readBy: [{ userId, readAt: new Date() }],
        reactions: [],
      };

      // ✅ Cache to Redis with better error handling
      try {
        await redisClient.rPush(
          `chat:messages:${group.chatId}`,
          JSON.stringify(messageForSocket)
        );
        await redisClient.lTrim(`chat:messages:${group.chatId}`, -200, -1);
        await redisClient.expire(`chat:messages:${group.chatId}`, 7 * 24 * 60 * 60);
        console.log(`✅ [GROUP MESSAGE] Redis cache updated`);
      } catch (redisErr) {
        console.error(`⚠️ [GROUP MESSAGE] Redis cache error (non-critical):`, redisErr.message);
        // ✅ Clear potentially corrupted Redis cache
        try {
          await redisClient.del(`chat:messages:${group.chatId}`);
          console.log(`🗑️ [GROUP MESSAGE] Cleared corrupted Redis cache`);
        } catch (delErr) {
          console.error(`⚠️ [GROUP MESSAGE] Failed to clear Redis cache:`, delErr.message);
        }
      }

      // ✅ Broadcast to all group members
      io.to(`group:${groupId}`).emit("group_message", {
        groupId,
        chatId: group.chatId,
        message: messageForSocket,
      });

      console.log(`📤 [GROUP MESSAGE] Broadcasted to ${group.members.length} members`);

      // ✅ Update unread counts
      const otherMembers = group.members.filter((m) => m.toString() !== userId);

      for (const memberId of otherMembers) {
        try {
          const meta = await ChatMeta.findOneAndUpdate(
            { chatId: group.chatId, userId: memberId },
            { $inc: { unreadCount: 1 }, lastMessageAt: new Date() },
            { new: true, upsert: true }
          );

          io.to(`user:${memberId}`).emit("unread_update", {
            chatId: group.chatId,
            groupId,
            unreadCount: meta.unreadCount,
          });
        } catch (metaErr) {
          console.error(`⚠️ [GROUP MESSAGE] Meta update failed for ${memberId.substring(0, 8)}:`, metaErr.message);
        }
      }

      // ✅ Update group last activity
      try {
        group.lastActivity = new Date();
        await group.save();
      } catch (groupErr) {
        console.error(`⚠️ [GROUP MESSAGE] Group update failed:`, groupErr.message);
      }

      console.log(`⚡ [GROUP MESSAGE] Complete in ${Date.now() - startTime}ms | Saved: ${savedMessage._id}`);

    } catch (err) {
      console.error(`❌ [GROUP MESSAGE] FATAL ERROR:`, err);
      console.error(`❌ [GROUP MESSAGE] Stack:`, err.stack);
      socket.emit("error", { 
        message: "Failed to send message",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  });

  /**
   * GROUP TYPING INDICATOR
   */
  socket.on("group_typing", async ({ groupId, isTyping }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.isMember(userId)) return;

      const user = await User.findById(userId).select("username").lean();

      socket.to(`group:${groupId}`).emit("group_typing_update", {
        groupId,
        userId,
        username: user.username,
        isTyping,
      });
    } catch (err) {
      console.error("❌ Group typing error:", err);
    }
  });

  /**
   * MESSAGE REACTION
   */
  socket.on("add_reaction", async ({ groupId, messageId, emoji }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.isMember(userId)) return;

      const chat = await Chat.findById(group.chatId);
      const message = chat.messages.id(messageId);

      if (!message) return;

      // Remove existing reaction from this user
      message.reactions = message.reactions.filter(
        (r) => r.userId.toString() !== userId
      );

      // Add new reaction
      message.reactions.push({
        userId,
        emoji,
        createdAt: new Date(),
      });

      await chat.save();

      // Broadcast to group
      io.to(`group:${groupId}`).emit("reaction_added", {
        groupId,
        messageId,
        userId,
        emoji,
        reactions: message.reactions,
      });

      console.log(`✅ Reaction ${emoji} added by ${userId.substring(0, 8)}`);
    } catch (err) {
      console.error("❌ Add reaction error:", err);
    }
  });

  /**
   * PIN MESSAGE (Admins only)
   */
  socket.on("pin_message", async ({ groupId, messageId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.isAdmin(userId)) {
        return socket.emit("error", { message: "Admin access required" });
      }

      if (!group.pinnedMessages.includes(messageId)) {
        group.pinnedMessages.push(messageId);
        await group.save();

        io.to(`group:${groupId}`).emit("message_pinned", {
          groupId,
          messageId,
          pinnedBy: userId,
        });
      }
    } catch (err) {
      console.error("❌ Pin message error:", err);
    }
  });

  /**
   * KICK MEMBER (Admins only)
   */
  socket.on("kick_member", async ({ groupId, targetUserId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.isAdmin(userId)) {
        return socket.emit("error", { message: "Admin access required" });
      }

      if (group.owner.toString() === targetUserId) {
        return socket.emit("error", { message: "Cannot kick owner" });
      }

      // Remove member
      group.members = group.members.filter(
        (m) => m.toString() !== targetUserId
      );
      group.admins = group.admins.filter((a) => a.toString() !== targetUserId);
      await group.save();

      // Remove from chat
      const chat = await Chat.findById(group.chatId);
      chat.participants = chat.participants.filter(
        (p) => p.toString() !== targetUserId
      );
      await chat.save();

      // Delete ChatMeta
      await ChatMeta.findOneAndDelete({
        chatId: group.chatId,
        userId: targetUserId,
      });

      // Notify kicked user
      io.to(`user:${targetUserId}`).emit("kicked_from_group", {
        groupId,
        groupName: group.name,
      });

      // Notify group
      io.to(`group:${groupId}`).emit("member_removed", {
        groupId,
        userId: targetUserId,
      });

      console.log(`✅ Member kicked from group: ${groupId}`);
    } catch (err) {
      console.error("❌ Kick member error:", err);
    }
  });

  /**
   * PROMOTE TO ADMIN (Owner only)
   */
  socket.on("promote_admin", async ({ groupId, targetUserId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || group.owner.toString() !== userId) {
        return socket.emit("error", { message: "Owner access required" });
      }

      if (!group.admins.includes(targetUserId)) {
        group.admins.push(targetUserId);
        await group.save();

        io.to(`group:${groupId}`).emit("admin_promoted", {
          groupId,
          userId: targetUserId,
        });

        io.to(`user:${targetUserId}`).emit("promoted_to_admin", {
          groupId,
          groupName: group.name,
        });
      }
    } catch (err) {
      console.error("❌ Promote admin error:", err);
    }
  });

  /**
   * DISCONNECT
   */
  socket.on("disconnect", () => {
    console.log(`🔌 User ${userId.substring(0, 8)} disconnected from groups`);
    socket.removeAllListeners();
  });
};

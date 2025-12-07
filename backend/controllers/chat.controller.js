// ========================================================================
// FILE: backend/controllers/chat.controller.js
// ✅ COMPLETE FIX: OFF means permanent storage, minimum logic for active timers
// ========================================================================

import Chat from "../models/Chat.model.js";
import ChatMeta from "../models/ChatMeta.model.js";
import User from "../models/User.model.js";
import { redisClient } from "../server.js";

/**
 * POST /api/chats/:chatId/disappearing
 * ✅ FIXED: OFF handling - ignore OFF when calculating minimum
 */
export const setDisappearingMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { duration } = req.body; // 0 (off), 5, 30, 60, 1440, 10080
    const userId = req.userId;

    // Validate duration
    const validDurations = [0, 5, 30, 60, 1440, 10080];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({
        message:
          "Invalid duration. Valid options: 0, 5, 30, 60, 1440, 10080 minutes",
      });
    }

    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // ✅ Update user's disappearing setting in ChatMeta
    await ChatMeta.findOneAndUpdate(
      { chatId, userId },
      {
        disappearingDuration: duration,
        disappearingUpdatedAt: new Date(),
      },
      { upsert: true }
    );

    // ✅ Get partner's duration
    const partnerId = chat.participants
      .find((p) => p.toString() !== userId)
      ?.toString();
    const partnerMeta = await ChatMeta.findOne({
      chatId,
      userId: partnerId,
    }).lean();
    const partnerDuration = partnerMeta?.disappearingDuration ?? 60;

    // ✅ CRITICAL: Calculate effective duration
    // Only consider active timers (> 0), ignore OFF (0)
    const activeDurations = [duration, partnerDuration].filter((d) => d > 0);
    const effectiveDuration =
      activeDurations.length > 0
        ? Math.min(...activeDurations) // Minimum of active timers
        : 0; // Both OFF → no disappearing

    // ✅ Emit to both users
    const io = global.io;
    if (io) {
      io.to(`user:${partnerId}`).emit("disappearing_messages_updated", {
        chatId,
        duration,
        updatedBy: userId,
        effectiveDuration,
        timestamp: Date.now(),
      });

      io.to(`user:${userId}`).emit("disappearing_messages_confirmed", {
        chatId,
        duration,
        effectiveDuration,
        timestamp: Date.now(),
      });
    }

    console.log(
      `⏱️ User ${userId.substring(
        0,
        8
      )} set disappearing to ${duration}min. Effective: ${effectiveDuration}min`
    );

    res.json({
      success: true,
      duration,
      effectiveDuration,
      message: getDisappearingMessage(
        duration,
        partnerDuration,
        effectiveDuration
      ),
    });
  } catch (error) {
    console.error("❌ Set disappearing messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/chats/:chatId/meta
 * ✅ FIXED: Return correct effective duration
 */
export const getChatMeta = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const myMeta = await ChatMeta.findOne({ chatId, userId }).lean();
    const partnerId = chat.participants
      .find((p) => p.toString() !== userId)
      ?.toString();
    const partnerMeta = await ChatMeta.findOne({
      chatId,
      userId: partnerId,
    }).lean();

    const myDuration = myMeta?.disappearingDuration ?? 60;
    const partnerDuration = partnerMeta?.disappearingDuration ?? 60;

    // ✅ CRITICAL: Calculate effective duration (ignore OFF)
    const activeDurations = [myDuration, partnerDuration].filter((d) => d > 0);
    const effectiveDuration =
      activeDurations.length > 0 ? Math.min(...activeDurations) : 0;

    res.json({
      success: true,
      meta: myMeta || {
        isMuted: false,
        unreadCount: 0,
        isPinned: false,
        disappearingDuration: 60,
      },
      myDisappearingDuration: myDuration,
      partnerDisappearingDuration: partnerDuration,
      effectiveDuration,
    });
  } catch (error) {
    console.error("❌ Get chat meta error:", error);
    res.status(500).json({ message: "Failed to fetch metadata" });
  }
};

/**
 * ✅ FIXED: Cleanup with correct OFF handling
 */
export const cleanupDisappearingMessages = async () => {
  try {
    console.log("🧹 Starting disappearing messages cleanup...");

    const chats = await Chat.find({
      "messages.0": { $exists: true },
    }).lean();

    let totalDeleted = 0;
    let chatsProcessed = 0;

    for (const chat of chats) {
      try {
        const metaRecords = await ChatMeta.find({ chatId: chat._id }).lean();

        if (metaRecords.length !== 2) continue;

        const durations = metaRecords.map((m) => m.disappearingDuration ?? 60);

        // ✅ CRITICAL: Ignore OFF (0), only use active timers
        const activeDurations = durations.filter((d) => d > 0);

        // If both OFF, skip cleanup
        if (activeDurations.length === 0) {
          continue;
        }

        const effectiveDuration = Math.min(...activeDurations);
        const cutoffTime = new Date(Date.now() - effectiveDuration * 60 * 1000);

        const updatedChat = await Chat.findById(chat._id);
        const initialCount = updatedChat.messages.length;

        updatedChat.messages = updatedChat.messages.filter((msg) => {
          const msgTime = new Date(msg.createdAt || msg.timestamp);
          return msgTime > cutoffTime;
        });

        const deletedCount = initialCount - updatedChat.messages.length;

        if (deletedCount > 0) {
          await updatedChat.save();
          totalDeleted += deletedCount;
          chatsProcessed++;

          await redisClient.del(`chat:messages:${chat._id}`);

          const remaining = updatedChat.messages.slice(-200).map((msg) => ({
            id: msg._id.toString(),
            sender: msg.sender.toString(),
            senderName: msg.senderName,
            text: msg.text,
            image: msg.image,
            type: msg.type,
            replyTo: msg.replyTo,
            replyToText: msg.replyToText,
            replyToSender: msg.replyToSender,
            timestamp: new Date(msg.createdAt).getTime(),
            createdAt: msg.createdAt,
          }));

          if (remaining.length > 0) {
            await redisClient.rPush(
              `chat:messages:${chat._id}`,
              ...remaining.map((m) => JSON.stringify(m))
            );
            await redisClient.expire(
              `chat:messages:${chat._id}`,
              7 * 24 * 60 * 60
            );
          }

          const io = global.io;
          if (io) {
            chat.participants.forEach((participantId) => {
              io.to(`user:${participantId}`).emit("messages_disappeared", {
                chatId: chat._id.toString(),
                deletedCount,
                effectiveDuration,
                timestamp: Date.now(),
              });
            });
          }

          console.log(
            `🗑️ Deleted ${deletedCount} messages from chat ${chat._id} (effective: ${effectiveDuration}min)`
          );
        }
      } catch (chatError) {
        console.error(`❌ Error processing chat ${chat._id}:`, chatError);
      }
    }

    if (totalDeleted > 0) {
      console.log(
        `✅ Cleanup complete: ${totalDeleted} messages deleted from ${chatsProcessed} chats`
      );
    } else {
      console.log("✅ Cleanup complete: No messages to delete");
    }
  } catch (error) {
    console.error("❌ Cleanup disappearing messages error:", error);
  }
};

// ✅ Helper: Format duration
function formatDuration(minutes) {
  if (minutes === 0) return "OFF";
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 60) return "1 hour";
  if (minutes === 1440) return "24 hours";
  if (minutes === 10080) return "7 days";
  return `${minutes} min`;
}

// ✅ Helper: Get user-friendly message
function getDisappearingMessage(
  myDuration,
  partnerDuration,
  effectiveDuration
) {
  if (myDuration === 0 && partnerDuration === 0) {
    return "Disappearing messages disabled for both users";
  }
  if (myDuration === 0) {
    return `Your setting: OFF. Partner's setting: ${formatDuration(
      partnerDuration
    )}. Active: ${formatDuration(effectiveDuration)}`;
  }
  if (partnerDuration === 0) {
    return `Your setting: ${formatDuration(
      myDuration
    )}. Partner's setting: OFF. Active: ${formatDuration(effectiveDuration)}`;
  }
  return `Your setting: ${formatDuration(myDuration)}. Active: ${formatDuration(
    effectiveDuration
  )} (minimum)`;
}

// ========================================================================
// EXISTING FUNCTIONS (Keep all your existing functions below)
// ========================================================================

export const getBlockStatus = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const partnerId = chat.participants
      .find((p) => p.toString() !== userId)
      ?.toString();

    const currentUser = await User.findById(userId)
      .select("blockedUsers")
      .lean();
    const partner = await User.findById(partnerId)
      .select("blockedUsers")
      .lean();

    const isBlockedByMe = currentUser.blockedUsers?.some(
      (id) => id.toString() === partnerId
    );
    const isBlockedByPartner = partner.blockedUsers?.some(
      (id) => id.toString() === userId
    );

    const isBlocked = isBlockedByMe || isBlockedByPartner;
    const blockedBy = isBlockedByMe
      ? "me"
      : isBlockedByPartner
      ? "partner"
      : null;

    res.json({
      success: true,
      isBlocked,
      blockedBy,
      blockedAt: chat.blockedAt,
      partnerId,
      isBlockedByMe,
      isBlockedByPartner,
    });
  } catch (error) {
    console.error("❌ Get block status error:", error);
    res.status(500).json({ message: "Failed to check block status" });
  }
};

export const blockUserInChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const partnerId = chat.participants
      .find((p) => p.toString() !== userId)
      ?.toString();

    if (!partnerId) {
      return res.status(400).json({ message: "Partner not found" });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: partnerId },
    });

    chat.blockedBy = userId;
    chat.blockedAt = new Date();
    await chat.save();

    const io = global.io;
    if (io) {
      io.to(`user:${partnerId}`).emit("user_blocked", {
        chatId,
        blockedBy: userId,
        timestamp: Date.now(),
      });

      io.to(`user:${userId}`).emit("block_confirmed", {
        chatId,
        blockedUser: partnerId,
        timestamp: Date.now(),
      });
    }

    console.log(
      `🚫 User ${userId.substring(0, 8)} blocked ${partnerId.substring(
        0,
        8
      )} in chat ${chatId}`
    );

    res.json({
      success: true,
      message: "User blocked",
      chatId,
      blockedUser: partnerId,
    });
  } catch (error) {
    console.error("❌ Block user error:", error);
    res.status(500).json({ message: "Block failed" });
  }
};

export const unblockUserInChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const partnerId = chat.participants
      .find((p) => p.toString() !== userId)
      ?.toString();

    if (!partnerId) {
      return res.status(400).json({ message: "Partner not found" });
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: partnerId },
    });

    if (chat.blockedBy?.toString() === userId) {
      chat.blockedBy = null;
      chat.blockedAt = null;
      await chat.save();
    }

    const io = global.io;
    if (io) {
      io.to(`user:${partnerId}`).emit("user_unblocked", {
        chatId,
        unblockedBy: userId,
        timestamp: Date.now(),
      });

      io.to(`user:${userId}`).emit("unblock_confirmed", {
        chatId,
        unblockedUser: partnerId,
        timestamp: Date.now(),
      });
    }

    console.log(
      `✅ User ${userId.substring(0, 8)} unblocked ${partnerId.substring(
        0,
        8
      )} in chat ${chatId}`
    );

    res.json({
      success: true,
      message: "User unblocked",
      chatId,
      unblockedUser: partnerId,
    });
  } catch (error) {
    console.error("❌ Unblock user error:", error);
    res.status(500).json({ message: "Unblock failed" });
  }
};

export const getRecentChats = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`📊 Fetching recent chats for user: ${userId.substring(0, 8)}`);

    // ✅ OPTIMIZATION: Try Redis cache first (30s cache)
    const cacheKey = `dashboard:${userId}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log(`✅ Cache HIT for dashboard:${userId.substring(0, 8)}`);
        return res.status(200).json(JSON.parse(cached));
      }
      console.log(`⚠️ Cache MISS for dashboard:${userId.substring(0, 8)}`);
    } catch (cacheErr) {
      console.error("❌ Redis cache error (non-critical):", cacheErr.message);
      // Continue to database if cache fails
    }
    // ✅ STRICT FILTER: Get current friends list
    const currentUser = await User.findById(userId).select("friends");
    const friendIds = new Set(currentUser?.friends?.map((id) => id.toString()) || []);

    const chatMetas = await ChatMeta.find({ userId })
      .populate({
        path: "chatId",
        select: "participants messages type isFriendChat isActive chatEnded expiresAt", // ✅ Select only needed fields
        options: { slice: { messages: -1 } }, // ✅ CRITICAL: Only fetch the LAST message (huge optimization)
        populate: {
          path: "participants",
          select: "username avatar gender lastActive",
        },
      })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    const randomChats = [];
    const friendChats = [];

    for (const meta of chatMetas) {
      if (!meta.chatId) continue;
      const chat = meta.chatId;
      // ✅ FIXED: Use 'type' property from schema, not 'chatType'
      if (chat.type === "group") continue;
      if (!chat.participants || chat.participants.length < 2) continue;

      const partner = chat.participants.find(
        (p) => p._id.toString() !== userId
      );
      if (!partner) continue;

      let lastMessage = "Start chatting";
      let lastMessageTime = meta.lastMessageAt;

      try {
        const cachedMessages = await redisClient.lRange(
          `chat:messages:${chat._id}`,
          -1,
          -1
        );
        if (cachedMessages.length > 0) {
          const parsed = JSON.parse(cachedMessages[0]);
          lastMessage = parsed.text || (parsed.image ? "Image" : "Message");
          lastMessageTime = new Date(parsed.timestamp);
        } else if (chat.messages && chat.messages.length > 0) {
          const last = chat.messages[chat.messages.length - 1];
          lastMessage = last.text || (last.image ? "Image" : "Message");
          lastMessageTime = last.createdAt;
        }
      } catch (e) {
        // Keep default
      }

      const chatData = {
        _id: chat._id,
        partner: {
          _id: partner._id,
          username: partner.username,
          avatar: partner.avatar,
          gender: partner.gender,
          // isOnline removed to reduce server load
        },
        lastMessage,
        lastMessageAt: lastMessageTime,
        unreadCount: meta.unreadCount || 0,
        isPinned: meta.isPinned || false,
        isMuted: meta.isMuted || false,
      };

      if (chat.isFriendChat) {
        // ✅ STRICT CHECK: Skip if not in friends list
        if (!friendIds.has(partner._id.toString())) {
          continue;
        }
        friendChats.push(chatData);
      } else {
        // ✅ Only show active, non-ended random chats
        if (!chat.chatEnded && chat.isActive && (!chat.expiresAt || new Date(chat.expiresAt) > new Date())) {
          randomChats.push(chatData);
        }
      }
    }

    // ✅ DEDUPLICATE FRIEND CHATS (Keep latest)
    const uniqueFriendChats = new Map();
    friendChats.forEach((chat) => {
      const partnerId = chat.partner._id.toString();
      if (!uniqueFriendChats.has(partnerId)) {
        uniqueFriendChats.set(partnerId, chat);
      } else {
        // Keep the one with more recent message
        const existing = uniqueFriendChats.get(partnerId);
        if (new Date(chat.lastMessageAt) > new Date(existing.lastMessageAt)) {
          uniqueFriendChats.set(partnerId, chat);
        }
      }
    });
    
    // Replace friendChats with unique values
    const finalFriendChats = Array.from(uniqueFriendChats.values());

    // ✅ CRITICAL: Ensure ALL friends have cards (even without chats)
    const friendsWithCards = new Set(finalFriendChats.map(c => c.partner._id.toString()));
    
    // Get full friend details for missing friends
    const missingFriendIds = Array.from(friendIds).filter(id => !friendsWithCards.has(id));
    
    if (missingFriendIds.length > 0) {
      const missingFriends = await User.find({ _id: { $in: missingFriendIds } })
        .select('username avatar gender lastActive')
        .lean();
      
      // Create placeholder cards for friends without chats
      missingFriends.forEach(friend => {
        finalFriendChats.push({
          _id: null, // No chat exists yet
          partner: {
            _id: friend._id,
            username: friend.username,
            avatar: friend.avatar,
            gender: friend.gender,
            // isOnline removed to reduce server load
          },
          lastMessage: "Start chatting",
          lastMessageAt: new Date(0), // Epoch time (will sort to bottom)
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
        });
      });
    }

    console.log(
      `✅ Returning ${randomChats.length} random, ${friendChats.length} friend chats`
    );

    const response = {
      success: true,
      data: {
        randomChats: randomChats.slice(0, 1),
        friendChats: finalFriendChats,
        groups: [],
      },
    };

    // ✅ OPTIMIZATION: Cache response for 30 seconds
    try {
      await redisClient.setEx(cacheKey, 30, JSON.stringify(response));
      console.log(`💾 Cached dashboard data for ${userId.substring(0, 8)} (30s TTL)`);
    } catch (cacheErr) {
      console.error("❌ Failed to cache dashboard (non-critical):", cacheErr.message);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Get recent chats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
      error: error.message,
    });
  }
};

export const getFriendChat = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;

    if (userId === friendId) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    const user = await User.findById(userId).select("friends");
    if (!user.friends.includes(friendId)) {
      return res.status(403).json({ message: "Not friends" });
    }

    let chat = await Chat.findOne({
      participants: { $all: [userId, friendId], $size: 2 },
      isFriendChat: true,
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [userId, friendId],
        isFriendChat: true,
        expiresAt: null,
      });

      await ChatMeta.create([
        { chatId: chat._id, userId },
        { chatId: chat._id, userId: friendId },
      ]);
    }

    res.status(200).json({
      success: true,
      chatId: chat._id,
    });
  } catch (error) {
    console.error("❌ Get friend chat error:", error);
    res.status(500).json({ message: "Failed to get chat" });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;
    const after = req.query.after;

    console.log(`📡 [GET MESSAGES] Request for chat: ${chatId.substring(0, 12)}... (limit: ${limit})`);

    let messages = [];
    let source = "unknown";

    // ✅ Try Redis cache first
    try {
      const cached = await redisClient.lRange(`chat:messages:${chatId}`, 0, -1);
      
      if (cached && cached.length > 0) {
        messages = cached.map((m) => {
          try {
            return JSON.parse(m);
          } catch (parseErr) {
            console.error(`⚠️ [GET MESSAGES] Failed to parse Redis message:`, parseErr.message);
            return null;
          }
        }).filter(m => m !== null); // Remove failed parses
        
        source = "redis";
        console.log(`✅ [GET MESSAGES] Loaded ${messages.length} messages from Redis cache`);
      } else {
        // Cache empty, need to load from MongoDB
        throw new Error("Redis cache empty or unavailable");
      }
    } catch (cacheError) {
      // ✅ FALLBACK: Load from MongoDB
      console.log(`📂 [GET MESSAGES] Redis failed (${cacheError.message}), loading from MongoDB...`);
      
      const chat = await Chat.findById(chatId).lean();
      if (!chat) {
        console.error(`❌ [GET MESSAGES] Chat not found: ${chatId}`);
        return res.status(404).json({ message: "Chat not found" });
      }

      // ✅ VALIDATE: Check if users are still friends (friend chat) or member (group chat)
      if (chat.isFriendChat) {
        const partnerId = chat.participants.find(p => p.toString() !== req.userId)?.toString();
        if (partnerId) {
          const user = await User.findById(req.userId).select('friends').lean();
          const isFriend = user?.friends?.some(f => f.toString() === partnerId);
          
          if (!isFriend) {
            console.warn(`⚠️ [GET MESSAGES] User ${req.userId.substring(0,8)} not friends with ${partnerId.substring(0,8)} - skipping chat ${chatId}`);
            return res.status(403).json({ 
              message: "Not friends with this user",
              code: "NOT_FRIENDS" 
            });
          }
        }
      } else if (chat.type === 'group') {
        // Check if user is still a group member
        const isMember = chat.participants.some(p => p.toString() === req.userId);
        if (!isMember) {
          console.warn(`⚠️ [GET MESSAGES] User ${req.userId.substring(0,8)} not a member of group ${chatId}`);
          return res.status(403).json({ 
            message: "Not a member of this group",
            code: "NOT_MEMBER" 
          });
        }
      }

      // ✅ Validate messages array exists
      if (!chat.messages || !Array.isArray(chat.messages)) {
        console.warn(`⚠️ [GET MESSAGES] Messages array invalid for chat ${chatId}, returning empty array`);
        messages = [];
      } else {
        // ✅ Transform MongoDB documents to JSON
        messages = chat.messages.map((m) => ({
          id: m._id.toString(),
          sender: m.sender.toString(),
          senderName: m.senderName,
          text: m.text,
          image: m.image,
          type: m.type,
          replyTo: m.replyTo,
          replyToText: m.replyToText,
          replyToSender: m.replyToSender,
          mentions: m.mentions?.map((id) => id.toString()),
          timestamp: new Date(m.createdAt).getTime(),
          createdAt: m.createdAt,
          readBy: m.readBy?.map((r) => ({
            userId: r.userId.toString(),
            readAt: r.readAt,
          })),
          reactions: m.reactions,
        }));
        
        source = "mongodb";
        console.log(`✅ [GET MESSAGES] Loaded ${messages.length} messages from MongoDB`);

        // ✅ REPAIR: Rebuild Redis cache from MongoDB data
        if (messages.length > 0) {
          try {
            console.log(`🔧 [GET MESSAGES] Rebuilding Redis cache from MongoDB...`);
            
            // Clear old cache
            await redisClient.del(`chat:messages:${chatId}`);
            
            // Add all messages to cache
            const pipeline = redisClient.pipeline();
            messages.forEach(msg => {
              pipeline.rPush(`chat:messages:${chatId}`, JSON.stringify(msg));
            });
            pipeline.lTrim(`chat:messages:${chatId}`, -200, -1);
            pipeline.expire(`chat:messages:${chatId}`, 7 * 24 * 60 * 60);
            await pipeline.exec();
            
            console.log(`✅ [GET MESSAGES] Redis cache rebuilt with ${messages.length} messages`);
          } catch (repairErr) {
            console.error(`⚠️ [GET MESSAGES] Cache repair failed (non-critical):`, repairErr.message);
          }
        }
      }
    }

    // Apply before filter
    if (before) {
      const beforeTime = new Date(before).getTime();
      messages = messages.filter((m) => m.timestamp < beforeTime);
    }

    // Apply after filter
    if (after) {
      const afterTime = new Date(after).getTime();
      messages = messages.filter((m) => m.timestamp > afterTime);
    }

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Apply limit
    const chunk = messages.slice(0, limit);

    console.log(`📤 [GET MESSAGES] Returning ${chunk.length} messages (source: ${source})`);

    res.status(200).json({
      success: true,
      messages: chunk,
      hasMore: messages.length > limit,
      nextBefore:
        chunk.length > 0 && before
          ? new Date(chunk[0].timestamp).toISOString()
          : null,
      source, // Include source for debugging
    });
  } catch (error) {
    console.error("❌ [GET MESSAGES] Fatal error:", error);
    console.error("❌ [GET MESSAGES] Stack:", error.stack);
    res.status(500).json({ 
      message: "Failed to fetch messages",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

export const markAllRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    await ChatMeta.findOneAndUpdate(
      { chatId, userId },
      { unreadCount: 0, lastReadAt: new Date() }
    );

    await redisClient.hSet(`user:unread:${userId}`, chatId, "0");

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Mark all read error:", error);
    res.status(500).json({ message: "Failed to mark read" });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    await Chat.findByIdAndUpdate(chatId, { messages: [] });
    await redisClient.del(`chat:messages:${chatId}`);
    await ChatMeta.findOneAndUpdate(
      { chatId, userId },
      { unreadCount: 0, lastMessageAt: new Date() }
    );

    res.status(200).json({ success: true, message: "Chat cleared" });
  } catch (error) {
    console.error("❌ Clear chat error:", error);
    res.status(500).json({ message: "Failed to clear chat" });
  }
};

export const muteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { muted } = req.body;
    const userId = req.userId;

    await ChatMeta.findOneAndUpdate(
      { chatId, userId },
      {
        isMuted: muted,
        mutedUntil: muted ? null : undefined,
      }
    );

    res.json({
      success: true,
      muted,
    });
  } catch (error) {
    console.error("❌ Mute chat error:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
};

export const cleanupDuplicateChats = async (req, res) => {
  try {
    const userId = req.userId;

    const userChats = await Chat.find({
      participants: userId,
      type: { $ne: "group" }, // ✅ Fix: Match schema (type, not chatType)
    })
      .sort({ lastMessageAt: -1 }) // ✅ Sort by lastMessageAt
      .lean();

    const partnerMap = new Map();
    const duplicates = [];

    for (const chat of userChats) {
      const partnerId = chat.participants
        .find((p) => p.toString() !== userId)
        ?.toString();

      if (!partnerId) continue;

      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, []);
      }
      partnerMap.get(partnerId).push(chat);
    }

    for (const [partnerId, chats] of partnerMap.entries()) {
      if (chats.length > 1) {
        chats.sort(
          (a, b) =>
            new Date(b.lastMessage).getTime() -
            new Date(a.lastMessage).getTime()
        );

        const [keep, ...remove] = chats;

        for (const oldChat of remove) {
          if (oldChat.messages?.length > 0) {
            await Chat.findByIdAndUpdate(keep._id, {
              $push: { messages: { $each: oldChat.messages } },
            });
          }

          await Chat.findByIdAndDelete(oldChat._id);
          await ChatMeta.deleteMany({ chatId: oldChat._id });
          await redisClient.del(`chat:messages:${oldChat._id}`);
          await redisClient.del(`room:${oldChat._id}`);

          duplicates.push({
            partnerId,
            removedChatId: oldChat._id.toString(),
            keptChatId: keep._id.toString(),
          });
        }
      }
    }

    console.log(
      `✅ Cleanup: Removed ${
        duplicates.length
      } duplicate chats for user ${userId.substring(0, 8)}`
    );

    res.json({
      success: true,
      message: `Cleaned up ${duplicates.length} duplicate chats`,
      duplicates,
    });
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    res.status(500).json({ message: "Cleanup failed" });
  }
};

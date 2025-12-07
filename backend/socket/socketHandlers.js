// backend/socket/socketHandlers.js
// ✅ OPTIMIZED: Memory leak free, crash-proof, 10k+ user ready

import { redisClient } from "../server.js";
import { nanoid } from "nanoid";
import Chat from "../models/Chat.model.js";
import ChatMeta from "../models/ChatMeta.model.js";
import User from "../models/User.model.js";
import FriendRequest from "../models/FriendRequest.model.js";
import { createNotification } from "../utils/notification.js";
import { initGroupSocketHandlers } from "./groupSocketHandlers.js";

// ✅ WeakMap for automatic garbage collection
const socketMetadata = new WeakMap();
const activeIntervals = new Map(); // Track intervals per userId

// ✅ Rate limiting with automatic cleanup
const messageRateLimits = new Map();
const MAX_RATE_LIMIT_SIZE = 10000; // Prevent memory bloat

// ✅ Cleanup stale rate limits every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of messageRateLimits.entries()) {
    if (now > limit.resetAt + 60000) {
      // 1 minute past reset
      messageRateLimits.delete(userId);
    }
  }

  // Force size limit
  if (messageRateLimits.size > MAX_RATE_LIMIT_SIZE) {
    const toDelete = messageRateLimits.size - MAX_RATE_LIMIT_SIZE;
    const keys = Array.from(messageRateLimits.keys()).slice(0, toDelete);
    keys.forEach((key) => messageRateLimits.delete(key));
    console.log(`⚠️ Pruned ${toDelete} stale rate limits`);
  }
}, 120000);

export const initSocketHandlers = (io) => {
  console.log("⚡ Initializing socket handlers...");

  io.on("connection", async (socket) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      console.log("❌ No userId provided");
      return socket.disconnect();
    }

    console.log(`✅ Connected: ${userId.substring(0, 8)}`);
    socket.join(`user:${userId}`);

    // ✅ Store metadata in WeakMap (auto-cleanup)
    socketMetadata.set(socket, {
      userId,
      connectedAt: Date.now(),
      messageCount: 0,
    });

    try {
      await redisClient.sAdd(`user:sockets:${userId}`, socket.id);
      await redisClient.set(`presence:${userId}`, "online", { EX: 60 });
      // Removed lastActive update to reduce server load
      await User.findByIdAndUpdate(userId, {
        socketId: socket.id,
      });
    } catch (err) {
      console.error("❌ Socket mapping error:", err);
    }

    // ✅ CHECK IF USER IS BANNED
    try {
      const user = await User.findById(userId)
        .select("isBanned banReason")
        .lean();

      if (user?.isBanned) {
        socket.emit("banned", {
          message: "Your account has been banned",
          reason: user.banReason,
        });
        socket.disconnect();
        return;
      }
    } catch (error) {
      console.error("Socket ban check error:", error);
    }
    // ✅ Heartbeat with cleanup tracking
    const heartbeatInterval = setInterval(async () => {
      try {
        if (!socket.connected) {
          clearInterval(heartbeatInterval);
          activeIntervals.delete(`${userId}:${socket.id}`);
          return;
        }
        await redisClient.set(`presence:${userId}`, "online", { EX: 15 });
      } catch (err) {
        clearInterval(heartbeatInterval);
        activeIntervals.delete(`${userId}:${socket.id}`);
      }
    }, 5000);

    // ✅ Track interval for cleanup
    activeIntervals.set(`${userId}:${socket.id}`, heartbeatInterval);

    // ✅ Initialize group handlers
    initGroupSocketHandlers(io, socket, userId);

    // // ========================================================================
    // // JOIN QUEUE
    // // ========================================================================
    // socket.on("join_queue", async (data) => {
    //   try {
    //     const entry = {
    //       userId,
    //       socketId: socket.id,
    //       filters: data?.filters || {},
    //       joinedAt: Date.now(),
    //     };
    //     await redisClient.lPush("queue:global", JSON.stringify(entry));
    //     socket.emit("queue_joined");
    //     console.log(`🔍 Queue: ${userId.substring(0, 8)}`);
    //   } catch (err) {
    //     console.error("❌ Queue error:", err);
    //   }
    // });

    // socket.on("leave_queue", async (data) => {
    //   try {
    //     const leaveUserId = data?.userId || userId;
    //     const queue = await redisClient.lRange("queue:global", 0, -1);

    //     for (const entry of queue) {
    //       try {
    //         const parsed = JSON.parse(entry);
    //         if (
    //           parsed.userId === leaveUserId ||
    //           parsed.socketId === socket.id
    //         ) {
    //           await redisClient.lRem("queue:global", 1, entry);
    //           console.log(
    //             `⏹️ Removed from queue: ${leaveUserId.substring(0, 8)}`
    //           );
    //           break;
    //         }
    //       } catch (parseErr) {
    //         // Skip invalid entries
    //         await redisClient.lRem("queue:global", 1, entry);
    //       }
    //     }
    //   } catch (err) {
    //     console.error("❌ Leave queue error:", err);
    //   }
    // });

    // ========================================================================
    // JOIN QUEUE - WITH GENDER FILTER
    // ========================================================================
    socket.on("join_queue", async ({ filters = {} }) => {
      try {
        console.log(`🔍 User ${userId.substring(0, 8)} joining queue...`);
        console.log(`📊 Filters received:`, filters);

        // ✅ Get user data from database
        const user = await User.findById(userId).select(
          "settings subscription gender"
        );

        if (!user) {
          console.error(`❌ User not found: ${userId}`);
          return;
        }

        // ✅ CRITICAL: Terminate any existing active random chats
        const activeRandomChats = await Chat.find({
          participants: userId,
          isRandomChat: true,
          isActive: true,
          chatEnded: false,
        });

        for (const chat of activeRandomChats) {
          // Mark chat as ended (absolute termination)
          chat.isActive = false;
          chat.chatEnded = true;
          chat.endedAt = new Date();
          await chat.save();

          // Get partner ID
          const partnerId = chat.participants
            .find((p) => p.toString() !== userId)
            ?.toString();

          if (partnerId) {
            // ✅ Emit to BOTH user room AND chat room for reliability
            const chatRoomId = `chat:${chat._id}`;
            
            io.to(`user:${partnerId}`).emit("chat_ended", {
              chatId: chat._id.toString(),
              reason: "Partner started a new search",
            });
            
            io.to(chatRoomId).emit("chat_ended", {
              chatId: chat._id.toString(),
              reason: "Partner started a new search",
            });

            console.log(
              `🛑 Auto-terminated chat ${chat._id.toString().substring(0, 8)} (partner: ${partnerId.substring(0, 8)})`
            );
            console.log(`📡 Emitted chat_ended to user:${partnerId.substring(0, 8)} and ${chatRoomId}`);
          }
        }


        // ✅ Check premium status and subscription expiry
        const isPremium = user.subscription?.tier === "premium";
        const isExpired =
          user.subscription?.expiresAt &&
          new Date(user.subscription.expiresAt) < new Date();
        const hasGenderFilter = user.settings?.hasGenderFilter && !isExpired;

        // ✅ Prepare queue entry
        const queueEntry = {
          userId,
          socketId: socket.id,
          joinedAt: Date.now(),
          isPremium: isPremium && !isExpired,
          genderFilter: null,
          allowFallback: true,
        };

        // ✅ CRITICAL: Apply gender filter ONLY if premium and enabled
        if (hasGenderFilter && user.settings.genderFilterEnabled) {
          const preference = user.settings.genderPreference;

          if (preference && preference !== "any") {
            queueEntry.genderFilter = preference;
            queueEntry.allowFallback = user.settings.fallbackToRandom ?? true;

            console.log(
              `🎯 GENDER FILTER ACTIVE for ${userId.substring(0, 8)}:`,
              {
                preference,
                allowFallback: queueEntry.allowFallback,
                isPremium: queueEntry.isPremium,
              }
            );
          }
        }

        // ✅ Remove any existing queue entries for this user
        const existingEntries = await redisClient.lRange("queue:global", 0, -1);
        for (const entry of existingEntries) {
          try {
            const parsed = JSON.parse(entry);
            if (parsed.userId === userId) {
              await redisClient.lRem("queue:global", 1, entry);
              console.log(
                `🗑️ Removed old queue entry for ${userId.substring(0, 8)}`
              );
            }
          } catch (e) {
            // Skip invalid entries
          }
        }

        // ✅ Add to queue
        await redisClient.rPush("queue:global", JSON.stringify(queueEntry));

        console.log(`✅ Added to queue: ${userId.substring(0, 8)}`, {
          isPremium: queueEntry.isPremium,
          genderFilter: queueEntry.genderFilter || "none",
          allowFallback: queueEntry.allowFallback,
        });

        socket.emit("queue_joined", {
          position: await redisClient.lLen("queue:global"),
        });

        // ✅ Join user-specific room for notifications
        socket.join(`user:${userId}`);
      } catch (error) {
        console.error("❌ Join queue error:", error);
        socket.emit("queue_error", { message: "Failed to join queue" });
      }
    });

    // ========================================================================
    // JOIN ROOM
    // ========================================================================
    socket.on("join_room", async ({ chatId }) => {
      try {
        if (!chatId) return;

        socket.join(`chat:${chatId}`);

        // ✅ Batch Redis operations
        await Promise.all([
          ChatMeta.findOneAndUpdate(
            { chatId, userId },
            { unreadCount: 0, lastReadAt: new Date() }
          ),
          redisClient.hSet(`user:unread:${userId}`, chatId, "0"),
        ]);

        io.to(`user:${userId}`).emit("unread_update", {
          chatId,
          unreadCount: 0,
        });

        console.log(`🔗 ${userId.substring(0, 8)} joined chat:${chatId}`);
        io.emit(`joined:${chatId}:${userId}`);
      } catch (err) {
        console.error("❌ Join room error:", err);
      }
    });

    // ========================================================================
    // SEND MESSAGE
    // ========================================================================
    socket.on("send_message", async (data) => {
      const startTime = Date.now();
      try {
        const { chatId, text, image, type = "text", replyTo } = data;

        if (!chatId || (!text && !image)) {
          return socket.emit("error", { message: "Invalid message" });
        }

        // ✅ Track message count
        const metadata = socketMetadata.get(socket);
        if (metadata) metadata.messageCount++;

        const chat = await Chat.findById(chatId).lean();
        if (!chat) {
          return socket.emit("error", { message: "Chat not found" });
        }

        const messageId = nanoid(10);
        const sender = await User.findById(userId).select("username").lean();

        // ✅ Handle reply with error handling
        let replyMetadata = {};
        if (replyTo && chat.messages) {
          const originalMsg = chat.messages.find(
            (m) => m._id?.toString() === replyTo
          );
          if (originalMsg) {
            try {
              const replySender = await User.findById(originalMsg.sender)
                .select("username")
                .lean();
              replyMetadata = {
                replyTo,
                replyToText: originalMsg.text || "📷 Image",
                replyToSender: replySender?.username || "Unknown",
              };
            } catch (replyErr) {
              // Ignore reply errors
            }
          }
        }

        const message = {
          id: messageId,
          sender: userId,
          senderName: sender?.username || "Unknown",
          text: text || "",
          image: image || "",
          type,
          ...replyMetadata,
          timestamp: Date.now(),
          chatId,
        };

        const recipientId = chat.participants
          .find((p) => p.toString() !== userId)
          ?.toString();

        if (!recipientId) {
          return socket.emit("error", { message: "Recipient not found" });
        }

        // ✅ Batch operations with error handling
        try {
          await Promise.all([
            redisClient
              .rPush(`chat:messages:${chatId}`, JSON.stringify(message))
              .then(() =>
                redisClient.lTrim(`chat:messages:${chatId}`, -200, -1)
              ),
            redisClient.expire(`chat:messages:${chatId}`, 7 * 24 * 60 * 60),
          ]);
        } catch (redisErr) {
          console.error("❌ Redis cache error:", redisErr);
          // Continue anyway
        }

        // ✅ Send to recipient immediately
        io.to(`user:${recipientId}`).emit("message", message);

        // ✅ Update metadata asynchronously (non-blocking)
        setImmediate(async () => {
          try {
            const meta = await ChatMeta.findOneAndUpdate(
              { chatId, userId: recipientId },
              { $inc: { unreadCount: 1 }, lastMessageAt: new Date() },
              { upsert: true, new: true }
            );

            await redisClient.hSet(
              `user:unread:${recipientId}`,
              chatId,
              meta.unreadCount.toString()
            );

            io.to(`user:${recipientId}`).emit("unread_update", {
              chatId,
              unreadCount: meta.unreadCount,
            });

            await ChatMeta.findOneAndUpdate(
              { chatId, userId },
              { lastMessageAt: new Date() },
              { upsert: true }
            );

            // ✅ Friend chat specific
            if (chat.isFriendChat) {
              await Chat.findByIdAndUpdate(chatId, {
                $push: {
                  messages: {
                    sender: userId,
                    senderName: message.senderName,
                    text: message.text,
                    image: message.image,
                    type: message.type,
                    replyTo: message.replyTo,
                    replyToText: message.replyToText,
                    replyToSender: message.replyToSender,
                  },
                },
                lastMessage: new Date(),
              });

              // ✅ Notification (fire and forget)
              createNotification({
                userId: recipientId,
                type: "new_message",
                category: "friend_chat",
                title: "New message",
                message: message.text || "Sent an image",
                fromUser: userId,
                chatId,
              })
                .then((result) => {
                  if (result) {
                    io.to(`user:${recipientId}`).emit("new_notification", {
                      notification: result.notification,
                      unreadCount: result.unreadCount,
                    });
                  }
                })
                .catch((err) => console.error("❌ Notification error:", err));
            }
          } catch (metaErr) {
            console.error("❌ Metadata update error:", metaErr);
          }
        });

        console.log(
          `⚡ Message ${userId.substring(0, 8)} → ${recipientId.substring(
            0,
            8
          )} (${Date.now() - startTime}ms)`
        );
      } catch (err) {
        console.error("❌ Send message error:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ========================================================================
    // TYPING
    // ========================================================================
    socket.on("typing", async ({ chatId, isTyping }) => {
      try {
        if (!chatId) return;

        const chat = await Chat.findById(chatId).lean();
        if (!chat) return;

        const recipientId = chat.participants
          .find((p) => p.toString() !== userId)
          ?.toString();

        if (recipientId) {
          io.to(`user:${recipientId}`).emit("friend_typing", {
            chatId,
            userId,
            isTyping,
          });
        }
      } catch (err) {
        // Silently ignore typing errors
      }
    });

    // ========================================================================
    // MARK READ
    // ========================================================================
    socket.on("mark_read", async ({ chatId }) => {
      try {
        if (!chatId) return;

        await Promise.all([
          ChatMeta.findOneAndUpdate(
            { chatId, userId },
            { unreadCount: 0, lastReadAt: new Date() }
          ),
          redisClient.hSet(`user:unread:${userId}`, chatId, "0"),
        ]);

        io.to(`user:${userId}`).emit("unread_update", {
          chatId,
          unreadCount: 0,
        });
      } catch (err) {
        console.error("❌ Mark read error:", err);
      }
    });

    // ========================================================================
    // SKIP
    // ========================================================================
    socket.on("skip", async ({ chatId }) => {
      try {
        const chat = await Chat.findById(chatId).lean();
        if (!chat) return;

        const partnerId = chat.participants
          .find((p) => p.toString() !== userId)
          ?.toString();

        if (partnerId) {
          io.to(`user:${partnerId}`).emit("partner_skipped", { chatId });
        }

        socket.emit("partner_skipped", { chatId });
        console.log(`⏭️ Skip: ${chatId}`);
      } catch (err) {
        console.error("❌ Skip error:", err);
      }
    });

    // ========================================================================
    // END CHAT
    // ========================================================================
    socket.on("end_chat", async ({ chatId }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        // ✅ ABSOLUTE TERMINATION: Mark chat as permanently ended
        chat.isActive = false;
        chat.chatEnded = true;
        chat.endedAt = new Date();
        await chat.save();

        const partnerId = chat.participants
          .find((p) => p.toString() !== userId)
          ?.toString();

        if (partnerId) {
          io.to(`user:${partnerId}`).emit("chat_ended", { 
            chatId,
            reason: "Partner ended the chat"
          });
        }

        // Also emit to the user who ended it
        socket.emit("chat_ended", { 
          chatId,
          reason: "You ended the chat"
        });

        console.log(`🛑 Chat ended absolutely: ${chatId}`);
      } catch (err) {
        console.error("❌ End chat error:", err);
      }
    });

    // ========================================================================
    // FRIEND REQUEST: SEND
    // ========================================================================
    socket.on("send_friend_request", async (data) => {
      try {
        const { toUserId, chatId } = data;

        if (!toUserId) {
          return socket.emit("error", { message: "User ID required" });
        }

        const sender = await User.findById(userId)
          .select("username avatar gender")
          .lean();

        if (!sender) {
          return socket.emit("error", { message: "User not found" });
        }

        const [u1, u2] = await Promise.all([
          User.findById(userId).select("friends").lean(),
          User.findById(toUserId).select("friends").lean(),
        ]);

        if (u1?.friends?.includes(toUserId)) {
          return socket.emit("error", { message: "Already friends" });
        }

        const existing = await FriendRequest.findOne({
          $or: [
            { from: userId, to: toUserId, status: "pending" },
            { from: toUserId, to: userId, status: "pending" },
          ],
        });

        if (existing) {
          return socket.emit("error", { message: "Request already sent" });
        }

        const friendRequest = await FriendRequest.create({
          from: userId,
          to: toUserId,
          chatId,
        });

        const requestMsg = {
          id: `friend_request_${friendRequest._id}`,
          type: "friend_request",
          sender: userId,
          requestId: friendRequest._id.toString(),
          senderData: {
            _id: userId,
            username: sender.username,
            avatar: sender.avatar,
            gender: sender.gender,
          },
          chatId,
          timestamp: Date.now(),
        };

        io.to(`user:${toUserId}`).emit("friend_request_popup", requestMsg);

        // ✅ Cache with expiry
        if (chatId) {
          await redisClient.rPush(
            `chat:messages:${chatId}`,
            JSON.stringify(requestMsg)
          );
          await redisClient.expire(`chat:messages:${chatId}`, 3600);
        }

        socket.emit("friend_request_sent", {
          success: true,
          message: "Friend request sent",
        });

        // ✅ Notification (fire and forget)
        createNotification({
          userId: toUserId,
          type: "friend_request",
          category: "system",
          title: "Friend Request",
          message: `${sender.username} sent you a friend request`,
          fromUser: userId,
          data: { requestId: friendRequest._id.toString() },
        })
          .then((result) => {
            if (result) {
              io.to(`user:${toUserId}`).emit("new_notification", {
                notification: result.notification,
                unreadCount: result.unreadCount,
              });
            }
          })
          .catch((err) => console.error("❌ Notification error:", err));
      } catch (err) {
        console.error("❌ Friend request error:", err);
        socket.emit("error", { message: "Failed to send request" });
      }
    });

    // ========================================================================
    // FRIEND REQUEST: ACCEPT
    // ========================================================================
    socket.on("accept_friend_request", async (data) => {
      try {
        const { requestId, chatId } = data;

        if (!requestId) {
          return socket.emit("error", { message: "Request ID required" });
        }

        const request = await FriendRequest.findById(requestId);
        if (!request) {
          return socket.emit("error", { message: "Request not found" });
        }

        if (request.to.toString() !== userId) {
          return socket.emit("error", { message: "Unauthorized" });
        }

        request.status = "accepted";
        await request.save();

        const fromUserId = request.from.toString();
        const toUserId = request.to.toString();

        await Promise.all([
          User.findByIdAndUpdate(fromUserId, {
            $addToSet: { friends: toUserId },
          }),
          User.findByIdAndUpdate(toUserId, {
            $addToSet: { friends: fromUserId },
          }),
        ]);

        let finalChatId = chatId;
        if (chatId) {
          const existingChat = await Chat.findById(chatId);
          if (existingChat) {
            existingChat.isFriendChat = true;
            existingChat.isRandomChat = false; // ✅ Remove random status
            existingChat.type = "private"; // ✅ Convert to private
            existingChat.expiresAt = null;
            await existingChat.save();
          }
        } else {
          const newChat = await Chat.create({
            participants: [fromUserId, toUserId],
            isFriendChat: true,
          });
          await ChatMeta.create([
            { chatId: newChat._id, userId: fromUserId },
            { chatId: newChat._id, userId: toUserId },
          ]);
          finalChatId = newChat._id.toString();
        }

        const acceptMsg = {
          id: `friend_accepted_${Date.now()}`,
          type: "friend_accepted",
          text: "🎉 You are now friends! Chat will be saved permanently.",
          chatId: finalChatId,
          timestamp: Date.now(),
        };

        await redisClient.rPush(
          `chat:messages:${finalChatId}`,
          JSON.stringify(acceptMsg)
        );

        io.to(`user:${fromUserId}`).emit("friend_request_accepted", {
          chatId: finalChatId,
          friendId: toUserId,
          message: acceptMsg,
        });

        io.to(`user:${toUserId}`).emit("friend_request_accepted", {
          chatId: finalChatId,
          friendId: fromUserId,
          message: acceptMsg,
        });

        // ✅ Notifications (parallel)
        Promise.all([
          createNotification({
            userId: fromUserId,
            type: "friend_accepted",
            category: "system",
            title: "Friend Request Accepted",
            message: "is now your friend!",
            fromUser: toUserId,
          }),
          createNotification({
            userId: toUserId,
            type: "friend_accepted",
            category: "system",
            title: "You accepted",
            message: "Friend request accepted",
            fromUser: fromUserId,
          }),
        ])
          .then(([res1, res2]) => {
            if (res1) {
              io.to(`user:${fromUserId}`).emit("new_notification", {
                notification: res1.notification,
                unreadCount: res1.unreadCount,
              });
            }
            if (res2) {
              io.to(`user:${toUserId}`).emit("new_notification", {
                notification: res2.notification,
                unreadCount: res2.unreadCount,
              });
            }
          })
          .catch((err) => console.error("❌ Notification error:", err));
      } catch (err) {
        console.error("❌ Accept friend error:", err);
        socket.emit("error", { message: "Failed to accept request" });
      }
    });

    // ========================================================================
    // HEARTBEAT (Manual - optional)
    // ========================================================================
    socket.on("heartbeat", async () => {
      try {
        await redisClient.set(`presence:${userId}`, "online", { EX: 15 });
      } catch (err) {
        // Silent fail
      }
    });

    // ========================================================================
    // DISCONNECT - CRITICAL CLEANUP
    // ========================================================================
    socket.on("disconnect", async () => {
      try {
        console.log(`🔴 ${userId.substring(0, 8)} disconnecting...`);

        // ✅ Clear interval
        const intervalKey = `${userId}:${socket.id}`;
        const interval = activeIntervals.get(intervalKey);
        if (interval) {
          clearInterval(interval);
          activeIntervals.delete(intervalKey);
        }

        // ✅ Cleanup Redis
        await redisClient.sRem(`user:sockets:${userId}`, socket.id);

        const remaining = await redisClient.sMembers(`user:sockets:${userId}`);
        if (remaining.length === 0) {
          await redisClient.set(`presence:${userId}`, "offline", { EX: 60 });
        }

        // ✅ Remove from queue if present
        try {
          const queue = await redisClient.lRange("queue:global", 0, -1);
          for (const entry of queue) {
            try {
              const parsed = JSON.parse(entry);
              if (parsed.userId === userId || parsed.socketId === socket.id) {
                await redisClient.lRem("queue:global", 1, entry);
                break;
              }
            } catch (e) {
              // Skip invalid entries
            }
          }
        } catch (queueErr) {
          // Silent fail
        }

        // ✅ Remove all listeners
        socket.removeAllListeners();

        console.log(`✅ ${userId.substring(0, 8)} cleaned up`);
      } catch (err) {
        console.error("❌ Disconnect error:", err);
      }
    });
  });

  console.log("✅ Socket handlers active");
};

export default initSocketHandlers;

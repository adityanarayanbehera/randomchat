// backend/workers/messageCleanup.js

import cron from "node-cron";
import Chat from "../models/Chat.model.js";
import Group from "../models/Group.model.js";
import SystemConfig from "../models/SystemConfig.model.js";
import { redisClient } from "../server.js";

export const startMessageCleanupWorker = () => {
  // ✅ Schedule for 3:00 AM IST (21:30 UTC previous day)
  cron.schedule("30 21 * * *", async () => {
    try {
      console.log("🧹 Starting daily message cleanup at 3 AM IST...");
      const startTime = Date.now();

      // ✅ Get cleanup days from system config
      const config = await SystemConfig.getConfig();
      const cleanupDays = config.messageCleanupDays || 6;

      // ✅ If set to 0, skip cleanup entirely
      if (cleanupDays === 0) {
        console.log("⏸️ Message cleanup disabled (messageCleanupDays = 0)");
        return;
      }

      const cleanupMs = cleanupDays * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - cleanupMs);

      console.log(`📅 Deleting messages older than ${cleanupDays} days: ${cutoffDate.toISOString()}`);

      let totalDeleted = 0;
      let chatsProcessed = 0;
      let groupsProcessed = 0;

      // ========================================================================
      // PART 1: Clean Friend Chats
      // ========================================================================
      console.log("🔄 Processing friend chats...");

      const friendChats = await Chat.find({
        type: { $in: ["friend", null] },
        "messages.0": { $exists: true },
      }).lean();

      for (const chat of friendChats) {
        try {
          const updatedChat = await Chat.findById(chat._id);
          if (!updatedChat || !updatedChat.messages) continue;

          const initialCount = updatedChat.messages.length;

          updatedChat.messages = updatedChat.messages.filter((msg) => {
            const msgDate = new Date(msg.createdAt || msg.timestamp);
            return msgDate > cutoffDate;
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

            console.log(
              `  ✅ Chat ${chat._id.toString().substring(0, 8)}: Deleted ${deletedCount} messages`
            );
          }
        } catch (chatError) {
          console.error(
            `  ❌ Error processing chat ${chat._id}:`,
            chatError.message
          );
        }
      }

      // ========================================================================
      // PART 2: Clean Group Chats
      // ========================================================================
      console.log("🔄 Processing group chats...");

      const groups = await Group.find({}).lean();

      for (const group of groups) {
        try {
          if (!group.chatId) continue;

          const chat = await Chat.findById(group.chatId);
          if (!chat || !chat.messages || chat.messages.length === 0) continue;

          const initialCount = chat.messages.length;

          chat.messages = chat.messages.filter((msg) => {
            const msgDate = new Date(msg.createdAt || msg.timestamp);
            return msgDate > cutoffDate;
          });

          const deletedCount = initialCount - chat.messages.length;

          if (deletedCount > 0) {
            await chat.save();
            totalDeleted += deletedCount;
            groupsProcessed++;

            await redisClient.del(`chat:messages:${group.chatId}`);

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

            console.log(
              `  ✅ Group ${group._id.toString().substring(0, 8)}: Deleted ${deletedCount} messages`
            );
          }
        } catch (groupError) {
          console.error(
            `  ❌ Error processing group ${group._id}:`,
            groupError.message
          );
        }
      }

      // ========================================================================
      // Final Summary
      // ========================================================================
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (totalDeleted > 0) {
        console.log(
          `✅ Cleanup complete in ${duration}s: ${totalDeleted} messages deleted`
        );
        console.log(
          `   └─ Friend chats: ${chatsProcessed} processed`
        );
        console.log(
          `   └─ Group chats: ${groupsProcessed} processed`
        );
      } else {
        console.log(
          `✅ Cleanup complete in ${duration}s: No messages older than ${cleanupDays} days found`
        );
      }
    } catch (error) {
      console.error("❌ Message cleanup worker error:", error);
    }
  });

  console.log(
    "✅ Message cleanup worker started (runs daily at 3:00 AM IST)"
  );
  console.log(
    "   └─ Auto-deletes messages based on system config (default 6 days, 0 = disabled)"
  );
};

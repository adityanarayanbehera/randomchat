// backend/scripts/verifyMessages.js
// ✅ Check if messages are being saved to database

import mongoose from "mongoose";
import dotenv from "dotenv";
import Chat from "../models/Chat.model.js";
import Group from "../models/Group.model.js";

dotenv.config();

const verifyMessages = async () => {
  try {
    console.log("🔍 Verifying message persistence...\n");

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB\n");

    // Get all groups
    const groups = await Group.find({}).lean();
    console.log(`📊 Found ${groups.length} groups\n`);

    for (const group of groups) {
      console.log(`\n📦 Group: ${group.name} (${group._id})`);
      console.log(`   Chat ID: ${group.chatId}`);

      // Get chat
      const chat = await Chat.findById(group.chatId);

      if (!chat) {
        console.log(`   ❌ ERROR: Chat not found!`);
        continue;
      }

      console.log(`   ✅ Chat found`);
      console.log(`   Type: ${chat.type}`);
      console.log(`   Messages array exists: ${Array.isArray(chat.messages)}`);
      console.log(`   Messages count: ${chat.messages?.length || 0}`);
      console.log(`   lastMessage: ${chat.lastMessage}`);
      console.log(`   lastMessageAt: ${chat.lastMessageAt}`);

      if (chat.messages && chat.messages.length > 0) {
        console.log(`\n   📝 Recent messages:`);
        const recent = chat.messages.slice(-3); // Last 3 messages

        recent.forEach((msg, index) => {
          console.log(`\n   Message ${index + 1}:`);
          console.log(`      ID: ${msg._id}`);
          console.log(`      Sender: ${msg.senderName}`);
          console.log(`      Text: ${msg.text?.substring(0, 50) || "(image)"}`);
          console.log(`      Created: ${msg.createdAt}`);
        });
      } else {
        console.log(`   ⚠️ No messages found`);
      }

      console.log(`\n   ${"─".repeat(60)}`);
    }

    console.log("\n\n✅ Verification complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
};

verifyMessages();

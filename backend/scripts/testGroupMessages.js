// backend/scripts/testGroupMessages.js
// 🔬 Diagnostic script to test group chat message persistence

import mongoose from "mongoose";
import Chat from "../models/Chat.model.js";
import Group from "../models/Group.model.js";
import dotenv from "dotenv";

dotenv.config();

const testGroupMessagePersistence = async () => {
  try {
    console.log("🔬 Starting Group Chat Message Persistence Test...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test 1: Find all group chats
    console.log("📊 TEST 1: Finding all group chats...");
    const groups = await Group.find().limit(5).lean();
    console.log(`Found ${groups.length} groups\n`);

    if (groups.length === 0) {
      console.log("⚠️ NO GROUPS FOUND. Create a group first.");
      return;
    }

    // Test 2: Check chat documents for groups
    console.log("📊 TEST 2: Checking chat documents...");
    for (const group of groups) {
      console.log(`\n--- Group: ${group.name} ---`);
      console.log(`Group ID: ${group._id}`);
      console.log(`Chat ID: ${group.chatId}`);

      const chat = await Chat.findById(group.chatId).lean();

      if (!chat) {
        console.log(`❌ PROBLEM: Chat document NOT FOUND for chatId: ${group.chatId}`);
        continue;
      }

      console.log(`✅ Chat found`);
      console.log(`   Type: ${chat.type}`);
      console.log(`   Participants: ${chat.participants?.length || 0}`);
      console.log(`   Messages array exists: ${Array.isArray(chat.messages)}`);
      console.log(`   Messages count: ${chat.messages?.length || 0}`);

      // Test 3: Show last 3 messages
      if (chat.messages && chat.messages.length > 0) {
        console.log(`\n   📝 Last 3 messages:`);
        const lastMessages = chat.messages.slice(-3);
        lastMessages.forEach((msg, idx) => {
          console.log(`   ${idx + 1}. [${msg.createdAt?.toISOString()}] ${msg.senderName}: ${msg.text || "[image]"}`);
        });
      } else {
        console.log(`   ⚠️ NO MESSAGES in database for this group`);
      }

      // Test 4: Check if messages array is truly empty or just not initialized
      const rawChat = await Chat.findById(group.chatId);
      console.log(`   Messages field type: ${typeof rawChat.messages}`);
      console.log(`   Is Array: ${Array.isArray(rawChat.messages)}`);
      console.log(`   Actual length: ${rawChat.messages?.length}`);
    }

    // Test 5: Check for chats with messages but wrong type
    console.log("\n📊 TEST 3: Checking for type mismatches...");
    const chatsWithMessages = await Chat.find({
      "messages.0": { $exists: true },
    }).lean();

    console.log(`Found ${chatsWithMessages.length} chats with messages`);

    const groupTypeChats = chatsWithMessages.filter((c) => c.type === "group");
    const nonGroupChats = chatsWithMessages.filter((c) => c.type !== "group");

    console.log(`   - Group type: ${groupTypeChats.length}`);
    console.log(`   - Non-group type: ${nonGroupChats.length}`);

    if (nonGroupChats.length > 0) {
      console.log("\n   ⚠️ WARNING: Found chats with messages but type != 'group':");
      nonGroupChats.slice(0, 3).forEach((c) => {
        console.log(`      ID: ${c._id}, Type: ${c.type}, Messages: ${c.messages.length}`);
      });
    }

    // Test 6: Simulate retrieval like getChatMessages does
    console.log("\n📊 TEST 4: Simulating API message retrieval...");
    if (groups.length > 0) {
      const testGroup = groups[0];
      const testChat = await Chat.findById(testGroup.chatId).lean();

      if (testChat) {
        const messages = testChat.messages.map((m) => ({
          id: m._id.toString(),
          sender: m.sender.toString(),
          senderName: m.senderName,
          text: m.text,
          image: m.image,
          createdAt: m.createdAt,
        }));

        console.log(`✅ Retrieved ${messages.length} messages successfully`);
        console.log(`   Sample message:`, messages[messages.length - 1] || "No messages");
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY:");
    console.log("=".repeat(60));

    const totalGroups = await Group.countDocuments();
    const totalChats = await Chat.countDocuments({ type: "group" });
    const chatsWithMsgs = await Chat.countDocuments({
      type: "group",
      "messages.0": { $exists: true },
    });

    console.log(`Total Groups: ${totalGroups}`);
    console.log(`Total Group Chats: ${totalChats}`);
    console.log(`Group Chats with Messages: ${chatsWithMsgs}`);
    console.log(`Group Chats WITHOUT Messages: ${totalChats - chatsWithMsgs}`);

    if (totalGroups > totalChats) {
      console.log(`\n❌ PROBLEM: More groups than chats! ${totalGroups - totalChats} groups missing chats`);
    }

    if (totalChats > chatsWithMsgs && chatsWithMsgs > 0) {
      console.log(`\n⚠️ WARNING: Some groups have empty message arrays`);
    }

    console.log("\n✅ Test complete!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

// Run the test
testGroupMessagePersistence();

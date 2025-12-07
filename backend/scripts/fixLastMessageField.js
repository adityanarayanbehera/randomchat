// backend/scripts/fixLastMessageField.js
// ✅ Fix lastMessage field type issue in existing chats

import mongoose from "mongoose";
import dotenv from "dotenv";
import Chat from "../models/Chat.model.js";
import Group from "../models/Group.model.js";

dotenv.config();

const fixLastMessageField = async () => {
  try {
    console.log("🔧 Starting lastMessage field fix...");

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    // Get all chats
    const chats = await Chat.find({}).lean();
    console.log(`📊 Found ${chats.length} chats`);

    let fixed = 0;
    let alreadyOK = 0;
    let errors = 0;

    for (const chat of chats) {
      try {
        // Check if lastMessage is ObjectId (wrong) or Date (correct)
        const needsFix =
          chat.lastMessage &&
          typeof chat.lastMessage === "object" &&
          chat.lastMessage._bsontype === "ObjectID";

        if (needsFix || !chat.lastMessage) {
          // Fix: Set lastMessage to current timestamp or chat's updatedAt
          const newLastMessage = chat.updatedAt || new Date();

          await Chat.findByIdAndUpdate(chat._id, {
            lastMessage: newLastMessage,
            lastMessageAt: newLastMessage,
          });

          console.log(
            `✅ Fixed chat ${chat._id}: lastMessage set to ${newLastMessage}`
          );
          fixed++;
        } else {
          alreadyOK++;
        }
      } catch (chatError) {
        console.error(`❌ Error fixing chat ${chat._id}:`, chatError.message);
        errors++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`✓ Already OK: ${alreadyOK}`);
    console.log(`❌ Errors: ${errors}`);

    // Also fix groups
    console.log("\n🔧 Checking groups...");
    const groups = await Group.find({}).lean();

    for (const group of groups) {
      try {
        const chat = await Chat.findById(group.chatId);
        if (!chat) continue;

        if (!chat.messages) {
          chat.messages = [];
          await chat.save();
          console.log(`✅ Fixed group chat ${chat._id}: Added messages array`);
        }

        if (!chat.lastMessage || typeof chat.lastMessage === "object") {
          chat.lastMessage = chat.updatedAt || new Date();
          chat.lastMessageAt = chat.lastMessage;
          await chat.save();
          console.log(`✅ Fixed group chat ${chat._id}: Fixed lastMessage`);
        }
      } catch (err) {
        console.error(`❌ Error fixing group ${group._id}:`, err.message);
      }
    }

    console.log("\n✅ Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

fixLastMessageField();

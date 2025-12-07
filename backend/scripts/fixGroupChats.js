//fixGroupChats.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Chat from "../models/Chat.model.js";
import Group from "../models/Group.model.js";

dotenv.config();

const fixGroupChats = async () => {
  try {
    console.log("🔧 Starting group chat fix...");

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    const groups = await Group.find({}).lean();
    console.log(`📊 Found ${groups.length} groups`);

    let fixed = 0;
    let alreadyOK = 0;
    let errors = 0;

    for (const group of groups) {
      try {
        const chat = await Chat.findById(group.chatId);

        if (!chat) {
          console.log(`❌ Chat not found for group: ${group.name}`);
          errors++;
          continue;
        }

        let needsSave = false;

        // Fix type field
        if (chat.type !== "group") {
          console.log(`🔧 Fixing type for ${group.name}: ${chat.type} → group`);
          chat.type = "group";
          needsSave = true;
        }

        // Fix messages array
        if (!chat.messages) {
          console.log(`🔧 Adding messages array for ${group.name}`);
          chat.messages = [];
          needsSave = true;
        }

        if (!Array.isArray(chat.messages)) {
          console.log(`🔧 Converting messages to array for ${group.name}`);
          chat.messages = [];
          needsSave = true;
        }

        if (needsSave) {
          await chat.save();
          fixed++;
          console.log(`✅ Fixed: ${group.name}`);
        } else {
          alreadyOK++;
        }
      } catch (groupError) {
        console.error(`❌ Error with group ${group.name}:`, groupError.message);
        errors++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`✓ Already OK: ${alreadyOK}`);
    console.log(`❌ Errors: ${errors}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

fixGroupChats();

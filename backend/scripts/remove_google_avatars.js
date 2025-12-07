import mongoose from "mongoose";
import User from "../models/User.model.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const removeGoogleAvatars = async () => {
  try {
    console.log("Loading environment variables...");
    if (!process.env.MONGODB_URL) {
      throw new Error("MONGODB_URL is not defined in .env");
    }
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to database.");

    console.log("Searching for users with Google profile pictures...");
    
    // Find users whose avatar contains 'googleusercontent.com'
    const result = await User.updateMany(
      { avatar: { $regex: "googleusercontent.com", $options: "i" } },
      { $set: { avatar: "" } }
    );

    console.log(`Operation complete.`);
    console.log(`Matched users: ${result.matchedCount}`);
    console.log(`Modified users: ${result.modifiedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("Error removing Google avatars:", error);
    process.exit(1);
  }
};

removeGoogleAvatars();

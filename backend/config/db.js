//C:\Users\Aditya Narayan Beher\Desktop\RANDOMCHATAPP\backend\config\db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // ✅ FIX: Remove deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URL);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("📡 MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("🔌 MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
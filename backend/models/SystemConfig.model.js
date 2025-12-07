// backend/models/SystemConfig.model.js
import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema(
  {
    // Random Chat Limits
    randomChat: {
      freeDailyLimit: { type: Number, default: 100 },
      subscribedDailyLimit: { type: Number, default: 200 },
    },

    // Group Limits
    groups: {
      maxCreationPerDay: { type: Number, default: 10 },
    },

    // Upload Limits
    uploads: {
      freeDailyLimit: { type: Number, default: 10 },
      subscribedDailyLimit: { type: Number, default: 50 },
    },

    // Backup Settings
    googleDriveLink: { type: String, default: "" },

    // Maintenance Mode
    maintenanceMode: { type: Boolean, default: false },

    // Message Cleanup Settings
    messageCleanupDays: { type: Number, default: 6, min: 0, max: 365 },
    
    // Last Updated
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

// Singleton pattern: ensure only one config document exists
systemConfigSchema.statics.getConfig = async function () {
  const config = await this.findOne();
  if (config) return config;
  return await this.create({});
};

export default mongoose.model("SystemConfig", systemConfigSchema);

// backend/models/BackupLog.model.js
import mongoose from "mongoose";

const backupLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    type: {
      type: String,
      enum: ["FULL", "PARTIAL", "MONTHLY"],
      default: "FULL",
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    size: {
      type: Number, // in bytes
      default: 0,
    },
    fileUrl: {
      type: String, // Google Drive link or local path
    },
    details: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("BackupLog", backupLogSchema);

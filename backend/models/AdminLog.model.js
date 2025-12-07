// backend/models/AdminLog.model.js
// ✅ NEW: Track all admin actions for audit trail
import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "BAN_USER",
        "UNBAN_USER",
        "DELETE_USER",
        "BAN_GROUP",
        "UNBAN_GROUP",
        "DELETE_GROUP",
        "VIEW_USER",
        "VIEW_ANALYTICS",
        "VIEW_FEEDBACK",
        "DELETE_FEEDBACK",
        "VIEW_LOGS",
        "EXPORT_DATA",
        "CREATE_PROMO_CODE",
        "UPDATE_PROMO_CODE",
        "DELETE_PROMO_CODE",
        "CLEANUP_CHAT_DATA",
        "RESTART_SERVER",
        "UPDATE_CONFIG",
        "BULK_DELETE_USERS",
      ],
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    details: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },
  },
  { timestamps: true }
);

// ✅ Indexes for fast queries
adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ action: 1, createdAt: -1 });
adminLogSchema.index({ targetUserId: 1 });
adminLogSchema.index({ createdAt: -1 });

// ✅ Auto-delete logs older than 90 days
adminLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

export default mongoose.model("AdminLog", adminLogSchema);

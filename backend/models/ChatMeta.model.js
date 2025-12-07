import mongoose from "mongoose";

const chatMetaSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    lastReadAt: {
      type: Date,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    mutedUntil: Date,

    // ✅ NEW: Disappearing messages settings (per user)
    disappearingDuration: {
      type: Number,
      default: 60, // Default: 1 hour (in minutes)
      min: 0, // 0 = OFF (forever storage)
    },
    disappearingUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ✅ CRITICAL: Unique index to prevent duplicates
chatMetaSchema.index({ chatId: 1, userId: 1 }, { unique: true });

// ✅ Query optimization indexes
chatMetaSchema.index({ userId: 1, lastMessageAt: -1 });
chatMetaSchema.index({ userId: 1, unreadCount: 1 });
chatMetaSchema.index({ chatId: 1, disappearingDuration: 1 }); // For cleanup queries

export default mongoose.model("ChatMeta", chatMetaSchema);

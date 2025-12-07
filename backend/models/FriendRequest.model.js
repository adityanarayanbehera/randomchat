// backend/models/FriendRequest.model.js
// ✅ UPDATED: Store chatId where request was sent
import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ Compound indexes for efficient queries
friendRequestSchema.index({ to: 1, status: 1 });
friendRequestSchema.index({ from: 1, to: 1, status: 1 });

export default mongoose.model("FriendRequest", friendRequestSchema);

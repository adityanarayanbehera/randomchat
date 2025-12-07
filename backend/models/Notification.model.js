import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "friend_request",
        "friend_accepted",
        "new_message",
        "system",
        "random_chat",
        "group_message",
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ["random_chat", "friend_chat", "group_chat", "system"],
      required: true,
    },
    title: String,
    message: String,
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    data: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);

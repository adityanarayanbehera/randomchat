//C:\Users\Aditya Narayan Beher\Desktop\RANDOMCHATAPP\backend\models\Message.model.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return this.messageType === "text";
      },
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "audio", "video", "system"],
      default: "text",
    },
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deliveredTo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ chatId: 1, status: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ "readBy.user": 1 });

// Method to mark as read
messageSchema.methods.markAsRead = function (userId) {
  if (!this.readBy.some((read) => read.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId });
    this.status = "read";
  }
  return this.save();
};

// Method to mark as delivered
messageSchema.methods.markAsDelivered = function (userId) {
  if (
    !this.deliveredTo.some(
      (delivered) => delivered.user.toString() === userId.toString()
    )
  ) {
    this.deliveredTo.push({ user: userId });
    if (this.status === "sent") {
      this.status = "delivered";
    }
  }
  return this.save();
};

// ========== OPTIMIZED INDEXES FOR FREE TIER ==========
// Compound index for fast message fetching (chatId + time sorting)
// messageSchema.index({ chatId: 1, createdAt: -1 }); // Removed: Duplicate of line 103

// Index for unread message queries
// messageSchema.index({ chatId: 1, sender: 1, createdAt: -1 }); // Kept if unique, otherwise remove

const Message = mongoose.model("Message", messageSchema);

export default Message;

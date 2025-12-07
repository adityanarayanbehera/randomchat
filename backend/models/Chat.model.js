import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ["private", "group", "random"],
      default: "private",
    },
    isRandomChat: {
      type: Boolean,
      default: false,
    },
    isFriendChat: {
      type: Boolean,
      default: false,
    },
    randomChatId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ✅ Messages array for GROUP CHATS
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        senderName: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          default: "",
        },
        image: {
          type: String,
          default: "",
        },
        type: {
          type: String,
          enum: ["text", "image", "system"],
          default: "text",
        },
        replyTo: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        replyToText: {
          type: String,
          default: "",
        },
        replyToSender: {
          type: String,
          default: "",
        },
        mentions: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        reactions: [
          {
            userId: {
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
        readBy: [
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            readAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ✅ CRITICAL FIX: This should be Date, not ObjectId!
    lastMessage: {
      type: Date, // Changed from ObjectId to Date
      default: Date.now,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    settings: {
      isDisappearing: {
        type: Boolean,
        default: false,
      },
      disappearingTime: {
        type: Number,
        default: 0,
      },
      onlyAdminsCanSendMessages: {
        type: Boolean,
        default: false,
      },
      onlyAdminsCanAddMembers: {
        type: Boolean,
        default: false,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    chatEnded: {
      type: Boolean,
      default: false,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ isRandomChat: 1, participants: 1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ updatedAt: -1 });
chatSchema.index({ type: 1, participants: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ "messages.createdAt": -1 });

// Methods
chatSchema.methods.isParticipant = function (userId) {
  return this.participants.some(
    (participant) => participant.toString() === userId.toString()
  );
};

chatSchema.methods.isAdmin = function (userId) {
  return this.admins.some((admin) => admin.toString() === userId.toString());
};

chatSchema.methods.addParticipant = function (userId) {
  if (!this.isParticipant(userId)) {
    this.participants.push(userId);
  }
  return this.save();
};

chatSchema.methods.removeParticipant = function (userId) {
  this.participants = this.participants.filter(
    (participant) => participant.toString() !== userId.toString()
  );
  return this.save();
};

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;

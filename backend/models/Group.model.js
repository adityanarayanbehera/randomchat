// backend/models/Group.model.js
// ✅ UPDATED: Added disappearing messages support (owner-only, 7 days default)
import mongoose from "mongoose";
import crypto from "crypto";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 300,
      default: "",
    },
    avatar: {
      type: String,
      default: null,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      unique: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    inviteToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    inviteExpiry: {
      type: Date,
      default: null,
    },
    settings: {
      maxMembers: {
        type: Number,
        default: 256,
      },
      membersCanInvite: {
        type: Boolean,
        default: true,
      },
      onlyAdminsCanPost: {
        type: Boolean,
        default: false,
      },
    },

    // ✅ NEW: Disappearing messages (owner-only control, 7 days default)
    disappearingDuration: {
      type: Number,
      default: 10080, // 7 days in minutes (7 * 24 * 60 = 10080)
      enum: [1440, 4320, 10080, 21600], // 24h, 3d, 7d, 15d (in minutes)
    },
    disappearingUpdatedAt: {
      type: Date,
      default: Date.now,
    },

    messageRetention: {
      textDays: {
        type: Number,
        default: 15,
      },
      imageDays: {
        type: Number,
        default: 7,
      },
    },
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    lastActivity: {
      type: Date,
      default: Date.now,
    },

    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    banReason: {
      type: String,
      default: null,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Indexes for performance
groupSchema.index({ owner: 1, createdAt: -1 });
groupSchema.index({ members: 1 });
groupSchema.index({ isPublic: 1, lastActivity: -1 });
// groupSchema.index({ inviteToken: 1 }); // Removed: Duplicate of unique: true in schema
groupSchema.index({ disappearingDuration: 1 }); // For cleanup queries

// ✅ Method: Generate invite token
groupSchema.methods.generateInviteToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.inviteToken = token;
  this.inviteExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

// ✅ Method: Check if user is admin
groupSchema.methods.isAdmin = function (userId) {
  return (
    this.owner.toString() === userId.toString() ||
    this.admins.some((id) => id.toString() === userId.toString())
  );
};

// ✅ Method: Check if user is member
groupSchema.methods.isMember = function (userId) {
  return this.members.some((id) => id.toString() === userId.toString());
};

// ✅ Method: Check if user is owner
groupSchema.methods.isOwner = function (userId) {
  return this.owner.toString() === userId.toString();
};

// ✅ Method: Get avatar color
groupSchema.methods.getAvatarColor = function () {
  const colors = [
    "from-blue-400 to-blue-600",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-pink-600",
    "from-green-400 to-green-600",
    "from-yellow-400 to-yellow-600",
    "from-red-400 to-red-600",
    "from-indigo-400 to-indigo-600",
    "from-cyan-400 to-cyan-600",
  ];
  const hash = this.name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// ✅ Virtual: Member count
groupSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

// ✅ Ensure owner is always in members and admins
groupSchema.pre("save", function (next) {
  if (this.isNew) {
    if (!this.members.includes(this.owner)) {
      this.members.push(this.owner);
    }
    if (!this.admins.includes(this.owner)) {
      this.admins.push(this.owner);
    }
  }
  next();
});
// ✅ ADD: Method to check if group is currently banned
groupSchema.methods.isCurrentlyBanned = function () {
  return this.isBanned === true;
};

export default mongoose.model("Group", groupSchema);

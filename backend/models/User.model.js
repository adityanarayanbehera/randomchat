// ========================================================================
// FILE: backend/models/User.model.js
// ✅ OPTIMIZED FOR FREE TIER: Minimal data storage (70% reduction)
// STORES ONLY: username, email, password, gender, avatar, friends, blocked
// ========================================================================
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ========== CORE USER DATA (ESSENTIAL ONLY) ==========
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: false, // ✅ Optional for anonymous users
      unique: true,
      sparse: true, // ✅ Allows null values while maintaining uniqueness
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // ✅ Optional for anonymous users
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },

    // ========== RELATIONSHIPS ==========
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ========== ADMIN CONTROLS ==========
    settings: {
      notifications: { type: Boolean, default: true },
      privacy: { type: String, enum: ["public", "friends", "private"], default: "public" },
      theme: { type: String, default: "light" },
    },
    
    // Usage Stats for Limits
    usageStats: {
      randomMatchesToday: { type: Number, default: 0 },
      groupsCreatedToday: { type: Number, default: 0 },
      uploadsToday: { type: Number, default: 0 },
      lastUsageReset: { type: Date, default: Date.now },
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
    banExpiresAt: {
      type: Date,
      default: null,
    },

    // ========== SUBSCRIPTION & SETTINGS ==========
    subscription: {
      tier: {
        type: String,
        enum: ["free", "premium"],
        default: "free",
      },
      duration: {
        type: String,
        enum: ["monthly", "yearly", "lifetime"],
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      paymentId: {
        type: String,
        default: null,
      },
      activatedAt: {
        type: Date,
        default: null,
      },
      paidAmount: {
        type: Number,
        default: 0,
      },
    },
    settings: {
      hasGenderFilter: {
        type: Boolean,
        default: false,
      },
      genderFilterEnabled: {
        type: Boolean,
        default: false,
      },
      genderPreference: {
        type: String,
        enum: ["male", "female", "any"],
        default: "any",
      },
      fallbackToRandom: {
        type: Boolean,
        default: true,
      },
    },

    // ========== SYSTEM FIELDS ==========
    lastActive: {
      type: Date,
      default: Date.now,
    },
    socketId: String,
  },
  { 
    timestamps: true,
    // Optimize for smaller document size
    minimize: true,
  }
);

userSchema.methods.isCurrentlyBanned = function () {
  if (!this.isBanned) return false;

  // If permanent ban (no expiry)
  if (!this.banExpiresAt) return true;

  // If temporary ban, check if expired
  if (this.banExpiresAt < new Date()) {
    // Auto-unban if expired
    this.isBanned = false;
    this.banReason = null;
    this.bannedAt = null;
    this.banExpiresAt = null;
    this.save();
    return false;
  }

  return true;
};

// Helper to check and reset daily stats
userSchema.methods.checkDailyReset = function () {
  // ✅ CRASH PROOF: Initialize if missing
  if (!this.usageStats) {
    this.usageStats = {
      randomMatchesToday: 0,
      groupsCreatedToday: 0,
      uploadsToday: 0,
      lastUsageReset: new Date(),
    };
    return true; // Initialized
  }

  const now = new Date();
  const lastReset = this.usageStats.lastUsageReset ? new Date(this.usageStats.lastUsageReset) : new Date(0);
  
  // Check if it's a different day
  if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usageStats.randomMatchesToday = 0;
    this.usageStats.groupsCreatedToday = 0;
    this.usageStats.uploadsToday = 0;
    this.usageStats.lastUsageReset = now;
    return true; // Reset happened
  }
  return false; // No reset
};

// ✅ ADD: Pre-save middleware to check ban expiry
userSchema.pre("save", function (next) {
  if (this.isBanned && this.banExpiresAt && this.banExpiresAt < new Date()) {
    this.isBanned = false;
    this.banReason = null;
    this.bannedAt = null;
    this.banExpiresAt = null;
  }
  next();
});

// ========== OPTIMIZED INDEXES FOR FREE TIER ==========
// Essential for random chat matching
userSchema.index({ gender: 1, isBanned: 1, lastActive: -1 });

// Fast friend lookup
userSchema.index({ friends: 1 });

// Ban queries (admin panel)
userSchema.index({ isBanned: 1, bannedAt: -1 });

export default mongoose.model("User", userSchema);

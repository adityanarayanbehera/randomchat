// backend/models/PromoCode.model.js
// Promo code model for subscription promotions
import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // Store in uppercase for case-insensitive matching
      trim: true,
      minlength: 3,
      maxlength: 50,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 200,
    },
    maxUses: {
      type: Number,
      default: null, // null = unlimited uses
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: null, // null = never expires
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    usedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        redeemedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to check if promo code is valid
promoCodeSchema.methods.isValid = function () {
  // Check if active
  if (!this.isActive) {
    return { valid: false, reason: "Promo code is inactive" };
  }

  // Check if expired
  if (this.expiresAt && new Date() > this.expiresAt) {
    return { valid: false, reason: "Promo code has expired" };
  }

  // Check if max uses reached
  if (this.maxUses && this.usedCount >= this.maxUses) {
    return { valid: false, reason: "Promo code usage limit reached" };
  }

  return { valid: true };
};

// Method to check if user has already used this code
promoCodeSchema.methods.hasUserUsed = function (userId) {
  return this.usedBy.some(
    (entry) => entry.userId.toString() === userId.toString()
  );
};

// Method to redeem code for a user
promoCodeSchema.methods.redeemForUser = async function (userId) {
  // Add user to usedBy array
  this.usedBy.push({
    userId,
    redeemedAt: new Date(),
  });

  // Increment used count
  this.usedCount += 1;

  await this.save();
};

// Index for efficient queries
promoCodeSchema.index({ isActive: 1, expiresAt: 1 });
promoCodeSchema.index({ createdBy: 1 });
promoCodeSchema.index({ "usedBy.userId": 1 });

export default mongoose.model("PromoCode", promoCodeSchema);

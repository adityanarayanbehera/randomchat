import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["paid", "promo"],
      default: "paid",
    },
    promoCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromoCode",
    },
  },
  { timestamps: true }
);

// Index for faster queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;

// backend/models/Feedback.model.js
// ✅ NEW: User feedback collection for admin review
import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["BUG", "FEATURE_REQUEST", "COMPLAINT", "SUGGESTION", "OTHER"],
      required: true,
    },
    category: {
      type: String,
      enum: ["MATCHING", "CHAT", "GROUPS", "PERFORMANCE", "UI", "OTHER"],
      default: "OTHER",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["PENDING", "REVIEWING", "RESOLVED", "CLOSED"],
      default: "PENDING",
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      browser: String,
      os: String,
      device: String,
      screenSize: String,
    },
  },
  { timestamps: true }
);

// ✅ Indexes for filtering
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1 });
feedbackSchema.index({ priority: 1, status: 1 });

export default mongoose.model("Feedback", feedbackSchema);

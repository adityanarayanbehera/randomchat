import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "spam",
        "harassment",
        "inappropriate_content",
        "fake_profile",
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    evidence: [
      {
        type: {
          type: String,
          enum: ["message", "image", "screenshot"],
          required: true,
        },
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "dismissed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    resolution: {
      action: {
        type: String,
        enum: [
          "warning",
          "temporary_ban",
          "permanent_ban",
          "dismissed",
          "no_action",
        ],
        default: "no_action",
      },
      notes: String,
      resolvedAt: Date,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
      },
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries - YE SAB ADD KARO
reportSchema.index({ reportedUser: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ priority: 1, status: 1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ createdAt: -1 });

// Method to assign report to admin
reportSchema.methods.assignToAdmin = function (adminId) {
  this.assignedTo = adminId;
  this.status = "reviewing";
  return this.save();
};

// Method to resolve report
reportSchema.methods.resolve = function (action, notes, adminId) {
  this.resolution = {
    action,
    notes,
    resolvedAt: new Date(),
    resolvedBy: adminId,
  };
  this.status = "resolved";
  return this.save();
};

const Report = mongoose.model("Report", reportSchema);

export default Report;

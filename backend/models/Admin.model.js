// backend/models/Admin.model.js
// ✅ ENHANCED: Complete admin model with secret code authentication
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    secretCode: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "moderator"],
      default: "admin",
    },
    permissions: {
      canBanUsers: { type: Boolean, default: true },
      canDeleteUsers: { type: Boolean, default: false },
      canViewAnalytics: { type: Boolean, default: true },
      canManageFeedback: { type: Boolean, default: true },
      canViewLogs: { type: Boolean, default: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ✅ Hash secret code before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("secretCode")) return next();
  this.secretCode = await bcrypt.hash(this.secretCode, 12);
  next();
});

// ✅ Compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ Compare secret code
adminSchema.methods.compareSecretCode = async function (candidateCode) {
  return await bcrypt.compare(candidateCode, this.secretCode);
};

// ✅ Check if account is locked
adminSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// ✅ Increment login attempts
adminSchema.methods.incLoginAttempts = async function () {
  // Reset attempts after 2 hours
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  const maxAttempts = 5;
  if (this.loginAttempts + 1 >= maxAttempts) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// ✅ Reset login attempts on successful login
adminSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

export default mongoose.model("Admin", adminSchema);

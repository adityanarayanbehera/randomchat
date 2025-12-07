// backend/scripts/createAdmin.js
// ✅ Script to create initial super admin account
import mongoose from "mongoose";
import Admin from "../models/Admin.model.js";
import dotenv from "dotenv";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ role: "super_admin" });

    if (existingAdmin) {
      console.log("❌ Super admin already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Create super admin
    const admin = await Admin.create({
      email: "admin@randomchat.com",
      password: "Admin@12345", // Change this in production!
      secretCode: "SECRETCODE123", // Change this in production!
      name: "Super Administrator",
      role: "super_admin",
      permissions: {
        canBanUsers: true,
        canDeleteUsers: true,
        canViewAnalytics: true,
        canManageFeedback: true,
        canViewLogs: true,
      },
      isActive: true,
    });

    console.log("\n========================================");
    console.log("✅ Super Admin Created Successfully!");
    console.log("========================================");
    console.log("Email:", admin.email);
    console.log("Password: Admin@12345");
    console.log("Secret Code: SECRETCODE123");
    console.log("Role:", admin.role);
    console.log("========================================");
    console.log("⚠️  IMPORTANT: Change credentials in production!");
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
    process.exit(1);
  }
};

createSuperAdmin();

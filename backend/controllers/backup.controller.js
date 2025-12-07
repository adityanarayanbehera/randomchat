// backend/controllers/backup.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.model.js";
import Group from "../models/Group.model.js";
import Chat from "../models/Chat.model.js";
import Message from "../models/Message.model.js";
import BackupLog from "../models/BackupLog.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backups directory exists
const backupDir = path.join(__dirname, "../../backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Create a new backup (JSON format)
 * NOTE: Changed to single JSON file to avoid 'archiver' dependency crash
 */
export const createBackup = async (req, res) => {
  try {
    const { type = "FULL", notes, startDate, endDate } = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${type.toLowerCase()}-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    // Date filter query
    const dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Fetch data based on type
    const users = await User.find(dateQuery).lean();
    const groups = await Group.find(dateQuery).lean();
    
    let chats = [];
    let messages = [];

    if (type === "FULL") {
      chats = await Chat.find(dateQuery).lean();
      messages = await Message.find(dateQuery).lean();
    }

    // Combine into one object
    const backupData = {
      meta: {
        type,
        timestamp: new Date(),
        version: "1.0",
        counts: {
          users: users.length,
          groups: groups.length,
          chats: chats.length,
          messages: messages.length,
        }
      },
      users,
      groups,
      chats,
      messages
    };

    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    const stats = fs.statSync(filePath);
    const size = stats.size;

    console.log(`📦 Backup created: ${filename} (${size} bytes)`);

    // Create log entry
    const log = await BackupLog.create({
      adminId: req.adminId,
      type,
      status: "SUCCESS",
      size,
      fileUrl: `/backups/${filename}`,
      details: notes || `Manual ${type} backup ${startDate ? `(${startDate} to ${endDate})` : ""}`,
      completedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Backup created successfully",
      backup: log,
    });

  } catch (error) {
    console.error("❌ Create backup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create backup",
    });
  }
};

/**
 * GET /api/admin/backups
 * Get backup history
 */
export const getBackupLogs = async (req, res) => {
  try {
    const logs = await BackupLog.find()
      .sort({ createdAt: -1 })
      .populate("adminId", "username")
      .limit(50);

    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("❌ Get backup logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch backup logs",
    });
  }
};

/**
 * GET /api/admin/backups/download/:filename
 * Download a backup file
 */
export const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Backup file not found",
      });
    }

    res.download(filePath);
  } catch (error) {
    console.error("❌ Download backup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download backup",
    });
  }
};

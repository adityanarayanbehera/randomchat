// backend/controllers/analytics.controller.js
// ✅ Complete analytics and system monitoring for admin panel
import User from "../models/User.model.js";
import Chat from "../models/Chat.model.js";
import Group from "../models/Group.model.js";
import Message from "../models/Message.model.js";
import mongoose from "mongoose";
import os from "os";

/**
 * GET /api/admin/analytics/overview
 * Get comprehensive system overview
 */
export const getAnalyticsOverview = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // User metrics
    const [
      totalUsers,
      activeUsers,
      onlineUsers,
      newUsersToday,
      maleUsers,
      femaleUsers,
      premiumUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastActive: { $gte: fiveMinutesAgo } }),
      User.countDocuments({ socketId: { $exists: true, $ne: null } }),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ gender: "male" }),
      User.countDocuments({ gender: "female" }),
      User.countDocuments({ "subscription.tier": "premium" }),
    ]);

    // Chat metrics
    const [totalChats, totalGroups, totalMessages, messagesToday] =
      await Promise.all([
        Chat.countDocuments(),
        Group.countDocuments(),
        Message.countDocuments(),
        Message.countDocuments({ createdAt: { $gte: today } }),
      ]);

    // MongoDB stats
    const dbStats = await mongoose.connection.db.stats();
    const storageUsed = dbStats.dataSize + dbStats.indexSize;
    const storageLimit = 512 * 1024 * 1024; // 512 MB for free tier
    const storagePercent = (storageUsed / storageLimit) * 100;

    // Connection stats
    const connectionCount = mongoose.connection.client.topology?.s?.pool?.totalConnectionCount || 0;
    const connectionLimit = 100; // MongoDB Atlas free tier
    const connectionPercent = (connectionCount / connectionLimit) * 100;

    // System metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = (usedMemory / totalMemory) * 100;

    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    // Generate warnings
    const warnings = [];

    if (storagePercent > 80) {
      warnings.push({
        type: "danger",
        service: "MongoDB Storage",
        message: `${storagePercent.toFixed(1)}% used (${(storageUsed / 1024 / 1024).toFixed(2)} MB / 512 MB)`,
        action: "Consider deleting old chat data or upgrading",
      });
    }

    if (connectionPercent > 80) {
      warnings.push({
        type: "warning",
        service: "MongoDB Connections",
        message: `${connectionCount}/${connectionLimit} connections (${connectionPercent.toFixed(1)}%)`,
        action: "Monitor connection pooling",
      });
    }

    if (onlineUsers > 400) {
      warnings.push({
        type: "warning",
        service: "WebSocket Connections",
        message: `${onlineUsers} concurrent connections (target: 500 max)`,
        action: "Approaching connection limit",
      });
    }

    if (memoryPercent > 80) {
      warnings.push({
        type: "warning",
        service: "System Memory",
        message: `${memoryPercent.toFixed(1)}% used`,
        action: "Consider restarting server",
      });
    }

    res.status(200).json({
      success: true,
      metrics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          online: onlineUsers,
          newToday: newUsersToday,
          male: maleUsers,
          female: femaleUsers,
          premium: premiumUsers,
        },
        chats: {
          total: totalChats,
          groups: totalGroups,
          messages: totalMessages,
          messagesToday,
        },
        services: {
          mongodb: {
            storage: {
              used: storageUsed,
              limit: storageLimit,
              percent: storagePercent,
              usedMB: (storageUsed / 1024 / 1024).toFixed(2),
              limitMB: 512,
            },
            connections: {
              current: connectionCount,
              limit: connectionLimit,
              percent: connectionPercent,
            },
          },
          websocket: {
            current: onlineUsers,
            target: 500,
            percent: (onlineUsers / 500) * 100,
          },
          system: {
            memory: {
              used: usedMemory,
              total: totalMemory,
              percent: memoryPercent,
              usedGB: (usedMemory / 1024 / 1024 / 1024).toFixed(2),
              totalGB: (totalMemory / 1024 / 1024 / 1024).toFixed(2),
            },
            cpu: {
              percent: cpuUsage.toFixed(2),
              cores: cpus.length,
            },
            uptime: process.uptime(),
          },
        },
      },
      warnings,
    });
  } catch (error) {
    console.error("❌ Get analytics overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
};

/**
 * GET /api/admin/analytics/chart-data
 * Get data for charts (last 24 hours)
 */
export const getChartData = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // User activity by hour
    const userActivity = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: last24Hours },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d %H:00",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Message activity by hour
    const messageActivity = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: last24Hours },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d %H:00",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      chartData: {
        userActivity,
        messageActivity,
      },
    });
  } catch (error) {
    console.error("❌ Get chart data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chart data",
    });
  }
};

/**
 * DELETE /api/admin/system/cleanup-chats
 * Delete chat messages within date range
 */
export const cleanupChatData = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include entire end date

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    // Delete messages in date range
    const result = await Message.deleteMany({
      createdAt: {
        $gte: start,
        $lte: end,
      },
    });

    console.log(
      `🗑️ Deleted ${result.deletedCount} messages from ${startDate} to ${endDate}`
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} messages`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("❌ Cleanup chat data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup chat data",
    });
  }
};

/**
 * POST /api/admin/system/restart
 * Restart server (with maintenance mode warning)
 */
export const restartServer = async (req, res) => {
  try {
    const { confirmed } = req.body;

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        message: "Restart must be confirmed",
      });
    }

    console.log("🔄 Server restart initiated by admin:", req.adminId);

    // Send response before restart
    res.status(200).json({
      success: true,
      message: "Server will restart in 5 seconds. All users will be disconnected.",
    });

    // Broadcast to all connected users
    if (global.io) {
      global.io.emit("maintenance", {
        message: "Server is restarting for maintenance. Please reconnect in a moment.",
      });
    }

    // Restart after 5 seconds
    setTimeout(() => {
      console.log("🔄 Restarting server...");
      process.exit(0); // PM2 or nodemon will restart automatically
    }, 5000);
  } catch (error) {
    console.error("❌ Restart server error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restart server",
    });
  }
};

import SystemConfig from "../models/SystemConfig.model.js";

/**
 * GET /api/admin/system/config
 * Get system configuration
 */
export const getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();
    res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("❌ Get system config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch system configuration",
    });
  }
};

/**
 * PUT /api/admin/system/config
 * Update system configuration
 */
export const updateSystemConfig = async (req, res) => {
  try {
    const updates = req.body;
    
    // Get existing config
    const config = await SystemConfig.getConfig();

    // Update fields
    if (updates.randomChat) {
      config.randomChat = { ...config.randomChat, ...updates.randomChat };
    }
    if (updates.groups) {
      config.groups = { ...config.groups, ...updates.groups };
    }
    if (updates.uploads) {
      config.uploads = { ...config.uploads, ...updates.uploads };
    }
    if (updates.googleDriveLink !== undefined) {
      config.googleDriveLink = updates.googleDriveLink;
    }
    if (updates.maintenanceMode !== undefined) {
      config.maintenanceMode = updates.maintenanceMode;
    }
    if (updates.messageCleanupDays !== undefined) {
      // Validate range
      const days = parseInt(updates.messageCleanupDays);
      if (days < 0 || days > 365) {
        return res.status(400).json({
          success: false,
          message: "Message cleanup days must be between 0 and 365",
        });
      }
      config.messageCleanupDays = days;
    }

    config.updatedBy = req.adminId;
    await config.save();

    console.log("⚙️ System configuration updated by admin:", req.adminId);

    res.status(200).json({
      success: true,
      message: "Configuration updated successfully",
      config,
    });
  } catch (error) {
    console.error("❌ Update system config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update system configuration",
    });
  }
};

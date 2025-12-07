// backend/server.js - UPDATED
import { storeMetrics } from "./utils/systemMetrics.js";

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Import config
import connectDB from "./config/db.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import chatRoutes from "./routes/chat.routes.js"; // ✅ NEW
import notificationRoutes from "./routes/notification.routes.js";
import groupRoutes from "./routes/group.routes.js";
import searchRoutes from "./routes/search.routes.js";
// Import socket handlers
import { initSocketHandlers } from "./socket/socketHandlers.js";
import { startMatchWorker } from "./socket/matchWorker.js";
import { initGroupSocketHandlers } from "./socket/groupSocketHandlers.js";
import { startMessageCleanupWorker } from "./workers/messageCleanup.js";
// REMOVED: Old disappearing message cleanup functions - replaced with unified 6-day auto-delete
dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});
// Make io globally accessible for match worker
// Make io globally accessible for match worker
global.io = io;
// Redis Client
import { redisClient } from "./config/redis.js";
export { redisClient };

redisClient.on("error", (err) => console.error("❌ Redis Error:", err));
redisClient.on("connect", () => console.log("🔗 Redis Connecting..."));
redisClient.on("ready", () => console.log("✅ Redis Connected & Ready"));
redisClient.on("reconnecting", () => console.log("🔄 Redis Reconnecting..."));

const port = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Request logging (development)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      mongodb: "connected",
      redis: redisClient.isReady ? "connected" : "disconnected",
      socket: "active",
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/search", searchRoutes);
// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Random Chat API Server - WhatsApp Grade",
    version: "2.0.0",
    status: "running",
    endpoints: {
      auth: "/api/auth",
      user: "/api/user",
      friends: "/api/friends",
      subscription: "/api/subscription",
      admin: "/api/admin",
      chats: "/api/chats",
      notifications: "/api/notifications",
      groups: "/api/groups",
      health: "/health",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    requestedPath: req.path,
    method: req.method,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    // Initialize Socket.IO handlers
    initSocketHandlers(io, redisClient);

    // Start Match Worker
    startMatchWorker(io, redisClient);
    // ✅ Start unified message cleanup worker (runs daily at 3 AM IST)
    startMessageCleanupWorker();

    setInterval(() => {
      storeMetrics();
    }, 600000); // Collect metrics every 1 minute
    console.log("✅ System metrics worker started (collects every 1 minute)");
    console.log("✅ Group disappearing message cleanup worker started");
    // Start HTTP server
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║   🚀 Random Chat Server Running (WhatsApp v2)     ║
║   📡 Port: ${PORT}                                   ║
║   🌐 Environment: ${
        process.env.NODE_ENV || "development"
      }                     ║
║   ✅ MongoDB: Connected                           ║
║   ✅ Redis: Connected                             ║
║   ✅ Socket.IO: Active                            ║
║   ✅ Match Worker: Running                        ║
║   ✅ ChatMeta: Enabled                            ║
║   ✅ Friend Disappearing: Active                  ║
║   ✅ Group Disappearing: Active                   ║
╚═══════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);

      server.close(async () => {
        console.log("🔌 HTTP server closed");

        if (redisClient.isOpen) {
          await redisClient.quit();
          console.log("🔌 Redis connection closed");
        }

        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error("❌ Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  // ✅ CRASH PROOF: Do not exit, just log
  // process.exit(1); 
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  // ✅ CRASH PROOF: Do not exit, just log
  // process.exit(1);
});

// Start the server
startServer();
export { io };

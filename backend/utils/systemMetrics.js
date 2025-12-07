// backend/utils/systemMetrics.js
// ✅ NEW: Real-time system performance monitoring
import os from "os";
import { redisClient } from "../server.js";
import mongoose from "mongoose";

export const getSystemMetrics = async () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

  const cpus = os.cpus();
  const cpuUsage = cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
    const idle = cpu.times.idle;
    return ((1 - idle / total) * 100).toFixed(2);
  });
  const avgCpuUsage = (
    cpuUsage.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) /
    cpuUsage.length
  ).toFixed(2);

  // Uptime
  const uptime = process.uptime();
  const uptimeFormatted = formatUptime(uptime);

  // MongoDB status
  const mongoStatus =
    mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED";
  const mongoStats =
    mongoose.connection.readyState === 1
      ? await mongoose.connection.db.stats()
      : null;

  // Redis status
  const redisStatus = redisClient.isReady ? "CONNECTED" : "DISCONNECTED";
  const redisInfo = redisClient.isReady ? await redisClient.info() : null;
  const redisMemory = redisInfo
    ? parseRedisInfo(redisInfo, "used_memory_human")
    : "N/A";

  // Active connections (Socket.IO)
  const activeConnections = global.io ? global.io.sockets.sockets.size : 0;

  return {
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: uptimeFormatted,
      uptimeSeconds: Math.floor(uptime),
    },
    cpu: {
      model: cpus[0]?.model || "Unknown",
      cores: cpus.length,
      usage: `${avgCpuUsage}%`,
      perCore: cpuUsage.map((u) => `${u}%`),
    },
    memory: {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
      usagePercent: `${memUsagePercent}%`,
    },
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memoryUsage: {
        rss: formatBytes(process.memoryUsage().rss),
        heapTotal: formatBytes(process.memoryUsage().heapTotal),
        heapUsed: formatBytes(process.memoryUsage().heapUsed),
        external: formatBytes(process.memoryUsage().external),
      },
    },
    database: {
      mongodb: {
        status: mongoStatus,
        size: mongoStats ? formatBytes(mongoStats.dataSize) : "N/A",
        collections: mongoStats ? mongoStats.collections : 0,
        indexes: mongoStats ? mongoStats.indexes : 0,
      },
      redis: {
        status: redisStatus,
        memory: redisMemory,
      },
    },
    connections: {
      active: activeConnections,
      socketIO: global.io ? "RUNNING" : "NOT_INITIALIZED",
    },
    timestamp: new Date().toISOString(),
  };
};

// ✅ Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ✅ Format uptime to human readable
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

// ✅ Parse Redis INFO output
function parseRedisInfo(info, key) {
  const lines = info.split("\r\n");
  for (const line of lines) {
    if (line.startsWith(key)) {
      return line.split(":")[1];
    }
  }
  return "N/A";
}

// ✅ Get performance history (cached in Redis)
export const getPerformanceHistory = async () => {
  try {
    const history = await redisClient.lRange("system:metrics:history", 0, 59);
    return history.map((item) => JSON.parse(item));
  } catch (error) {
    console.error("❌ Get performance history error:", error);
    return [];
  }
};

// ✅ Store current metrics in history
export const storeMetrics = async () => {
  try {
    const metrics = await getSystemMetrics();
    const simplified = {
      timestamp: metrics.timestamp,
      cpu: parseFloat(metrics.cpu.usage),
      memory: parseFloat(metrics.memory.usagePercent),
      connections: metrics.connections.active,
    };

    await redisClient.rPush(
      "system:metrics:history",
      JSON.stringify(simplified)
    );
    await redisClient.lTrim("system:metrics:history", -60, -1); // Keep last 60 entries
  } catch (error) {
    console.error("❌ Store metrics error:", error);
  }
};

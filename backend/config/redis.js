import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("❌ Redis max retries reached");
        return new Error("Redis connection failed");
      }
      return retries * 100;
    },
  },
});

redisClient.on("error", (err) => console.error("❌ Redis Error:", err));
redisClient.on("connect", () => console.log("🔗 Redis Connecting..."));
redisClient.on("ready", () => console.log("✅ Redis Connected & Ready"));
redisClient.on("reconnecting", () => console.log("🔄 Redis Reconnecting..."));

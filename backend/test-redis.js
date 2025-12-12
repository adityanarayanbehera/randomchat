// backend/test-redis.js
import "dotenv/config";
import Redis from "ioredis";
import fs from "fs";

const resultFile = "redis-status.txt";

// Create client with timeout
const redis = new Redis(process.env.REDIS_URL, {
  connectTimeout: 5000,
  maxRetriesPerRequest: 1
});

redis.on("error", (err) => {
    console.error("Redis Client Error", err);
    try { fs.writeFileSync(resultFile, `❌ Error: ${err.message}`); } catch(e){}
    // Don't exit immediately, let the promise catch handle it or it will crash hard
});

(async () => {
  try {
    console.log("Connecting...");
    await redis.set("upstash_check", "ioredis_works");
    const val = await redis.get("upstash_check");
    await redis.quit();
    
    if (val === "ioredis_works") {
        fs.writeFileSync(resultFile, "✅ Success: Connected to Upstash Redis (via ioredis) and verified.");
        console.log("Test Passed");
    } else {
         fs.writeFileSync(resultFile, `⚠️ Connected but value mismatch. Got: ${val}`);
    }
  } catch (e) {
    console.error("Script Error:", e);
    fs.writeFileSync(resultFile, `❌ Exception: ${e.message}`);
    process.exit(1);
  }
})();

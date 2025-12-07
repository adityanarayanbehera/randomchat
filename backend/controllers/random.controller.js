import { redisClient } from "../config/redis.js";
import User from "../models/User.model.js";
import Subscription from "../models/subscription.model.js";
import SystemConfig from "../models/SystemConfig.model.js";

export const joinQueue = async (req, res) => {
  try {
    const userId = req.userId;
    const { genderFilter, allowFallback } = req.body;

    // Check if already in queue
    const queue = await redisClient.lRange("queue:global", 0, -1);
    const existing = queue.find((item) => {
      try {
        return JSON.parse(item).userId === userId;
      } catch (e) {
        return false;
      }
    });

    if (existing) {
      return res.status(200).json({ message: "Already in queue" });
    }

    // Fetch User and System Config
    const [user, config] = await Promise.all([
      User.findById(userId),
      SystemConfig.getConfig(),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Check daily limits
    user.checkDailyReset();
    
    // Check subscription for premium features
    let isPremium = false;
    const sub = await Subscription.findOne({
      userId,
      status: "active",
      endDate: { $gt: new Date() },
    });

    if (sub) {
      isPremium = true;
    }

    const dailyLimit = isPremium 
      ? (config.randomChat?.subscribedDailyLimit || 200) 
      : (config.randomChat?.freeDailyLimit || 100);

    // ✅ CRASH PROOF: Safe access
    const matchesToday = user.usageStats?.randomMatchesToday || 0;

    if (matchesToday >= dailyLimit) {
      return res.status(403).json({ 
        message: `Daily match limit reached (${dailyLimit}). Upgrade to Premium for more matches.` 
      });
    }

    // Validate gender filter (premium only)
    let finalGenderFilter = null;
    if (genderFilter && isPremium) {
      if (["male", "female"].includes(genderFilter)) {
        finalGenderFilter = genderFilter;
      }
    }

    const queueEntry = {
      userId,
      joinedAt: Date.now(),
      isPremium,
      genderFilter: finalGenderFilter,
      allowFallback: allowFallback || false,
    };

    await redisClient.rPush("queue:global", JSON.stringify(queueEntry));
    
    // Increment usage stats (optimistic, or do it on actual match)
    // Doing it here prevents spamming queue
    user.usageStats.randomMatchesToday += 1;
    await user.save();

    console.log(`User ${userId} joined random queue (Matches today: ${user.usageStats.randomMatchesToday}/${dailyLimit})`);

    res.status(200).json({ success: true, message: "Joined queue" });
  } catch (error) {
    console.error("Join queue error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const leaveQueue = async (req, res) => {
  try {
    const userId = req.userId;
    const queue = await redisClient.lRange("queue:global", 0, -1);

    const entryToRemove = queue.find((item) => {
      try {
        return JSON.parse(item).userId === userId;
      } catch (e) {
        return false;
      }
    });

    if (entryToRemove) {
      await redisClient.lRem("queue:global", 1, entryToRemove);
    }

    res.status(200).json({ success: true, message: "Left queue" });
  } catch (error) {
    console.error("Leave queue error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

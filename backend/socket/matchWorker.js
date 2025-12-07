// backend/socket/matchWorker.js
// ✅ COMPLETE: Gender filter for premium users with fallback logic

import { redisClient } from "../server.js";
import Chat from "../models/Chat.model.js";
import ChatMeta from "../models/ChatMeta.model.js";
import User from "../models/User.model.js";

const MAX_CACHE_SIZE = 5000;
export const userCache = new Map();
global.userCache = userCache;

const CACHE_TTL = 300000; // 5 min
const QUEUE_TIMEOUT = 30000; // 30 sec
const PREMIUM_WAIT_TIME = 120000; // 2 min for premium users
const MATCH_INTERVAL = 500; // 0.5 sec active
const SLEEP_INTERVAL = 5000; // 5 sec sleep

let matchingInProgress = false;
let matchInterval = null;
let currentInterval = MATCH_INTERVAL;

// ✅ LRU cache eviction
function evictOldCacheEntries() {
  if (userCache.size > MAX_CACHE_SIZE) {
    const toDelete = userCache.size - MAX_CACHE_SIZE;
    const keys = Array.from(userCache.keys()).slice(0, toDelete);
    keys.forEach((key) => userCache.delete(key));
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, cached] of userCache.entries()) {
    if (now - cached.cachedAt > CACHE_TTL * 2) {
      userCache.delete(id);
    }
  }
  evictOldCacheEntries();
}, 300000);

// ========================================================================
// START WORKER
// ========================================================================
export const startMatchWorker = (io) => {
  console.log("⚡ Smart match worker with gender filter starting...");

  const processQueue = async () => {
    if (matchingInProgress) return;
    matchingInProgress = true;

    try {
      const queueSize = await redisClient.lLen("queue:global");

      if (queueSize === 0) {
        if (currentInterval !== SLEEP_INTERVAL) {
          console.log("😴 No users in queue - sleep mode 5s");
          clearInterval(matchInterval);
          currentInterval = SLEEP_INTERVAL;
          matchInterval = setInterval(processQueue, SLEEP_INTERVAL);
        }
        return;
      }

      if (queueSize > 0 && currentInterval !== MATCH_INTERVAL) {
        console.log(`🔥 Queue active (${queueSize}) - fast mode 500ms`);
        clearInterval(matchInterval);
        currentInterval = MATCH_INTERVAL;
        matchInterval = setInterval(processQueue, MATCH_INTERVAL);
      }

      await cleanExpiredEntries(io);
      await processMatching(io);
    } catch (err) {
      console.error("❌ Match worker error:", err);
    } finally {
      matchingInProgress = false;
    }
  };

  matchInterval = setInterval(processQueue, MATCH_INTERVAL);
  console.log("✅ Smart match worker active");

  return () => {
    clearInterval(matchInterval);
    userCache.clear();
    console.log("🛑 Match worker stopped");
  };
};

// ========================================================================
// CLEAN EXPIRED QUEUE ENTRIES
// ========================================================================
async function cleanExpiredEntries(io) {
  try {
    const now = Date.now();
    const data = await redisClient.lRange("queue:global", 0, -1);

    const toRemove = [];
    for (const entry of data) {
      try {
        const parsed = JSON.parse(entry);
        const waitTime =
          parsed.isPremium && parsed.genderFilter
            ? PREMIUM_WAIT_TIME
            : QUEUE_TIMEOUT;

        if (now - parsed.joinedAt > waitTime) {
          toRemove.push(entry);

          // ✅ Send appropriate timeout message
          if (io) {
            if (
              parsed.isPremium &&
              parsed.genderFilter &&
              !parsed.allowFallback
            ) {
              io.to(`user:${parsed.userId}`).emit("match_timeout", {
                message: `No ${parsed.genderFilter} users available. Try again later or enable 'Match anyone if not found' in settings.`,
                type: "gender_not_found",
              });
            } else {
              io.to(`user:${parsed.userId}`).emit("match_timeout", {
                message: "No match found. Please try again.",
                type: "normal_timeout",
              });
            }
          }
          console.log(`⏰ Timeout: ${parsed.userId.substring(0, 8)}`);
        }
      } catch (parseErr) {
        toRemove.push(entry);
      }
    }

    if (toRemove.length > 0) {
      await Promise.all(
        toRemove.map((entry) => redisClient.lRem("queue:global", 1, entry))
      );
    }
  } catch (error) {
    console.error("❌ Clean expired error:", error);
  }
}

// ========================================================================
// PROCESS MATCHING WITH GENDER FILTER
// ========================================================================
async function processMatching(io) {
  try {
    const data = await redisClient.lRange("queue:global", 0, -1);
    if (data.length < 2) return;

    const queue = [];
    for (const entry of data) {
      try {
        queue.push(JSON.parse(entry));
      } catch (e) {
        // Skip invalid entries
      }
    }

    if (queue.length < 2) return;

    const matched = new Set();

    for (let i = 0; i < queue.length - 1; i++) {
      if (matched.has(queue[i].userId)) continue;

      for (let j = i + 1; j < queue.length; j++) {
        if (matched.has(queue[j].userId)) continue;

        try {
          // ✅ Check if both users are online
          const [user1Online, user2Online, areFriends] = await Promise.all([
            isUserOnline(queue[i].userId),
            isUserOnline(queue[j].userId),
            checkIfFriends(queue[i].userId, queue[j].userId),
          ]);

          if (!user1Online || !user2Online || areFriends) continue;

          // ✅ Get full user data for gender check
          const [user1Data, user2Data] = await Promise.all([
            getUserData(queue[i].userId),
            getUserData(queue[j].userId),
          ]);

          if (!user1Data || !user2Data) continue;

          // ✅ GENDER FILTER MATCHING LOGIC
          const canMatch = await checkGenderCompatibility(
            queue[i],
            queue[j],
            user1Data,
            user2Data
          );

          if (!canMatch) continue;

          // ✅ Create match
          await createMatch(io, queue[i], queue[j]);
          matched.add(queue[i].userId);
          matched.add(queue[j].userId);

          // Remove from queue
          await Promise.all([
            redisClient.lRem("queue:global", 1, JSON.stringify(queue[i])),
            redisClient.lRem("queue:global", 1, JSON.stringify(queue[j])),
          ]);

          break;
        } catch (err) {
          console.error("❌ Match create error:", err.message);
        }
      }
    }
  } catch (err) {
    console.error("❌ Process matching error:", err);
  }
}

// ========================================================================
// GENDER COMPATIBILITY CHECK - STRICT VERSION
// ========================================================================
// ✅ Replace this function in matchWorker.js

async function checkGenderCompatibility(
  queueEntry1,
  queueEntry2,
  userData1,
  userData2
) {
  const now = Date.now();

  console.log(`🔍 Checking compatibility:`, {
    user1: {
      id: queueEntry1.userId.substring(0, 8),
      isPremium: queueEntry1.isPremium,
      genderFilter: queueEntry1.genderFilter,
      actualGender: userData1.gender,
      waitTime: Math.floor((now - queueEntry1.joinedAt) / 1000) + "s",
      allowFallback: queueEntry1.allowFallback,
    },
    user2: {
      id: queueEntry2.userId.substring(0, 8),
      isPremium: queueEntry2.isPremium,
      genderFilter: queueEntry2.genderFilter,
      actualGender: userData2.gender,
      waitTime: Math.floor((now - queueEntry2.joinedAt) / 1000) + "s",
      allowFallback: queueEntry2.allowFallback,
    },
  });

  // ✅ User 1 filter check
  const user1HasFilter = queueEntry1.isPremium && queueEntry1.genderFilter;
  const user1WaitedLong = now - queueEntry1.joinedAt > PREMIUM_WAIT_TIME;
  const user1AllowFallback = queueEntry1.allowFallback;

  // ✅ User 2 filter check
  const user2HasFilter = queueEntry2.isPremium && queueEntry2.genderFilter;
  const user2WaitedLong = now - queueEntry2.joinedAt > PREMIUM_WAIT_TIME;
  const user2AllowFallback = queueEntry2.allowFallback;

  // ========================================================================
  // STRICT RULE 1: User 1 has gender filter
  // ========================================================================
  if (user1HasFilter) {
    const user2MatchesFilter = userData2.gender === queueEntry1.genderFilter;

    console.log(`🎯 User1 Filter Check:`, {
      wantsGender: queueEntry1.genderFilter,
      user2Gender: userData2.gender,
      matches: user2MatchesFilter,
      waitedLong: user1WaitedLong,
      canFallback: user1AllowFallback,
    });

    if (!user2MatchesFilter) {
      // ✅ STRICT: Only fallback if waited 2+ min AND fallback enabled
      if (user1WaitedLong && user1AllowFallback) {
        console.log(
          `🔄 User1 FALLBACK MATCH (waited ${Math.floor(
            (now - queueEntry1.joinedAt) / 1000
          )}s)`
        );
        return true;
      }

      console.log(
        `❌ User1 BLOCKED: Gender mismatch (wants ${queueEntry1.genderFilter}, found ${userData2.gender})`
      );
      return false;
    }

    console.log(`✅ User1 FILTER PASSED: Found ${queueEntry1.genderFilter}`);
  }

  // ========================================================================
  // STRICT RULE 2: User 2 has gender filter
  // ========================================================================
  if (user2HasFilter) {
    const user1MatchesFilter = userData1.gender === queueEntry2.genderFilter;

    console.log(`🎯 User2 Filter Check:`, {
      wantsGender: queueEntry2.genderFilter,
      user1Gender: userData1.gender,
      matches: user1MatchesFilter,
      waitedLong: user2WaitedLong,
      canFallback: user2AllowFallback,
    });

    if (!user1MatchesFilter) {
      // ✅ STRICT: Only fallback if waited 2+ min AND fallback enabled
      if (user2WaitedLong && user2AllowFallback) {
        console.log(
          `🔄 User2 FALLBACK MATCH (waited ${Math.floor(
            (now - queueEntry2.joinedAt) / 1000
          )}s)`
        );
        return true;
      }

      console.log(
        `❌ User2 BLOCKED: Gender mismatch (wants ${queueEntry2.genderFilter}, found ${userData1.gender})`
      );
      return false;
    }

    console.log(`✅ User2 FILTER PASSED: Found ${queueEntry2.genderFilter}`);
  }

  // ========================================================================
  // RULE 3: No filters OR both filters passed
  // ========================================================================
  if (!user1HasFilter && !user2HasFilter) {
    console.log(`✅ NO FILTERS: Both free users - match allowed`);
  } else {
    console.log(`✅ ALL FILTERS PASSED: Match allowed`);
  }

  return true;
}
// ========================================================================
// CHECK ONLINE PRESENCE
// ========================================================================
async function isUserOnline(userId) {
  try {
    const [presence, sockets] = await Promise.all([
      redisClient.get(`presence:${userId}`),
      redisClient.sMembers(`user:sockets:${userId}`),
    ]);

    return presence === "online" && sockets.length > 0;
  } catch (error) {
    console.error("❌ Check online error:", error);
    return false;
  }
}

// ========================================================================
// CHECK FRIENDSHIP
// ========================================================================
async function checkIfFriends(userId1, userId2) {
  try {
    const user = await User.findById(userId1).select("friends").lean();
    return user?.friends?.some((id) => id.toString() === userId2) || false;
  } catch (error) {
    console.error("❌ Check friends error:", error);
    return false;
  }
}

// ========================================================================
// CREATE MATCH + AUTO INTRO
// ========================================================================
async function createMatch(io, u1, u2) {
  const start = Date.now();

  try {
    const [user1, user2] = await Promise.all([
      getUserData(u1.userId),
      getUserData(u2.userId),
    ]);

    if (!user1 || !user2) {
      console.log("❌ Invalid user data");
      return;
    }

    const chat = await Chat.create({
      participants: [u1.userId, u2.userId],
      isFriendChat: false,
      messages: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const chatId = chat._id.toString();

    try {
      await ChatMeta.insertMany(
        [
          {
            chatId,
            userId: u1.userId,
            unreadCount: 0,
            lastMessageAt: new Date(),
          },
          {
            chatId,
            userId: u2.userId,
            unreadCount: 0,
            lastMessageAt: new Date(),
          },
        ],
        { ordered: false }
      );
    } catch (error) {
      if (error.code !== 11000) {
        console.error("❌ ChatMeta creation error:", error.message);
      }
    }

    await Promise.all([
      redisClient.hSet(`room:${chatId}`, {
        roomId: chatId,
        user1: u1.userId,
        user2: u2.userId,
        createdAt: Date.now().toString(),
      }),
      redisClient.expire(`room:${chatId}`, 3600),
    ]);

    io.to(`user:${u1.userId}`).emit("matched", {
      roomId: chatId,
      partner: {
        _id: user2._id,
        username: user2.username,
        gender: user2.gender,
        avatar: user2.avatar,
      },
    });

    io.to(`user:${u2.userId}`).emit("matched", {
      roomId: chatId,
      partner: {
        _id: user1._id,
        username: user1.username,
        gender: user1.gender,
        avatar: user1.avatar,
      },
    });

    console.log(`⚡ Match created in ${Date.now() - start}ms: ${chatId}`);

    const joinedUsers = new Set();
    const joinTimeout = setTimeout(() => {
      sendIntroMessages(io, chatId, u1, u2, user1, user2);
    }, 3000);

    const checkReady = (userId) => {
      joinedUsers.add(userId);
      if (joinedUsers.has(u1.userId) && joinedUsers.has(u2.userId)) {
        clearTimeout(joinTimeout);
        sendIntroMessages(io, chatId, u1, u2, user1, user2);
      }
    };

    io.once(`joined:${chatId}:${u1.userId}`, () => checkReady(u1.userId));
    io.once(`joined:${chatId}:${u2.userId}`, () => checkReady(u2.userId));
  } catch (err) {
    console.error("❌ Create match error:", err);
  }
}

// ========================================================================
// SEND INTRO MESSAGES
// ========================================================================
async function sendIntroMessages(io, chatId, u1, u2, user1, user2) {
  try {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    if (user1?.introMessage) {
      await delay(300);
      await sendAutoIntroMessage(
        io,
        chatId,
        u1.userId,
        user1.username,
        user1.introMessage
      );
    }

    if (user2?.introMessage) {
      await delay(600);
      await sendAutoIntroMessage(
        io,
        chatId,
        u2.userId,
        user2.username,
        user2.introMessage
      );
    }
  } catch (error) {
    console.error("❌ Auto intro message error:", error);
  }
}

// ========================================================================
// AUTO INTRO MESSAGE SENDER
// ========================================================================
async function sendAutoIntroMessage(
  io,
  chatId,
  userId,
  username,
  introMessage
) {
  try {
    const messageId = `intro_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const message = {
      id: messageId,
      chatId,
      sender: userId,
      text: introMessage || "Hello",
      timestamp: Date.now(),
      type: "text",
      isIntroMessage: true,
    };

    try {
      await redisClient.rPush(
        `chat:messages:${chatId}`,
        JSON.stringify(message)
      );
      await redisClient.lTrim(`chat:messages:${chatId}`, -200, -1);
    } catch (redisErr) {
      console.error("❌ Redis cache error:", redisErr);
    }

    io.to(`chat:${chatId}`).emit("message", message);
    console.log(`💬 Auto intro sent: "${introMessage}" from ${username}`);
  } catch (error) {
    console.error("❌ Send intro message error:", error);
  }
}

// ========================================================================
// GET USER DATA (with caching)
// ========================================================================
async function getUserData(id) {
  try {
    if (userCache.has(id)) {
      const cached = userCache.get(id);
      if (Date.now() - cached.cachedAt < CACHE_TTL) {
        return cached.data;
      }
    }

    const cached = await redisClient.hGetAll(`user_cache:${id}`);
    if (cached && cached.username) {
      const data = {
        _id: id,
        username: cached.username,
        gender: cached.gender,
        avatar: cached.avatar || null,
        introMessage: cached.introMessage || "Hello",
      };

      userCache.set(id, { data, cachedAt: Date.now() });
      evictOldCacheEntries();
      return data;
    }

    const user = await User.findById(id)
      .select("username gender avatar introMessage")
      .lean();

    if (!user) {
      console.log(`⚠️ User not found: ${id}`);
      return null;
    }

    userCache.set(id, { data: user, cachedAt: Date.now() });
    evictOldCacheEntries();

    await Promise.all([
      redisClient.hSet(`user_cache:${id}`, {
        username: user.username,
        gender: user.gender,
        avatar: user.avatar || "",
        introMessage: user.introMessage || "Hello",
      }),
      redisClient.expire(`user_cache:${id}`, 3600),
    ]);

    return user;
  } catch (error) {
    console.error("❌ Get user data error:", error);
    return null;
  }
}

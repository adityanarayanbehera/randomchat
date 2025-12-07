import rateLimit from "express-rate-limit";

// General API rate limit - 100 requests per minute
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // Max 100 requests per minute per IP
  message: {
    error: "Too many requests, please slow down",
    retryAfter: 60,
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/api/health";
  },
});

// Strict limit for auth routes - 10 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 attempts per 15 minutes
  message: {
    error: "Too many login attempts, try again later",
    retryAfter: 900,
  },
  skipFailedRequests: false, // Count failed attempts too
});

// Strict limit for chat creation - 20 per 5 minutes
export const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: 20, // Max 20 chat creations per 5 minutes
  message: {
    error: "Too many chat requests, please slow down",
    retryAfter: 300,
  },
});

// File upload limit - 10 per minute
export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // Max 10 uploads per minute
  message: {
    error: "Too many upload requests, please slow down",
    retryAfter: 60,
  },
});

// Premium tier higher limits
export const premiumLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 200, // Premium users get 200 requests per minute
  message: {
    error: "Rate limit exceeded",
    retryAfter: 60,
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? req.user._id : req.ip;
  },
});

// Performance monitoring middleware
// backend/middleware/performance.js

export const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  
  // Track response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Log slow requests (>500ms)
    if (duration > 500) {
      console.warn(`⚠️ SLOW REQUEST: ${method} ${path} - ${duration}ms (${statusCode})`);
    }
    
    // Log errors
    if (statusCode >= 500) {
      console.error(`❌ SERVER ERROR: ${method} ${path} - ${duration}ms (${statusCode})`);
    }
    
    // Log all requests in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = statusCode < 400 ? '✅' : statusCode < 500 ? '⚠️' : '❌';
      console.log(`${emoji} ${method} ${path} - ${duration}ms (${statusCode})`);
    }
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production' && duration > 1000) {
      // TODO: Send to monitoring service (Datadog, New Relic, etc.)
      // Example: sendToMonitoring({ method, path, duration, statusCode });
    }
  });
  
  next();
};

// Request rate limiter (prevent abuse)
const requestCounts = new Map();

export const rateLimiter = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const userId = req.userId || req.ip;
    const now = Date.now();
    
    if (!requestCounts.has(userId)) {
      requestCounts.set(userId, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    const userLimit = requestCounts.get(userId);
    
    if (now > userLimit.resetAt) {
      // Reset window
      requestCounts.set(userId, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    if (userLimit.count >= maxRequests) {
      console.warn(`⚠️ Rate limit exceeded for ${userId}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }
    
    userLimit.count++;
    next();
  };
};

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of requestCounts.entries()) {
    if (now > data.resetAt + 60000) { // 1 minute past reset
      requestCounts.delete(userId);
    }
  }
}, 300000);

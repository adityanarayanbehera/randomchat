// Simple in-memory cache for API requests
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

export const cachedFetch = async (url, options = {}) => {
  const cacheKey = url + JSON.stringify(options);

  // Check if request already in flight
  if (requestCache.has(cacheKey)) {
    const cached = requestCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("🎯 Using cached request:", url);
      return cached.promise; // Return existing promise
    }
  }

  // Make new request
  const promise = fetch(url, options).then((res) => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  });
  n.catch((err) => {
    requestCache.delete(cacheKey); // Clear on error
    throw err;
  });

  requestCache.set(cacheKey, {
    promise,
    timestamp: Date.now(),
  });

  return promise;
};

// Clear old cache entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      requestCache.delete(key);
    }
  }
}, 60000);

// Clear specific cache entry
export const clearCache = (url, options = {}) => {
  const cacheKey = url + JSON.stringify(options);
  requestCache.delete(cacheKey);
};

// Clear all cache
export const clearAllCache = () => {
  requestCache.clear();
};

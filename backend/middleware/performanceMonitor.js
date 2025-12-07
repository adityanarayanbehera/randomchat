// Performance monitoring middleware
export const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  const startMemory = process.memoryUsage();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const endMemory = process.memoryUsage();

    // Log slow queries
    if (duration > 1000) {
      console.warn(
        `⚠️ Slow query detected: ${req.method} ${req.path} took ${duration}ms`
      );
    }

    // Log API performance
    console.log(
      `📊 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );

    // Memory usage tracking
    const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;
    if (memoryDiff > 10 * 1024 * 1024) {
      // 10MB threshold
      console.warn(
        `🚨 High memory usage: ${(memoryDiff / 1024 / 1024).toFixed(
          2
        )}MB allocated`
      );
    }
  });

  // Track database queries
  req.startTime = start;

  next();
};

// Database query monitoring
export const monitorDBQueries = (req, res, next) => {
  const originalQuery = mongoose.Model.find;

  mongoose.Model.find = function (...args) {
    const queryStart = Date.now();
    const query = originalQuery.apply(this, args);

    query.exec = function (callback) {
      const execStart = Date.now();
      const result = this.constructor.prototype.exec.call(this, callback);

      result.then(() => {
        const duration = Date.now() - execStart;
        if (duration > 500) {
          console.warn(
            `🐌 Slow DB query: ${duration}ms - ${this.model.modelName}`
          );
        }
      });

      return result;
    };

    return query;
  };

  next();
};

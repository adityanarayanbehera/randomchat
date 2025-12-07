// backend/middleware/adminAuth.js
// ✅ NEW: Enhanced admin authentication with secret code
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.model.js";
import AdminLog from "../models/AdminLog.model.js";

/**
 * Verify admin JWT token
 */
export const verifyAdminToken = async (req, res, next) => {
  try {
    const token =
      req.cookies.adminToken || req.headers.authorization?.split(" ")[1];

    console.log("🔐 Admin auth check:", {
      hasCookie: !!req.cookies.adminToken,
      hasAuthHeader: !!req.headers.authorization,
      path: req.path,
    });

    if (!token) {
      console.log("❌ No admin token found");
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.adminId || !decoded.role) {
      console.log("❌ Invalid token structure");
      return res.status(401).json({
        success: false,
        message: "Invalid admin token",
      });
    }

    // Get admin details
    const admin = await Admin.findById(decoded.adminId);

    if (!admin) {
      console.log("❌ Admin not found:", decoded.adminId);
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (!admin.isActive) {
      console.log("❌ Admin account deactivated:", admin.email);
      return res.status(403).json({
        success: false,
        message: "Admin account is deactivated",
      });
    }

    // Attach to request
    req.adminId = admin._id;
    req.adminRole = admin.role;
    req.adminPermissions = admin.permissions;

    console.log("✅ Admin authenticated:", {
      adminId: admin._id,
      role: admin.role,
      email: admin.email,
    });

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.log("❌ Token expired");
      return res.status(401).json({
        success: false,
        message: "Admin session expired",
      });
    }

    console.error("❌ Admin auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Admin authentication failed",
    });
  }
};

/**
 * Check specific permission
 */
export const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (req.adminRole === "super_admin") {
        return next(); // Super admin has all permissions
      }

      if (!req.adminPermissions || !req.adminPermissions[permission]) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          required: permission,
        });
      }

      next();
    } catch (error) {
      console.error("❌ Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Permission check failed",
      });
    }
  };
};

/**
 * Log admin action
 */
export const logAdminAction = (action) => {
  return async (req, res, next) => {
    try {
      const originalJson = res.json.bind(res);

      res.json = async function (data) {
        // Log action after response
        setImmediate(async () => {
          try {
            // ✅ FIX: Check if adminId exists before logging
            if (!req.adminId) {
              console.warn("⚠️ No adminId found for logging");
              return;
            }

            await AdminLog.create({
              adminId: req.adminId,
              action,
              targetUserId: req.params.userId || req.body.userId || null,
              details: req.body?.reason || req.body?.details || "",
              metadata: {
                params: req.params || {},
                query: req.query || {},
                body: req.body ? sanitizeBody(req.body) : {},
              },
              ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
              userAgent: req.headers?.["user-agent"] || "unknown",
              status: data?.success ? "SUCCESS" : "FAILED",
            });
          } catch (logError) {
            console.error("❌ Log admin action error:", logError.message);
          }
        });

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("❌ Log middleware error:", error);
      next();
    }
  };
};

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeBody(body) {
  const sanitized = { ...body };
  const sensitiveFields = ["password", "secretCode", "token"];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "***REDACTED***";
    }
  }

  return sanitized;
}

/**
 * Rate limiter for admin actions
 */
export const adminRateLimiter = (maxAttempts = 10, windowMs = 60000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.adminId}:${req.path}`;
    const now = Date.now();

    if (!attempts.has(key)) {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key);
    const recentAttempts = userAttempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down.",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
};

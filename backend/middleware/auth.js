// backend/middleware/auth.js
// ✅ FIXED: Applied Food Delivery middleware pattern exactly
import jwt from "jsonwebtoken";

/**
 * User Authentication Middleware
 * ✅ MODIFIED: Applied Food Delivery pattern with detailed logging
 */
export const isAuth = async (req, res, next) => {
  try {
    // ✅ MODIFIED: Get token from cookies (Food Delivery pattern)
    const token = req.cookies.token;

    if (!token) {
      console.log("❌ No token found in cookies");
      return res.status(400).json({ message: "Token not found" });
    }

    // ✅ MODIFIED: Verify token (Food Delivery pattern)
    const decodeToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!decodeToken || !decodeToken.userId) {
      console.log("❌ Invalid token structure");
      return res.status(400).json({ message: "Token not valid" });
    }

    // ✅ MODIFIED: Attach userId to request (Food Delivery pattern)
    req.userId = decodeToken.userId;
    console.log("✅ Auth successful for user:", req.userId);

    next();
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    return res.status(500).json({ message: "Authentication failed" });
  }
};

/**
 * Admin Authentication Middleware
 * ✅ KEPT: For admin panel functionality
 */
export const isAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.adminToken;

    if (!token) {
      console.log("❌ No admin token found");
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.role) {
      console.log("❌ Invalid admin token");
      return res.status(401).json({ message: "Invalid admin token" });
    }

    // ✅ KEPT: Check admin role
    if (!["super_admin", "moderator", "support"].includes(decoded.role)) {
      console.log("❌ Insufficient permissions");
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    req.adminId = decoded.adminId;
    req.adminRole = decoded.role;
    console.log("✅ Admin auth successful:", req.adminId);

    next();
  } catch (error) {
    console.error("❌ Admin auth error:", error.message);
    return res.status(401).json({ message: "Admin authentication failed" });
  }
};

// backend/utils/token.js
// ✅ FIXED: Applied Food Delivery pattern exactly
import jwt from "jsonwebtoken";

/**
 * Generate JWT Token
 * ✅ MODIFIED: Applied Food Delivery pattern exactly
 */
const genToken = async (userId) => {
  try {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log("✅ Token generated for user:", userId);
    return token;
  } catch (error) {
    console.error("❌ Token generation error:", error);
    throw error;
  }
};

export default genToken;

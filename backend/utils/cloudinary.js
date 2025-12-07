// ==========================================
// FILE 1: backend/utils/cloudinary.js
// ✅ FIXED: Retry logic + Better timeout handling
// ==========================================

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // ✅ Increase timeout to 60 seconds
  timeout: 60000,
});

/**
 * ✅ Upload to Cloudinary with retry mechanism
 * @param {string} dataURI - Base64 image string
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<string>} - Cloudinary URL
 */
export const uploadToCloudinary = async (dataURI, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`☁️ Cloudinary upload attempt ${attempt}/${maxRetries}...`);

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "random-chat",
        resource_type: "image",
        // ✅ Aggressive optimization to reduce upload size
        quality: "auto:low", // Smaller files upload faster
        fetch_format: "auto",
        transformation: [
          { width: 1080, height: 1080, crop: "limit" },
          { quality: "auto:low" },
        ],
        flags: "progressive",
        // ✅ Important: Set timeout per request
        timeout: 60000,
      });

      const uploadedSize = (result.bytes / 1024).toFixed(2);
      console.log(
        `✅ Cloudinary upload success: ${uploadedSize} KB (attempt ${attempt})`
      );

      return result.secure_url;
    } catch (error) {
      lastError = error;
      console.error(`❌ Cloudinary attempt ${attempt} failed:`, error.message);

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`⏳ Retrying in ${waitTime / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // All attempts failed
  console.error(`❌ All ${maxRetries} upload attempts failed`);
  throw new Error(
    `Failed to upload after ${maxRetries} attempts: ${lastError.message}`
  );
};

export default cloudinary;

// ==========================================
// FILE 2: backend/controllers/upload.controller.js
// ✅ FIXED: Better compression + Error handling
// ==========================================

import { uploadToCloudinary } from "../utils/cloudinary.js";
import multer from "multer";
import sharp from "sharp";
import User from "../models/User.model.js";
import Subscription from "../models/subscription.model.js";
import SystemConfig from "../models/SystemConfig.model.js";

// ✅ Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/heic",
      "image/heif",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/tiff",
    ];

    const ext = file.originalname
      .toLowerCase()
      .slice(file.originalname.lastIndexOf("."));

    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".heic",
      ".heif",
      ".webp",
      ".gif",
      ".bmp",
      ".tiff",
    ];

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      allowedExtensions.includes(ext)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported format: ${file.mimetype}. Please use JPG, PNG, HEIC, or WebP.`
        ),
        false
      );
    }
  },
});

/**
 * ✅ OPTIMIZED IMAGE UPLOAD
 * - Aggressive compression to reduce upload time
 * - Retry logic built-in
 * - Target: 100-300KB final size
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.userId;

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
      ? (config.uploads?.subscribedDailyLimit || 50)
      : (config.uploads?.freeDailyLimit || 10);

    // ✅ CRASH PROOF: Safe access
    const uploadsToday = user.usageStats?.uploadsToday || 0;

    if (uploadsToday >= dailyLimit) {
      return res.status(403).json({
        message: `Daily upload limit reached (${dailyLimit}). Upgrade to Premium for more uploads.`,
      });
    }

    const originalSize = req.file.size / 1024;
    const fileFormat = req.file.mimetype.split("/")[1] || "unknown";

    console.log(
      `📥 Received ${fileFormat.toUpperCase()}: ${originalSize.toFixed(2)} KB`
    );

    // ✅ STEP 1: Get metadata
    let imageProcessor = sharp(req.file.buffer);
    const metadata = await imageProcessor.metadata();
    console.log(`📐 Original dimensions: ${metadata.width}x${metadata.height}`);

    // ✅ STEP 2: Aggressive compression for faster uploads
    const compressedBuffer = await imageProcessor
      // Resize to WhatsApp-like dimensions
      .resize(1024, 1024, {
        fit: "inside",
        withoutEnlargement: true,
      })
      // Convert to JPEG with good compression
      .jpeg({
        quality: 75, // Good balance for fast uploads
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: "4:2:0",
      })
      .withMetadata({
        orientation: metadata.orientation,
      })
      .toBuffer();

    const compressedSize = compressedBuffer.length / 1024;
    const compressionRatio = (
      (1 - compressedSize / originalSize) *
      100
    ).toFixed(1);

    console.log(
      `🗜️ Compressed: ${originalSize.toFixed(2)} KB → ${compressedSize.toFixed(
        2
      )} KB (${compressionRatio}% reduction)`
    );

    // ✅ STEP 3: If still too large, compress more aggressively
    let finalBuffer = compressedBuffer;

    if (compressedSize > 400) {
      console.log("⚠️ Still large, applying extra compression...");

      finalBuffer = await sharp(compressedBuffer)
        .resize(800, 800, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 65, // Lower quality for faster upload
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();

      const finalSize = finalBuffer.length / 1024;
      console.log(
        `🔥 Extra compression: ${compressedSize.toFixed(
          2
        )} KB → ${finalSize.toFixed(2)} KB`
      );
    }

    // ✅ STEP 4: Convert to base64 (smaller is faster)
    const base64 = finalBuffer.toString("base64");
    const dataURI = `data:image/jpeg;base64,${base64}`;

    console.log(
      `📤 Uploading ${(finalBuffer.length / 1024).toFixed(
        2
      )} KB to Cloudinary...`
    );

    // ✅ STEP 5: Upload with retry logic (max 3 attempts)
    const url = await uploadToCloudinary(dataURI, 3);

    console.log(`✅ Upload complete: ${url}`);

    // Increment usage stats
    user.usageStats.uploadsToday += 1;
    await user.save();

    // ✅ CRITICAL: Return response in format frontend expects
    res.status(200).json({
      success: true,
      url, // ✅ Frontend checks for this
      stats: {
        originalFormat: fileFormat.toUpperCase(),
        originalSize: `${originalSize.toFixed(2)} KB`,
        compressedSize: `${(finalBuffer.length / 1024).toFixed(2)} KB`,
        compressionRatio: `${compressionRatio}%`,
        dimensions: `${metadata.width}x${metadata.height}`,
      },
    });
  } catch (error) {
    console.error("❌ Upload error:", error);

    // ✅ User-friendly error messages
    if (
      error.message.includes("timeout") ||
      error.message.includes("Timeout")
    ) {
      return res.status(408).json({
        success: false,
        message:
          "Upload is taking longer than expected. Please check your connection and try again.",
      });
    } else if (error.message.includes("Unsupported")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    } else if (
      error.message.includes("Input buffer") ||
      error.message.includes("corrupted")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or corrupted image file. Please try another image.",
      });
    } else if (error.message.includes("Failed to upload after")) {
      return res.status(503).json({
        success: false,
        message: "Server is experiencing issues. Please try again in a moment.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Upload failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Export multer middleware
export const uploadMiddleware = upload.single("image");

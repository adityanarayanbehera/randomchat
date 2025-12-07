// frontend/src/hooks/useImageUpload.js
// ✅ Reusable hook for all image uploads

import { useState } from "react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (file, options = {}) => {
    // Validate file
    if (!file) {
      toast.error("No file selected");
      return null;
    }

    // ✅ Accept ALL image formats
    const validTypes = [
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

    // Check extension as fallback (iOS issue)
    const ext = file.name.toLowerCase().split(".").pop();
    const validExts = [
      "jpg",
      "jpeg",
      "png",
      "heic",
      "heif",
      "webp",
      "gif",
      "bmp",
      "tiff",
    ];

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast.error(
        "Unsupported file format. Please use JPG, PNG, HEIC, or WebP."
      );
      return null;
    }

    // Size check (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20MB");
      return null;
    }

    const uploadToast = toast.loading("Uploading image...");
    setUploading(true);
    setProgress(10);

    try {
      // ✅ No frontend compression - backend handles it
      const formData = new FormData();
      formData.append("image", file);

      setProgress(30);

      const res = await fetch(`${API_URL}/api/upload/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      setProgress(70);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }

      const data = await res.json();
      setProgress(100);

      // ✅ Show compression stats
      if (data.stats) {
        console.log("📊 Upload stats:", data.stats);
        toast.success(
          `Uploaded! ${data.stats.originalSize} → ${data.stats.compressedSize} (${data.stats.compressionRatio} smaller)`,
          { id: uploadToast, duration: 3000 }
        );
      } else {
        toast.success("Image uploaded!", { id: uploadToast });
      }

      return data.url;
    } catch (error) {
      console.error("❌ Upload error:", error);
      toast.error(error.message || "Upload failed", { id: uploadToast });
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploadImage, uploading, progress };
};

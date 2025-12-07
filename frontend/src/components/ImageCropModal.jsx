// frontend/src/components/ImageCropModal.jsx
// ✅ NEW: Modern image cropper with zoom and rotation
import { useState, useRef, useCallback } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, ZoomIn, ZoomOut, RotateCw, Check } from "lucide-react";

export default function ImageCropModal({ imageFile, onCropComplete, onClose }) {
  const [crop, setCrop] = useState({
    unit: "%",
    width: 90,
    height: 90,
    x: 5,
    y: 5,
    aspect: 1, // Square crop for profile pictures
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Generate preview canvas
  const generatePreview = useCallback(
    async (image, crop, canvas, scale = 1) => {
      if (!crop || !canvas || !image) return;

      const ctx = canvas.getContext("2d");
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelRatio = window.devicePixelRatio;

      canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = "high";

      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;

      const centerX = image.naturalWidth / 2;
      const centerY = image.naturalHeight / 2;

      ctx.save();

      // Move to center, rotate, move back
      ctx.translate(-cropX, -cropY);
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight
      );

      ctx.restore();
    },
    [rotation]
  );

  // Handle crop completion
  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    await generatePreview(imgRef.current, completedCrop, canvas, zoom);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error("Canvas is empty");
          return;
        }
        const croppedFile = new File([blob], "cropped-avatar.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onCropComplete(croppedFile, canvas.toDataURL("image/jpeg"));
      },
      "image/jpeg",
      0.95
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Crop Your Photo
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-4 max-h-[60vh] overflow-auto bg-gray-50 dark:bg-gray-900">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop
          >
            <img
              ref={imgRef}
              src={URL.createObjectURL(imageFile)}
              alt="Crop preview"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease",
              }}
              onLoad={() => setImageLoaded(true)}
              className="max-w-full"
            />
          </ReactCrop>
        </div>

        {/* Hidden preview canvas */}
        <canvas ref={previewCanvasRef} className="hidden" />

        {/* Controls */}
        {imageLoaded && (
          <div className="p-4 border-t dark:border-gray-700 space-y-4">
            {/* Zoom Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Zoom
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <ZoomOut size={20} />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <ZoomIn size={20} />
                </button>
              </div>
            </div>

            {/* Rotation Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rotation
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {rotation}°
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setRotation((rotation - 90) % 360)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <RotateCw size={20} className="transform -scale-x-100" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <RotateCw size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 p-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCropComplete}
            disabled={!completedCrop}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Check size={20} />
            <span>Apply Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
}

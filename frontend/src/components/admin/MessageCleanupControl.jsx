// frontend/src/components/admin/MessageCleanupControl.jsx
import { useState, useEffect } from "react";
import { Save, Plus, Minus, Clock, Info } from "lucide-react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL;

export const MessageCleanupControl = () => {
  const [cleanupDays, setCleanupDays] = useState(6);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/system/config`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch config");

      const data = await res.json();
      setCleanupDays(data.config.messageCleanupDays || 6);
    } catch (error) {
      console.error("Error fetching config:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const res = await fetch(`${API_URL}/api/admin/system/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageCleanupDays: cleanupDays }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save");
      }

      toast.success(
        cleanupDays === 0
          ? "Message cleanup disabled"
          : `Messages will be deleted after ${cleanupDays} days`
      );
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleIncrement = () => {
    if (cleanupDays < 365) {
      setCleanupDays((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (cleanupDays > 0) {
      setCleanupDays((prev) => prev - 1);
    }
  };

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 365) {
      setCleanupDays(value);
    }
  };

  const getNextCleanupTime = () => {
    // Cleanup runs at 3:00 AM IST daily
    const now = new Date();
    const nextCleanup = new Date();
    nextCleanup.setHours(3, 0, 0, 0);

    // If it's past 3 AM today, set for tomorrow
    if (now.getHours() >= 3) {
      nextCleanup.setDate(nextCleanup.getDate() + 1);
    }

    return nextCleanup.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="animate-pulse flex space-x-4">
          <div className="h-12 w-12 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
          <Clock className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Message Auto-Delete
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Automatically delete old messages
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <Info className="text-blue-600 dark  :text-blue-400 mt-0.5" size={18} />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>Cleanup runs daily at <strong>3:00 AM IST</strong></li>
              <li>Set to <strong>0</strong> to disable auto-delete</li>
              <li>Range: <strong>0-365 days</strong></li>
              <li>Affects both friend and group chats</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Days Input with +/- Buttons */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleDecrement}
            disabled={cleanupDays === 0 || saving}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed p-3 rounded-lg transition"
          >
            <Minus size={20} className="text-gray-700 dark:text-gray-300" />
          </button>

          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max="365"
              value={cleanupDays}
              onChange={handleInputChange}
              disabled={saving}
              className="w-24 text-center text-3xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {cleanupDays === 0 ? "Disabled" : cleanupDays === 1 ? "day" : "days"}
            </span>
          </div>

          <button
            onClick={handleIncrement}
            disabled={cleanupDays === 365 || saving}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed p-3 rounded-lg transition"
          >
            <Plus size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Status Text */}
        <div className="text-center">
          {cleanupDays === 0 ? (
            <p className="text-yellow-600 dark:text-yellow-400 font-medium">
              ⚠️ Auto-delete disabled - messages will never be deleted
            </p>
          ) : (
            <p className="text-green-600 dark:text-green-400 font-medium">
              ✓ Messages older than {cleanupDays} {cleanupDays === 1 ? "day" : "days"} will be
              deleted
            </p>
          )}
        </div>

        {/* Next Cleanup Time */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Next cleanup scheduled
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {getNextCleanupTime()}
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 transition shadow-lg"
        >
          <Save size={18} />
          <span>{saving ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className="mt-6 pt-6 border-t dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick presets:
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[0, 7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setCleanupDays(days)}
              disabled={saving}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                cleanupDays === days
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {days === 0 ? "Off" : `${days}d`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

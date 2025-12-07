// frontend/src/pages/admin/MessageCleanupPage.jsx
import { useState, useEffect } from "react";
import { Database, HardDrive } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { MessageCleanupControl } from "../../components/admin/MessageCleanupControl";

const API_URL = import.meta.env.VITE_API_URL;

export const MessageCleanupPage = () => {
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStorageStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStorageStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStorageStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/analytics/overview`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch analytics");

      const data = await res.json();
      setStorageStats(data.metrics.services.mongodb.storage);
    } catch (error) {
      console.error("Error fetching storage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Message Cleanup Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure automatic message deletion and monitor database storage
          </p>
        </div>

        {/* MongoDB Storage Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
              <Database className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                MongoDB Storage Status
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time database usage
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ) : storageStats ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    Storage Used
                  </span>
                  <span className="text-gray-900 dark:text-white font-bold">
                    {storageStats.usedMB} MB / {storageStats.limitMB} MB
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      storageStats.percent > 80
                        ? "bg-red-500"
                        : storageStats.percent > 60
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(storageStats.percent, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0 MB</span>
                  <span>{storageStats.percent.toFixed(1)}% used</span>
                  <span>{storageStats.limitMB} MB</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <HardDrive size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Used
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {storageStats.usedMB} <span className="text-sm font-normal">MB</span>
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Limit
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {storageStats.limitMB} <span className="text-sm font-normal">MB</span>
                  </p>
                </div>
              </div>

              {/* Warning if storage is high */}
              {storageStats.percent > 80 && (
                <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    ⚠️ Storage usage is high. Consider reducing message cleanup days to free up space.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Failed to load storage stats</p>
          )}
        </div>

        {/* Message Cleanup Controller */}
        <MessageCleanupControl />
      </div>
    </AdminLayout>
  );
};

export default MessageCleanupPage;

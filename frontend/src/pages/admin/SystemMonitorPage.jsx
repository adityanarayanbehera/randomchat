// frontend/src/pages/admin/SystemMonitorPage.jsx
// ✅ ENHANCED: Backup (Date-wise), Drive Link, Config & Monitoring
import { useState, useEffect } from "react";
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Database,
  Server,
  Settings,
  Save,
  Download,
  HardDrive,
  Cloud,
  Link as LinkIcon,
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

export default function SystemMonitorPage() {
  // Cleanup State
  const [cleanupStart, setCleanupStart] = useState("");
  const [cleanupEnd, setCleanupEnd] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Restart State
  const [restarting, setRestarting] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Config State
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Backup State
  const [backups, setBackups] = useState([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupType, setBackupType] = useState("FULL");
  const [backupStart, setBackupStart] = useState("");
  const [backupEnd, setBackupEnd] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, backupsRes] = await Promise.all([
        adminApi.getSystemConfig(),
        adminApi.getBackupLogs(),
      ]);

      const configData = await configRes.json();
      const backupsData = await backupsRes.json();

      if (configRes.ok) setConfig(configData.config);
      if (backupsRes.ok) setBackups(backupsData.logs || []);
    } catch (error) {
      console.error("Fetch data error:", error);
      toast.error("Failed to load system data");
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupChats = async () => {
    if (!cleanupStart || !cleanupEnd) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete all chat messages from ${cleanupStart} to ${cleanupEnd}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      const res = await adminApi.cleanupChatData(cleanupStart, cleanupEnd);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      setCleanupStart("");
      setCleanupEnd("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleRestartServer = async () => {
    setRestarting(true);
    try {
      const res = await adminApi.restartServer(true);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      setShowRestartConfirm(false);

      let countdown = 5;
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          toast.loading(`Server restarting in ${countdown}...`, {
            id: "restart",
          });
        } else {
          clearInterval(countdownInterval);
          toast.success("Server restarted! Please refresh the page.", {
            id: "restart",
          });
        }
      }, 1000);
    } catch (error) {
      toast.error(error.message);
      setRestarting(false);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      const res = await adminApi.updateSystemConfig(config);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await adminApi.createBackup(
        backupType,
        "Manual backup via Admin Panel",
        backupStart,
        backupEnd
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success("Backup created successfully");
      fetchData(); // Refresh logs
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = (filename) => {
    window.open(adminApi.downloadBackup(filename.split("/").pop()), "_blank");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <RefreshCw className="animate-spin text-blue-500" size={48} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">System Monitor</h1>
          <p className="text-gray-400 mt-1">
            Data management, backups, and server control
          </p>
        </div>

        {/* ==================== ORIGINAL SECTIONS ==================== */}

        {/* Chat Data Cleanup */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="text-red-500" size={32} />
            <div>
              <h2 className="text-xl font-bold text-white">Chat Data Cleanup</h2>
              <p className="text-sm text-gray-400">
                Delete chat messages within a specific date range
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={cleanupStart}
                onChange={(e) => setCleanupStart(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={cleanupEnd}
                onChange={(e) => setCleanupEnd(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCleanupChats}
            disabled={deleting || !cleanupStart || !cleanupEnd}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {deleting ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={20} />
                <span>Delete Chat Data</span>
              </>
            )}
          </button>
        </div>

        {/* Server Restart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Server className="text-orange-500" size={32} />
            <div>
              <h2 className="text-xl font-bold text-white">Server Restart</h2>
              <p className="text-sm text-gray-400">
                Restart the server to apply updates or free up memory
              </p>
            </div>
          </div>

          {!showRestartConfirm ? (
            <button
              onClick={() => setShowRestartConfirm(true)}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-semibold"
            >
              <RefreshCw size={20} />
              <span>Restart Server</span>
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-white font-medium">
                Are you absolutely sure you want to restart the server?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRestartConfirm(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestartServer}
                  disabled={restarting}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 font-semibold"
                >
                  {restarting ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      <span>Restarting...</span>
                    </>
                  ) : (
                    <span>Yes, Restart Now</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==================== NEW SECTIONS ==================== */}

        {/* Backup System */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <HardDrive className="text-green-500" size={32} />
            <div>
              <h2 className="text-xl font-bold text-white">Data Backup</h2>
              <p className="text-sm text-gray-400">
                Create date-wise backups and manage Google Drive connection
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-3">Create New Backup</h3>
              <div className="space-y-3">
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FULL">Full System Backup</option>
                  <option value="PARTIAL">Partial (Users & Groups only)</option>
                </select>

                {/* Date Range for Backup */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    From Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={backupStart}
                    onChange={(e) => setBackupStart(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    To Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={backupEnd}
                    onChange={(e) => setBackupEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <button
                  onClick={handleCreateBackup}
                  disabled={creatingBackup}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50"
                >
                  {creatingBackup ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  <span>{creatingBackup ? "Creating..." : "Create Backup"}</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-2 bg-gray-700 p-4 rounded-lg overflow-hidden">
              <h3 className="text-white font-medium mb-3">Recent Backups</h3>
              <div className="overflow-y-auto max-h-64">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-600">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Details</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-3 py-4 text-center text-gray-500"
                        >
                          No backups found
                        </td>
                      </tr>
                    ) : (
                      backups.map((backup) => (
                        <tr
                          key={backup._id}
                          className="border-b border-gray-600 hover:bg-gray-600"
                        >
                          <td className="px-3 py-2">
                            {new Date(backup.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">{backup.type}</td>
                          <td className="px-3 py-2">
                            {(backup.size / 1024 / 1024).toFixed(2)} MB
                          </td>
                          <td className="px-3 py-2 truncate max-w-xs">
                            {backup.details}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() =>
                                handleDownloadBackup(backup.fileUrl)
                              }
                              className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                            >
                              <Download size={14} />
                              <span>Download</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* System Configuration */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="text-blue-500" size={32} />
            <div>
              <h2 className="text-xl font-bold text-white">
                System Configuration
              </h2>
              <p className="text-sm text-gray-400">
                Manage limits and system settings
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Drive Link */}
            <div className="md:col-span-2 bg-gray-700 p-4 rounded-lg">
              <h3 className="text-white font-medium border-b border-gray-600 pb-2 mb-4 flex items-center">
                <Cloud className="mr-2 text-blue-400" size={20} />
                Google Drive Connection
              </h3>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Google Drive Folder Link (for manual backup uploads)
                </label>
                <div className="flex items-center space-x-2">
                  <LinkIcon className="text-gray-400" size={18} />
                  <input
                    type="text"
                    value={config?.googleDriveLink || ""}
                    onChange={(e) =>
                      setConfig({ ...config, googleDriveLink: e.target.value })
                    }
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Paste the link to your backup folder here for reference.
                </p>
              </div>
            </div>

            {/* Random Chat Limits */}
            <div className="bg-gray-700 p-4 rounded-lg space-y-4">
              <h3 className="text-white font-medium border-b border-gray-600 pb-2">
                Random Chat Limits (Daily)
              </h3>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Free Users
                </label>
                <input
                  type="number"
                  value={config?.randomChat?.freeDailyLimit || 100}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      randomChat: {
                        ...config.randomChat,
                        freeDailyLimit: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Subscribed Users
                </label>
                <input
                  type="number"
                  value={config?.randomChat?.subscribedDailyLimit || 200}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      randomChat: {
                        ...config.randomChat,
                        subscribedDailyLimit: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Upload Limits */}
            <div className="bg-gray-700 p-4 rounded-lg space-y-4">
              <h3 className="text-white font-medium border-b border-gray-600 pb-2">
                Image Upload Limits (Daily)
              </h3>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Free Users
                </label>
                <input
                  type="number"
                  value={config?.uploads?.freeDailyLimit || 10}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      uploads: {
                        ...config.uploads,
                        freeDailyLimit: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Subscribed Users
                </label>
                <input
                  type="number"
                  value={config?.uploads?.subscribedDailyLimit || 50}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      uploads: {
                        ...config.uploads,
                        subscribedDailyLimit: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Group Limits */}
            <div className="bg-gray-700 p-4 rounded-lg space-y-4">
              <h3 className="text-white font-medium border-b border-gray-600 pb-2">
                Group Creation Limits
              </h3>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Max Groups per User
                </label>
                <input
                  type="number"
                  value={config?.groups?.maxCreationPerDay || 10}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      groups: {
                        ...config.groups,
                        maxCreationPerDay: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Maintenance Mode</h3>
                <p className="text-xs text-gray-400">
                  Disable access for all users
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config?.maintenanceMode || false}
                  onChange={(e) =>
                    setConfig({ ...config, maintenanceMode: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleUpdateConfig}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
            >
              <Save size={20} />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

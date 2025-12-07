// frontend/src/pages/admin/AnalyticsPage.jsx
// ✅ Comprehensive real-time analytics dashboard
import { useState, useEffect } from "react";
import {
  Users,
  MessageSquare,
  Activity,
  Database,
  Wifi,
  Server,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchAnalytics();

    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchAnalytics = async () => {
    try {
      const res = await adminApi.getAnalyticsOverview();
      const data = await res.json();

      if (res.ok) {
        setMetrics(data.metrics);
        setWarnings(data.warnings || []);
      }
    } catch (error) {
      console.error("Fetch analytics error:", error);
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-gray-400 mt-1">Real-time system monitoring</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                autoRefresh
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <Activity size={18} />
              <span>{autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}</span>
            </button>
            <button
              onClick={fetchAnalytics}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <RefreshCw size={18} />
              <span>Refresh Now</span>
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        {warnings.length > 0 && (
          <div className="space-y-3">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  warning.type === "danger"
                    ? "bg-red-900 bg-opacity-20 border-red-500"
                    : "bg-orange-900 bg-opacity-20 border-orange-500"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle
                    className={warning.type === "danger" ? "text-red-500" : "text-orange-500"}
                    size={24}
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{warning.service}</h3>
                    <p className="text-gray-300 text-sm mt-1">{warning.message}</p>
                    <p className="text-gray-400 text-xs mt-2">
                      <strong>Action:</strong> {warning.action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {metrics?.users?.total || 0}
                </p>
                <p className="text-green-400 text-sm mt-2 flex items-center">
                  <TrendingUp size={14} className="mr-1" />
                  +{metrics?.users?.newToday || 0} today
                </p>
              </div>
              <Users className="text-blue-500" size={40} />
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Users</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {metrics?.users?.active || 0}
                </p>
                <p className="text-gray-400 text-sm mt-2">Last 5 minutes</p>
              </div>
              <Activity className="text-green-500" size={40} />
            </div>
          </div>

          {/* Online Users */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Online Now</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {metrics?.users?.online || 0}
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        (metrics?.users?.online || 0) > 400
                          ? "bg-red-500"
                          : (metrics?.users?.online || 0) > 300
                          ? "bg-orange-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(((metrics?.users?.online || 0) / 500) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Target: 500 max</p>
                </div>
              </div>
              <Wifi className="text-purple-500" size={40} />
            </div>
          </div>

          {/* Total Messages */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Messages</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {(metrics?.chats?.messages || 0).toLocaleString()}
                </p>
                <p className="text-blue-400 text-sm mt-2">
                  {(metrics?.chats?.messagesToday || 0).toLocaleString()} today
                </p>
              </div>
              <MessageSquare className="text-yellow-500" size={40} />
            </div>
          </div>
        </div>

        {/* Service Usage Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* MongoDB Usage */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="text-green-500" size={32} />
              <div>
                <h3 className="text-lg font-bold text-white">MongoDB Atlas</h3>
                <p className="text-xs text-gray-400">Free Tier (M0)</p>
              </div>
            </div>

            {/* Storage */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Storage</span>
                <span className="text-white font-medium">
                  {metrics?.services?.mongodb?.storage?.usedMB} MB / 512 MB
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    (metrics?.services?.mongodb?.storage?.percent || 0) > 80
                      ? "bg-red-500"
                      : (metrics?.services?.mongodb?.storage?.percent || 0) > 60
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(metrics?.services?.mongodb?.storage?.percent || 0, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {(metrics?.services?.mongodb?.storage?.percent || 0).toFixed(1)}% used
              </p>
            </div>

            {/* Connections */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Connections</span>
                <span className="text-white font-medium">
                  {metrics?.services?.mongodb?.connections?.current} / 100
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    (metrics?.services?.mongodb?.connections?.percent || 0) > 80
                      ? "bg-red-500"
                      : (metrics?.services?.mongodb?.connections?.percent || 0) > 60
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(metrics?.services?.mongodb?.connections?.percent || 0, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {(metrics?.services?.mongodb?.connections?.percent || 0).toFixed(1)}% used
              </p>
            </div>
          </div>

          {/* WebSocket Connections */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Wifi className="text-purple-500" size={32} />
              <div>
                <h3 className="text-lg font-bold text-white">WebSocket</h3>
                <p className="text-xs text-gray-400">Real-time Connections</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Current Connections</span>
                <span className="text-white font-medium">
                  {metrics?.services?.websocket?.current} / 500
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    (metrics?.services?.websocket?.percent || 0) > 80
                      ? "bg-red-500"
                      : (metrics?.services?.websocket?.percent || 0) > 60
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(metrics?.services?.websocket?.percent || 0, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {(metrics?.services?.websocket?.percent || 0).toFixed(1)}% of target
              </p>
            </div>

            <div className="mt-4 p-3 bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-400">Target Capacity</p>
              <p className="text-2xl font-bold text-white mt-1">500</p>
              <p className="text-xs text-gray-500 mt-1">Concurrent users</p>
            </div>
          </div>

          {/* System Resources */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Server className="text-blue-500" size={32} />
              <div>
                <h3 className="text-lg font-bold text-white">System</h3>
                <p className="text-xs text-gray-400">Server Resources</p>
              </div>
            </div>

            {/* Memory */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Memory</span>
                <span className="text-white font-medium">
                  {metrics?.services?.system?.memory?.usedGB} GB /{" "}
                  {metrics?.services?.system?.memory?.totalGB} GB
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    (metrics?.services?.system?.memory?.percent || 0) > 80
                      ? "bg-red-500"
                      : (metrics?.services?.system?.memory?.percent || 0) > 60
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(metrics?.services?.system?.memory?.percent || 0, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {(metrics?.services?.system?.memory?.percent || 0).toFixed(1)}% used
              </p>
            </div>

            {/* CPU */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">CPU</span>
                <span className="text-white font-medium">
                  {metrics?.services?.system?.cpu?.percent}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-blue-500"
                  style={{
                    width: `${Math.min(parseFloat(metrics?.services?.system?.cpu?.percent) || 0, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {metrics?.services?.system?.cpu?.cores} cores
              </p>
            </div>

            {/* Uptime */}
            <div className="p-3 bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-400">Uptime</p>
              <p className="text-lg font-bold text-white mt-1">
                {Math.floor((metrics?.services?.system?.uptime || 0) / 3600)}h{" "}
                {Math.floor(((metrics?.services?.system?.uptime || 0) % 3600) / 60)}m
              </p>
            </div>
          </div>
        </div>

        {/* User Demographics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">User Demographics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Male Users</span>
                  <span className="text-white font-medium">
                    {metrics?.users?.male} ({((metrics?.users?.male / metrics?.users?.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{
                      width: `${(metrics?.users?.male / metrics?.users?.total) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Female Users</span>
                  <span className="text-white font-medium">
                    {metrics?.users?.female} ({((metrics?.users?.female / metrics?.users?.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-pink-500"
                    style={{
                      width: `${(metrics?.users?.female / metrics?.users?.total) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Premium Users</span>
                  <span className="text-white font-medium">
                    {metrics?.users?.premium} ({((metrics?.users?.premium / metrics?.users?.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-yellow-500"
                    style={{
                      width: `${(metrics?.users?.premium / metrics?.users?.total) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Chat Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg">
                <p className="text-gray-400 text-sm">Total Chats</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {metrics?.chats?.total}
                </p>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <p className="text-gray-400 text-sm">Groups</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {metrics?.chats?.groups}
                </p>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg col-span-2">
                <p className="text-gray-400 text-sm">Messages Today</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {(metrics?.chats?.messagesToday || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
          <CheckCircle size={16} className="text-green-500" />
          <span>All systems operational</span>
          <span className="mx-2">•</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          {autoRefresh && (
            <>
              <span className="mx-2">•</span>
              <span className="flex items-center">
                <Activity size={14} className="mr-1 text-green-500" />
                Auto-refreshing every 30s
              </span>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

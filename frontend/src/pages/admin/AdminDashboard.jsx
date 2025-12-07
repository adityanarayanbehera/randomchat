// frontend/src/pages/admin/AdminDashboardPage.jsx
// Navigation fixed ONLY — everything else untouched.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  Crown,
  MessageCircle,
  Activity,
  RefreshCw,
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import { useAdminStore } from "../../store/useAdminStore";
import AdminLayout from "../../components/admin/AdminLayout";
import StatsCard from "../../components/admin/StatsCard";
import toast from "react-hot-toast";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { admin, stats, setStats } = useAdminStore();

  const [loading, setLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
      return;
    }
    fetchData();
  }, [admin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, metricsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSystemMetrics(),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setSystemMetrics(data.metrics);
      }
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Dashboard refreshed!");
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
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Welcome back, {admin?.name || "Admin"}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} size={20} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={stats?.users?.total || 0}
            icon={Users}
            color="blue"
            trend={`+${stats?.users?.newToday || 0} today`}
          />
          <StatsCard
            title="Registered Users"
            value={stats?.users?.registered || 0}
            icon={UserCheck}
            color="green"
            trend="Registered users"
          />
          <StatsCard
            title="Premium Users"
            value={stats?.users?.premium || 0}
            icon={Crown}
            color="yellow"
            trend="Active subscribers"
          />
          <StatsCard
            title="Active Now"
            value={stats?.users?.active || 0}
            icon={Activity}
            color="purple"
            trend="Last 5 minutes"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* USERS */}
          <button
            onClick={() => navigate("/admin/users")}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6"
          >
            <Users className="text-blue-500 mb-3" size={32} />
            <h3 className="text-xl font-bold text-white">Manage Users</h3>
            <p className="text-gray-400 text-sm mt-1">
              View, ban, or delete users
            </p>
          </button>

          {/* GROUPS */}
          <button
            onClick={() => navigate("/admin/groups")}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6"
          >
            <MessageCircle className="text-green-500 mb-3" size={32} />
            <h3 className="text-xl font-bold text-white">Manage Groups</h3>
            <p className="text-gray-400 text-sm mt-1">Moderate group chats</p>
          </button>

          {/* SYSTEM MONITOR — FIXED */}
          <button
            onClick={() => navigate("/admin/system-monitor")}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6"
          >
            <Activity className="text-purple-500 mb-3" size={32} />
            <h3 className="text-xl font-bold text-white">System Monitor</h3>
            <p className="text-gray-400 text-sm mt-1">Performance & logs</p>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

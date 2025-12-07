// frontend/src/pages/admin/BanManagementPage.jsx
// ✅ Manage all banned users and groups - Revoke bans
import { useState, useEffect } from "react";
import {
  Ban,
  UserCheck,
  CheckCircle,
  RefreshCw,
  Users,
  MessageCircle,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function BanManagementPage() {
  const [bannedUsers, setBannedUsers] = useState([]);
  const [bannedGroups, setBannedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users"); // users or groups
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchBannedData();
  }, [activeTab]);

  const fetchBannedData = async () => {
    setLoading(true);
    try {
      if (activeTab === "users") {
        const res = await fetch(`${API_URL}/api/admin/users/banned`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setBannedUsers(data.users || []);
      } else {
        const res = await fetch(`${API_URL}/api/admin/groups/banned`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setBannedGroups(data.groups || []);
      }
    } catch (error) {
      toast.error("Failed to load banned data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async (userId, username) => {
    if (
      !confirm(
        `Unban user "${username}"? They will be able to use the app again.`
      )
    )
      return;

    setActionLoading(userId);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/unban`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Unban failed");

      toast.success(`User "${username}" unbanned`);
      fetchBannedData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanGroup = async (groupId, groupName) => {
    if (!confirm(`Unban group "${groupName}"? It will be visible again.`))
      return;

    setActionLoading(groupId);
    try {
      const res = await fetch(`${API_URL}/api/admin/groups/${groupId}/unban`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Unban failed");

      toast.success(`Group "${groupName}" unbanned`);
      fetchBannedData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Ban Management</h1>
            <p className="text-gray-400 mt-1">
              Revoke bans for users and groups
            </p>
          </div>
          <button
            onClick={fetchBannedData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 bg-gray-800 rounded-lg p-2 border border-gray-700">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition ${
              activeTab === "users"
                ? "bg-blue-600 text-white"
                : "bg-transparent text-gray-400 hover:bg-gray-700"
            }`}
          >
            <Users size={20} />
            <span>Banned Users</span>
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition ${
              activeTab === "groups"
                ? "bg-blue-600 text-white"
                : "bg-transparent text-gray-400 hover:bg-gray-700"
            }`}
          >
            <MessageCircle size={20} />
            <span>Banned Groups</span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-blue-500" size={48} />
          </div>
        ) : activeTab === "users" ? (
          // Banned Users
          <div className="space-y-3">
            {bannedUsers.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <CheckCircle
                  className="mx-auto text-green-500 mb-4"
                  size={64}
                />
                <h3 className="text-xl font-bold text-white mb-2">
                  No Banned Users
                </h3>
                <p className="text-gray-400">All users are in good standing!</p>
              </div>
            ) : (
              bannedUsers.map((user) => (
                <div
                  key={user._id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between hover:border-gray-600 transition"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold">
                      <Ban size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {user.username}
                      </p>
                      <p className="text-sm text-gray-400">
                        {user.email || "No email"}
                      </p>
                      <p className="text-xs text-red-400 mt-1">
                        Reason: {user.banReason || "No reason provided"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Banned: {new Date(user.bannedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnbanUser(user._id, user.username)}
                    disabled={actionLoading === user._id}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <UserCheck size={18} />
                    <span>Unban</span>
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          // Banned Groups
          <div className="space-y-3">
            {bannedGroups.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <CheckCircle
                  className="mx-auto text-green-500 mb-4"
                  size={64}
                />
                <h3 className="text-xl font-bold text-white mb-2">
                  No Banned Groups
                </h3>
                <p className="text-gray-400">All groups are active!</p>
              </div>
            ) : (
              bannedGroups.map((group) => (
                <div
                  key={group._id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between hover:border-gray-600 transition"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold">
                      <Ban size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{group.name}</p>
                      <p className="text-sm text-gray-400">
                        Owner: {group.owner?.username || "Unknown"}
                      </p>
                      <p className="text-xs text-red-400 mt-1">
                        Reason: {group.banReason || "No reason provided"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Banned: {new Date(group.bannedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnbanGroup(group._id, group.name)}
                    disabled={actionLoading === group._id}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    <span>Unban</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

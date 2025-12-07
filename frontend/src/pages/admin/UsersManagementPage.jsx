// frontend/src/pages/admin/UsersManagementPage.jsx
// ✅ ENHANCED: Advanced filtering, bulk selection, and bulk delete
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Ban,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

export default function UsersManagementPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    gender: "",
    accountType: "", // New: "google", "email", "registered", "anonymous"
    tier: "", 
    inactiveFor: "", 
    banStatus: "", 
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // ... (rest of the code)

            {/* Account Type Filter */}
            <select
              value={filters.accountType}
              onChange={(e) =>
                setFilters({ ...filters, accountType: e.target.value })
              }
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Accounts</option>
              <option value="google">Register with Google</option>
              <option value="email">Registered by Email</option>
              <option value="registered">All Registered Users</option>
              <option value="anonymous">Unregistered/Anonymous</option>
            </select>

  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filters]);

  useEffect(() => {
    // Reset selection when filters change
    setSelectedUsers([]);
    setSelectAll(false);
  }, [filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const res = await adminApi.getUsers(params);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
      setSelectAll(false);
    } else {
      setSelectedUsers(users.map((u) => u._id));
      setSelectAll(true);
    }
  };

  const handleToggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedUsers, userId];
      setSelectedUsers(newSelected);
      if (newSelected.length === users.length) {
        setSelectAll(true);
      }
    }
  };

  const handleDeselectAll = () => {
    setSelectedUsers([]);
    setSelectAll(false);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }

    const message = `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone and will also delete all their chats and messages.`;
    
    if (!confirm(message)) return;

    setBulkDeleting(true);
    try {
      const res = await adminApi.bulkDeleteUsers(selectedUsers);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      toast.success(data.message);
      setSelectedUsers([]);
      setSelectAll(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.message || "Failed to delete users");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBanUser = async (userId, username) => {
    const reason = prompt(`Ban reason for ${username}:`);
    if (!reason) return;

    const duration = parseInt(
      prompt("Ban duration in days (0 for permanent):", "0")
    );
    if (isNaN(duration)) return;

    setActionLoading(userId);
    try {
      const res = await adminApi.banUser(userId, reason, duration);
      if (!res.ok) throw new Error("Ban failed");

      toast.success(`User ${username} banned`);
      fetchUsers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Permanently delete user ${username}? This cannot be undone!`))
      return;

    setActionLoading(userId);
    try {
      const res = await adminApi.deleteUser(userId);
      if (!res.ok) throw new Error("Delete failed");

      toast.success(`User ${username} deleted`);
      fetchUsers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  // Helper to calculate inactive days
  const getInactiveDays = (lastActive) => {
    if (!lastActive) return null;
    const days = Math.floor((Date.now() - new Date(lastActive)) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <p className="text-gray-400 mt-1">{pagination.total} total users</p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Bulk Action Bar */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CheckSquare className="text-blue-400" size={24} />
              <span className="text-white font-medium">
                {selectedUsers.length} user(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDeselectAll}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <X size={16} />
                <span>Deselect All</span>
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete Selected</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              <Filter size={20} />
              <span>Filters</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t border-gray-700">
              {/* Inactive Filter */}
              <select
                value={filters.inactiveFor}
                onChange={(e) =>
                  setFilters({ ...filters, inactiveFor: e.target.value })
                }
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Activity</option>
                <option value="1">Inactive 1+ month</option>
                <option value="2">Inactive 2+ months</option>
                <option value="3">Inactive 3+ months</option>
                <option value="6">Inactive 6+ months</option>
                <option value="12">Inactive 12+ months</option>
              </select>

              {/* Tier Filter */}
              <select
                value={filters.tier}
                onChange={(e) =>
                  setFilters({ ...filters, tier: e.target.value })
                }
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Tiers</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>

              {/* Gender Filter */}
              <select
                value={filters.gender}
                onChange={(e) =>
                  setFilters({ ...filters, gender: e.target.value })
                }
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              {/* Ban Status Filter */}
              <select
                value={filters.banStatus}
                onChange={(e) =>
                  setFilters({ ...filters, banStatus: e.target.value })
                }
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>

              {/* Account Type Filter */}
            <select
              value={filters.accountType}
              onChange={(e) =>
                setFilters({ ...filters, accountType: e.target.value })
              }
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Accounts</option>
              <option value="google">Register with Google</option>
              <option value="email">Registered by Email</option>
              <option value="registered">All Registered Users</option>
              <option value="anonymous">Unregistered/Anonymous</option>
            </select>

              {/* Sort By */}
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters({ ...filters, sortBy: e.target.value })
                }
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="createdAt">Newest First</option>
                <option value="lastActive">Recently Active</option>
                <option value="username">Username A-Z</option>
              </select>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center space-x-2 text-gray-300 hover:text-white transition"
                    >
                      {selectAll ? (
                        <CheckSquare size={20} className="text-blue-400" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <RefreshCw
                        className="animate-spin mx-auto text-blue-500"
                        size={32}
                      />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const inactiveDays = getInactiveDays(user.lastActive);
                    const isInactive = inactiveDays && inactiveDays > 30;
                    
                    return (
                      <tr
                        key={user._id}
                        className={`hover:bg-gray-700 transition ${
                          selectedUsers.includes(user._id) ? "bg-blue-900 bg-opacity-20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleUser(user._id)}
                            className="text-gray-400 hover:text-white transition"
                          >
                            {selectedUsers.includes(user._id) ? (
                              <CheckSquare size={20} className="text-blue-400" />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        </td>

                        {/* User Info */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewProfile(user._id)}
                            className="flex items-center space-x-3 hover:text-blue-400 transition"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt=""
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                user.username[0].toUpperCase()
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-white">
                                {user.username}
                              </p>
                              <p className="text-xs text-gray-400">
                                {user._id.slice(-8)}
                              </p>
                            </div>
                          </button>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4">
                          {user.email ? (
                            <span className="text-gray-300 text-sm">
                              {user.email}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>

                        {/* Gender */}
                        <td className="px-6 py-4">
                          <span className="text-gray-300 capitalize text-sm">
                            {user.gender}
                          </span>
                        </td>

                        {/* Tier */}
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.subscription?.tier === "premium" &&
                              user.subscription?.expiresAt &&
                              new Date(user.subscription.expiresAt) > new Date()
                                ? "bg-yellow-900 text-yellow-200"
                                : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {user.subscription?.tier === "premium" &&
                            user.subscription?.expiresAt &&
                            new Date(user.subscription.expiresAt) > new Date()
                              ? "PREMIUM"
                              : "FREE"}
                          </span>
                        </td>

                        {/* Last Active */}
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {user.lastActive ? (
                              <>
                                <p className={isInactive ? "text-orange-400" : "text-gray-400"}>
                                  {inactiveDays === 0
                                    ? "Today"
                                    : inactiveDays === 1
                                    ? "Yesterday"
                                    : `${inactiveDays} days ago`}
                                </p>
                                {isInactive && (
                                  <p className="text-xs text-orange-500">Inactive</p>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500">Never</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewProfile(user._id)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                              title="View Profile"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleBanUser(user._id, user.username)
                              }
                              disabled={actionLoading === user._id}
                              className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition disabled:opacity-50"
                              title="Ban User"
                            >
                              <Ban size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteUser(user._id, user.username)
                              }
                              disabled={actionLoading === user._id}
                              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-600">
            <div className="text-sm text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} users
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
                disabled={pagination.page === 1}
                className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 py-2 bg-gray-600 rounded-lg text-white">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
                disabled={pagination.page === pagination.pages}
                className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// frontend/src/pages/admin/GroupsManagementPage.jsx
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
  Users,
  Crown,
  Shield,
  Globe,
  Lock,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

export default function GroupsManagementPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    inactiveFor: "", // "1", "2", "6", "12"
    banStatus: "", // "active", "banned"
    sortBy: "lastActivity",
    sortOrder: "desc",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Bulk selection state
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [pagination.page, filters]);

  useEffect(() => {
    // Reset selection when filters change
    setSelectedGroups([]);
    setSelectAll(false);
  }, [filters]);

  const fetchGroups = async () => {
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

      const res = await adminApi.getGroups(params);
      const data = await res.json();

      if (res.ok) {
        setGroups(data.groups || []);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to load groups");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedGroups([]);
      setSelectAll(false);
    } else {
      setSelectedGroups(groups.map((g) => g._id));
      setSelectAll(true);
    }
  };

  const handleToggleGroup = (groupId) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter((id) => id !== groupId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedGroups, groupId];
      setSelectedGroups(newSelected);
      if (newSelected.length === groups.length) {
        setSelectAll(true);
      }
    }
  };

  const handleDeselectAll = () => {
    setSelectedGroups([]);
    setSelectAll(false);
  };

  const handleBulkDelete = async () => {
    if (selectedGroups.length === 0) {
      toast.error("No groups selected");
      return;
    }

    const message = `Are you sure you want to delete ${selectedGroups.length} group(s)? This action cannot be undone and will delete all messages in these groups.`;

    if (!confirm(message)) return;

    setBulkDeleting(true);
    try {
      const res = await adminApi.bulkDeleteGroups(selectedGroups);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      toast.success(data.message);
      setSelectedGroups([]);
      setSelectAll(false);
      fetchGroups();
    } catch (error) {
      toast.error(error.message || "Failed to delete groups");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBanGroup = async (groupId, groupName, isBanned) => {
    if (isBanned) {
      // Unban
      if (!confirm(`Unban group "${groupName}"?`)) return;
      
      setActionLoading(groupId);
      try {
        const res = await adminApi.unbanGroup(groupId);
        if (!res.ok) throw new Error("Unban failed");
        toast.success(`Group "${groupName}" unbanned`);
        fetchGroups();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setActionLoading(null);
      }
    } else {
      // Ban
      const reason = prompt(`Ban reason for "${groupName}":`);
      if (!reason) return;

      setActionLoading(groupId);
      try {
        const res = await adminApi.banGroup(groupId, reason);
        if (!res.ok) throw new Error("Ban failed");
        toast.success(`Group "${groupName}" banned`);
        fetchGroups();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (
      !confirm(
        `Permanently delete group "${groupName}"? This cannot be undone!`
      )
    )
      return;

    setActionLoading(groupId);
    try {
      const res = await adminApi.deleteGroup(groupId);
      if (!res.ok) throw new Error("Delete failed");

      toast.success(`Group "${groupName}" deleted`);
      fetchGroups();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper to calculate inactive days
  const getInactiveDays = (lastActivity) => {
    if (!lastActivity) return null;
    const days = Math.floor(
      (Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Groups Management</h1>
            <p className="text-gray-400 mt-1">
              {pagination.total} total groups
            </p>
          </div>
          <button
            onClick={fetchGroups}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Bulk Action Bar */}
        {selectedGroups.length > 0 && (
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CheckSquare className="text-blue-400" size={24} />
              <span className="text-white font-medium">
                {selectedGroups.length} group(s) selected
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
                placeholder="Search groups by name..."
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
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
                <option value="6">Inactive 6+ months</option>
                <option value="12">Inactive 12+ months</option>
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

              {/* Sort By */}
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters({ ...filters, sortBy: e.target.value })
                }
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="lastActivity">Recently Active</option>
                <option value="createdAt">Newest First</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          )}
        </div>

        {/* Groups Table */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">
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
                ) : groups.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No groups found
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => {
                    const inactiveDays = getInactiveDays(group.lastActivity);
                    const isInactive = inactiveDays && inactiveDays > 30;

                    return (
                      <tr
                        key={group._id}
                        className={`hover:bg-gray-700 transition ${
                          selectedGroups.includes(group._id)
                            ? "bg-blue-900 bg-opacity-20"
                            : ""
                        } ${group.isBanned ? "bg-red-900 bg-opacity-10" : ""}`}
                      >
                        {/* Checkbox */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleGroup(group._id)}
                            className="text-gray-400 hover:text-white transition"
                          >
                            {selectedGroups.includes(group._id) ? (
                              <CheckSquare
                                size={20}
                                className="text-blue-400"
                              />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        </td>

                        {/* Group Info */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              navigate(`/groups/${group._id}/profile`)
                            }
                            className="flex items-center space-x-3 hover:text-blue-400 transition"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold relative">
                              {group.avatar ? (
                                <img
                                  src={group.avatar}
                                  alt=""
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                group.name[0]?.toUpperCase()
                              )}
                              {group.isBanned && (
                                <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5" title="Banned">
                                  <Ban size={12} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-white flex items-center gap-2">
                                {group.name}
                                {group.isBanned && (
                                  <span className="text-xs bg-red-600 px-1.5 py-0.5 rounded text-white">BANNED</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400">
                                {group._id?.slice(-8)}
                              </p>
                            </div>
                          </button>
                        </td>

                        {/* Owner */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Crown size={16} className="text-yellow-500" />
                            <span className="text-gray-300 text-sm">
                              {group.owner?.username || "Unknown"}
                            </span>
                          </div>
                        </td>

                        {/* Members */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Users size={16} className="text-green-500" />
                            <span className="text-gray-300 text-sm">
                              {group.members?.length || 0}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4">
                          {group.isPublic ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-200">
                              <Globe size={12} className="mr-1" />
                              Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                              <Lock size={12} className="mr-1" />
                              Private
                            </span>
                          )}
                        </td>

                        {/* Last Active */}
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {group.lastActivity ? (
                              <>
                                <p
                                  className={
                                    isInactive
                                      ? "text-orange-400"
                                      : "text-gray-400"
                                  }
                                >
                                  {inactiveDays === 0
                                    ? "Today"
                                    : inactiveDays === 1
                                    ? "Yesterday"
                                    : `${inactiveDays} days ago`}
                                </p>
                                {isInactive && (
                                  <p className="text-xs text-orange-500 flex items-center gap-1">
                                    <AlertTriangle size={10} /> Inactive
                                  </p>
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
                              onClick={() =>
                                navigate(`/groups/${group._id}/profile`)
                              }
                              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                              title="View Group"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleBanGroup(
                                  group._id,
                                  group.name,
                                  group.isBanned
                                )
                              }
                              disabled={actionLoading === group._id}
                              className={`p-2 rounded-lg transition disabled:opacity-50 ${
                                group.isBanned
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-yellow-600 hover:bg-yellow-700"
                              }`}
                              title={group.isBanned ? "Unban Group" : "Ban Group"}
                            >
                              {group.isBanned ? (
                                <Shield size={16} />
                              ) : (
                                <Ban size={16} />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteGroup(group._id, group.name)
                              }
                              disabled={actionLoading === group._id}
                              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                              title="Delete Group"
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
              of {pagination.total} groups
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
                disabled={pagination.page === 1}
                className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition disabled:opacity-50"
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
                className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition disabled:opacity-50"
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

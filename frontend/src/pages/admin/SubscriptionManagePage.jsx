// frontend/src/pages/admin/SubscriptionManagePage.jsx
// ✅ ENHANCED: Filters, bulk cancellation, and detailed management
import { useState, useEffect } from "react";
import {
  Crown,
  DollarSign,
  Users,
  TrendingUp,
  Edit2,
  X,
  Check,
  RefreshCw,
  XCircle,
  Filter,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

export default function SubscriptionManagePage() {
  const [subscribedUsers, setSubscribedUsers] = useState([]);
  const [pricing, setPricing] = useState({ monthly: 299, yearly: 1794 });
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState(299);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    paymentType: "", // "paid", "promo"
    status: "", // "active", "expired"
  });
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkCancelling, setBulkCancelling] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    // Reset selection when filters change
    setSelectedUsers([]);
    setSelectAll(false);
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch subscribed users with filters
      const params = { ...filters };
      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const res = await adminApi.getAllSubscriptions(params);
      const data = await res.json();
      if (res.ok) setSubscribedUsers(data.users || []);

      // Fetch current pricing
      const priceRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/subscriptions/pricing`,
        { credentials: "include" }
      );
      const priceData = await priceRes.json();
      if (priceRes.ok) setPricing(priceData.pricing || pricing);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/subscriptions/pricing`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ monthly: newPrice, yearly: newPrice * 6 }),
        }
      );

      if (!res.ok) throw new Error("Update failed");

      setPricing({ monthly: newPrice, yearly: newPrice * 6 });
      setEditingPrice(false);
      toast.success("Pricing updated!");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
      setSelectAll(false);
    } else {
      setSelectedUsers(subscribedUsers.map((u) => u._id));
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
      if (newSelected.length === subscribedUsers.length) {
        setSelectAll(true);
      }
    }
  };

  const handleDeselectAll = () => {
    setSelectedUsers([]);
    setSelectAll(false);
  };

  const handleBulkCancel = async () => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to cancel subscriptions for ${selectedUsers.length} users? They will be downgraded to Free tier immediately.`
      )
    )
      return;

    setBulkCancelling(true);
    try {
      const res = await adminApi.bulkCancelSubscriptions(selectedUsers);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      setSelectedUsers([]);
      setSelectAll(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to cancel subscriptions");
    } finally {
      setBulkCancelling(false);
    }
  };

  const handleCancelSubscription = async (userId, username) => {
    if (!confirm(`Cancel subscription for "${username}"?`)) return;

    setActionLoading(userId);
    try {
      // Use bulk cancel for single user too for consistency, or keep separate endpoint if needed
      // But we'll use the bulk endpoint with one ID for simplicity if the backend supports it, 
      // or use the specific endpoint if it exists.
      // The original code used /cancel/:userId, let's stick to that or use bulk.
      // Actually, let's use the bulk endpoint for consistency if we want, but the original code had a specific endpoint.
      // Let's check if we have a specific cancel endpoint in adminApi... we don't.
      // So we'll use the bulk endpoint for single cancellation too.
      
      const res = await adminApi.bulkCancelSubscriptions([userId]);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success(`Subscription cancelled for ${username}`);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalEarnings = subscribedUsers.reduce((sum, user) => {
    // Only count paid subscriptions for earnings estimation
    if (user.subscription?.paymentId?.startsWith("pay_")) {
        return sum + (pricing.monthly || 299);
    }
    return sum;
  }, 0);

  const monthlyRevenue =
    subscribedUsers.filter((user) => {
      const expiry = new Date(user.subscription?.expiresAt);
      const now = new Date();
      // Only count active paid subscriptions
      return expiry > now && user.subscription?.paymentId?.startsWith("pay_");
    }).length * (pricing.monthly || 299);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Subscription Management
            </h1>
            <p className="text-gray-400 mt-1">
              Manage pricing and subscribed users
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Subscribers */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Users size={32} />
              <Crown size={32} className="opacity-50" />
            </div>
            <p className="text-3xl font-bold">{subscribedUsers.length}</p>
            <p className="text-blue-200 text-sm">Total Premium Users</p>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={32} />
              <DollarSign size={32} className="opacity-50" />
            </div>
            <p className="text-3xl font-bold">
              ₹{monthlyRevenue.toLocaleString()}
            </p>
            <p className="text-green-200 text-sm">Est. Monthly Revenue</p>
          </div>

          {/* Total Earnings */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign size={32} />
              <Crown size={32} className="opacity-50" />
            </div>
            <p className="text-3xl font-bold">
              ₹{totalEarnings.toLocaleString()}
            </p>
            <p className="text-purple-200 text-sm">Total Estimated Earnings</p>
          </div>
        </div>

        {/* Pricing Management */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <DollarSign size={24} className="text-yellow-500" />
            <span>Subscription Pricing</span>
          </h2>

          {editingPrice ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Price (₹)
                </label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="299"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Yearly price will be automatically calculated (Monthly × 6)
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setEditingPrice(false)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  <X size={18} />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleUpdatePrice}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <Check size={18} />
                  <span>Save Price</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm text-gray-400">Monthly</p>
                    <p className="text-2xl font-bold text-white">
                      ₹{pricing.monthly}
                    </p>
                  </div>
                  <div className="h-12 w-px bg-gray-700"></div>
                  <div>
                    <p className="text-sm text-gray-400">Yearly</p>
                    <p className="text-2xl font-bold text-white">
                      ₹{pricing.yearly}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Current subscription pricing (applied to new subscribers)
                </p>
              </div>
              <button
                onClick={() => {
                  setNewPrice(pricing.monthly);
                  setEditingPrice(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Edit2 size={18} />
                <span>Edit Price</span>
              </button>
            </div>
          )}
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
                onClick={handleBulkCancel}
                disabled={bulkCancelling}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {bulkCancelling ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    <span>Cancel Selected</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Subscribed Users</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              <Filter size={20} />
              <span>Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
              {/* Payment Type Filter */}
              <select
                value={filters.paymentType}
                onChange={(e) =>
                  setFilters({ ...filters, paymentType: e.target.value })
                }
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Payment Types</option>
                <option value="paid">Paid Users</option>
                <option value="promo">Promo Code Users</option>
              </select>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          )}
        </div>

        {/* Subscribed Users Table */}
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
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Plan Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Status
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
                ) : subscribedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No subscribed users found
                    </td>
                  </tr>
                ) : (
                  subscribedUsers.map((user) => {
                    const expiry = new Date(user.subscription?.expiresAt);
                    const isExpired = expiry < new Date();
                    const isPromo = user.subscription?.paymentId?.startsWith("PROMO_");

                    return (
                      <tr
                        key={user._id}
                        className={`hover:bg-gray-700 transition ${
                          selectedUsers.includes(user._id)
                            ? "bg-blue-900 bg-opacity-20"
                            : ""
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

                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
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
                            <div>
                              <p className="font-medium text-white">
                                {user.username}
                              </p>
                              <p className="text-xs text-gray-400">
                                {user._id.slice(-8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-300">
                          {user.email || "-"}
                        </td>

                        <td className="px-6 py-4">
                          {isPromo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900 text-purple-200">
                              Promo Code
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200">
                              <Crown size={12} className="mr-1" />
                              Paid
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-300">
                          {expiry.toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-200">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-200">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() =>
                              handleCancelSubscription(user._id, user.username)
                            }
                            disabled={actionLoading === user._id}
                            className="flex items-center space-x-1 ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 text-sm"
                            title="Cancel Subscription"
                          >
                            <XCircle size={14} />
                            <span>Cancel</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

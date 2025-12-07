// frontend/src/components/admin/PromoCodeManager.jsx
// Admin component for managing promo codes
import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Users,
  Calendar,
  TrendingUp,
  Copy,
  Check,
  Loader,
  X,
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import toast from "react-hot-toast";

export default function PromoCodeManager() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [stats, setStats] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    maxUses: "",
    expiresAt: "",
  });

  useEffect(() => {
    fetchPromoCodes();
    fetchStats();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const res = await adminApi.getAllPromoCodes({ search: searchQuery });
      const data = await res.json();
      if (res.ok) {
        setPromoCodes(data.promoCodes);
      }
    } catch (error) {
      console.error("Fetch promo codes error:", error);
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await adminApi.getPromoCodeStats();
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Fetch stats error:", error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.code || !formData.description) {
      toast.error("Code and description are required");
      return;
    }

    try {
      const res = await adminApi.createPromoCode({
        code: formData.code,
        description: formData.description,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        expiresAt: formData.expiresAt || null,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      toast.success("Promo code created successfully!");
      setShowCreateModal(false);
      setFormData({ code: "", description: "", maxUses: "", expiresAt: "" });
      fetchPromoCodes();
      fetchStats();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUpdate = async (codeId, updates) => {
    try {
      const res = await adminApi.updatePromoCode(codeId, updates);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      toast.success("Promo code updated!");
      setEditingCode(null);
      fetchPromoCodes();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (codeId) => {
    if (!confirm("Are you sure you want to deactivate this promo code?")) {
      return;
    }

    try {
      const res = await adminApi.deletePromoCode(codeId);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      toast.success("Promo code deactivated!");
      fetchPromoCodes();
      fetchStats();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Codes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalCodes}
                </p>
              </div>
              <Tag className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Codes
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeCodes}
                </p>
              </div>
              <Check className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Redemptions
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalRedemptions}
                </p>
              </div>
              <TrendingUp className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Expired Codes
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.expiredCodes}
                </p>
              </div>
              <Calendar className="text-orange-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Promo Codes
        </h2>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPromoCodes()}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white w-full sm:w-64"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Create Code</span>
          </button>
        </div>
      </div>

      {/* Promo Codes List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {promoCodes.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No promo codes found
                  </td>
                </tr>
              ) : (
                promoCodes.map((code) => (
                  <tr
                    key={code._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {code.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {copiedCode === code.code ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {code.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Users size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {code.usedCount}
                          {code.maxUses ? ` / ${code.maxUses}` : " / ∞"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {code.expiresAt
                        ? new Date(code.expiresAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          code.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {code.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() =>
                            handleUpdate(code._id, {
                              isActive: !code.isActive,
                            })
                          }
                          className={`p-2 rounded-lg transition ${
                            code.isActive
                              ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900"
                              : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900"
                          }`}
                          title={code.isActive ? "Deactivate" : "Activate"}
                        >
                          {code.isActive ? <X size={18} /> : <Check size={18} />}
                        </button>
                        <button
                          onClick={() => handleDelete(code._id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Create Promo Code
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="SUMMER2024"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Summer promotion 2024"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Uses (optional)
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) =>
                    setFormData({ ...formData, maxUses: e.target.value })
                  }
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      code: "",
                      description: "",
                      maxUses: "",
                      expiresAt: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

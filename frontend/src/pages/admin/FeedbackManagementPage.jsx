// frontend/src/pages/admin/FeedbackManagementPage.jsx
// ✅ Manage user feedback with filters and responses
import { useState, useEffect } from "react";
import {
  MessageSquare,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import AdminLayout from "../../components/admin/AdminLayout";
import toast from "react-hot-toast";

export default function FeedbackManagementPage() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    status: "PENDING",
    type: "",
    priority: "",
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchFeedback();
  }, [pagination.page, filters]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const res = await adminApi.getFeedback(params);
      const data = await res.json();

      if (res.ok) {
        setFeedback(data.feedback);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      toast.error("Failed to load feedback");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (feedbackId, newStatus) => {
    try {
      const res = await adminApi.updateFeedback(feedbackId, {
        status: newStatus,
        adminNotes: adminNotes || undefined,
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success("Feedback updated!");
      setSelectedFeedback(null);
      setAdminNotes("");
      fetchFeedback();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: "bg-yellow-900 text-yellow-200",
      REVIEWING: "bg-blue-900 text-blue-200",
      RESOLVED: "bg-green-900 text-green-200",
      CLOSED: "bg-gray-700 text-gray-300",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      LOW: "bg-gray-700 text-gray-300",
      MEDIUM: "bg-blue-900 text-blue-200",
      HIGH: "bg-orange-900 text-orange-200",
      CRITICAL: "bg-red-900 text-red-200",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority]}`}
      >
        {priority}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Feedback Management
            </h1>
            <p className="text-gray-400 mt-1">
              {pagination.total} total feedback
            </p>
          </div>
          <button
            onClick={fetchFeedback}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Types</option>
                <option value="BUG">Bug</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="COMPLAINT">Complaint</option>
                <option value="SUGGESTION">Suggestion</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin text-blue-500" size={48} />
            </div>
          ) : feedback.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
              <h3 className="text-xl font-bold text-white mb-2">
                No Feedback Found
              </h3>
              <p className="text-gray-400">
                {filters.status
                  ? "Try changing filters"
                  : "No feedback submitted yet"}
              </p>
            </div>
          ) : (
            feedback.map((item) => (
              <div
                key={item._id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {item.subject}
                      </h3>
                      {getStatusBadge(item.status)}
                      {getPriorityBadge(item.priority)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>By: {item.userId?.username || "Unknown User"}</span>
                      <span>•</span>
                      <span>{item.type.replace("_", " ")}</span>
                      <span>•</span>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {item.rating && (
                      <div className="flex items-center space-x-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={
                              i < item.rating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-600"
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setSelectedFeedback(
                        selectedFeedback?._id === item._id ? null : item
                      )
                    }
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {selectedFeedback?._id === item._id
                      ? "Close"
                      : "View Details"}
                  </button>
                </div>

                <p className="text-gray-300 text-sm mb-4">{item.message}</p>

                {selectedFeedback?._id === item._id && (
                  <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                    {/* Admin Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Admin Notes
                      </label>
                      <textarea
                        value={adminNotes || item.adminNotes || ""}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows={3}
                        placeholder="Add notes about this feedback..."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {item.status === "PENDING" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(item._id, "REVIEWING")
                          }
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                        >
                          Mark as Reviewing
                        </button>
                      )}
                      {(item.status === "PENDING" ||
                        item.status === "REVIEWING") && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(item._id, "RESOLVED")
                          }
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
                        >
                          Mark as Resolved
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateStatus(item._id, "CLOSED")}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {feedback.length > 0 && (
          <div className="bg-gray-800 rounded-lg px-6 py-4 flex items-center justify-between border border-gray-700">
            <div className="text-sm text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} feedback
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
                disabled={pagination.page === 1}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 py-2 bg-gray-700 rounded-lg text-white">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
                disabled={pagination.page === pagination.pages}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

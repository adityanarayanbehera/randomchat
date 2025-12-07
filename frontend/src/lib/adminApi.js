
// frontend/src/lib/adminApi.js
// ✅ Complete Admin API methods
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const adminApi = {
  // ==================== AUTH ====================
  login: (email, password, secretCode) =>
    fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, secretCode }),
    }),

  logout: () =>
    fetch(`${API_URL}/api/admin/logout`, {
      method: "POST",
      credentials: "include",
    }),

  getCurrentAdmin: () =>
    fetch(`${API_URL}/api/admin/me`, {
      credentials: "include",
    }),

  // ==================== DASHBOARD ====================
  getStats: () =>
    fetch(`${API_URL}/api/admin/dashboard/stats`, {
      credentials: "include",
    }),

  // ==================== USERS ====================
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/api/admin/users?${query}`, {
      credentials: "include",
    });
  },

  getUserDetails: (userId) =>
    fetch(`${API_URL}/api/admin/users/${userId}`, {
      credentials: "include",
    }),

  banUser: (userId, reason, duration = 0) =>
    fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason, duration }),
    }),

  unbanUser: (userId) =>
    fetch(`${API_URL}/api/admin/users/${userId}/unban`, {
      method: "POST",
      credentials: "include",
    }),

  deleteUser: (userId) =>
    fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: "DELETE",
      credentials: "include",
    }),

  // ==================== GROUPS ====================
  getGroups: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/api/admin/groups?${query}`, {
      credentials: "include",
    });
  },

  deleteGroup: (groupId) =>
    fetch(`${API_URL}/api/admin/groups/${groupId}`, {
      method: "DELETE",
      credentials: "include",
    }),

  bulkDeleteGroups: (groupIds) =>
    fetch(`${API_URL}/api/admin/groups/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ groupIds }),
    }),

  banGroup: (groupId, reason) =>
    fetch(`${API_URL}/api/admin/groups/${groupId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    }),

  unbanGroup: (groupId) =>
    fetch(`${API_URL}/api/admin/groups/${groupId}/unban`, {
      method: "POST",
      credentials: "include",
    }),

  // ==================== SYSTEM ====================
  getSystemMetrics: () =>
    fetch(`${API_URL}/api/admin/system/metrics`, {
      credentials: "include",
    }),

  restartServer: () =>
    fetch(`${API_URL}/api/admin/system/restart`, {
      method: "POST",
      credentials: "include",
    }),

  // ==================== FEEDBACK ====================
  getFeedback: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/api/admin/feedback?${query}`, {
      credentials: "include",
    });
  },

  updateFeedback: (feedbackId, data) =>
    fetch(`${API_URL}/api/admin/feedback/${feedbackId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  // ==================== LOGS ====================
  getLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/api/admin/logs?${query}`, {
      credentials: "include",
    });
  },

  // ==================== REPORTS ====================
  getReports: (status = "pending") =>
    fetch(`${API_URL}/api/admin/reports?status=${status}`, {
      credentials: "include",
    }),

  updateReport: (reportId, status) =>
    fetch(`${API_URL}/api/admin/reports/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    }),

  // ==================== PROMO CODES ====================
  createPromoCode: (data) =>
    fetch(`${API_URL}/api/admin/promo-codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  getAllPromoCodes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/api/admin/promo-codes?${query}`, {
      credentials: "include",
    });
  },

  getPromoCodeDetails: (codeId) =>
    fetch(`${API_URL}/api/admin/promo-codes/${codeId}`, {
      credentials: "include",
    }),

  updatePromoCode: (codeId, data) =>
    fetch(`${API_URL}/api/admin/promo-codes/${codeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  deletePromoCode: (codeId) =>
    fetch(`${API_URL}/api/admin/promo-codes/${codeId}`, {
      method: "DELETE",
      credentials: "include",
    }),

  getPromoCodeStats: () =>
    fetch(`${API_URL}/api/admin/promo-codes/stats`, {
      credentials: "include",
    }),

  // ==================== BULK OPERATIONS ====================
  bulkDeleteUsers: (userIds) =>
    fetch(`${API_URL}/api/admin/users/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userIds }),
    }),

  // ==================== SUBSCRIPTIONS ====================
  getAllSubscriptions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/api/admin/subscriptions/all?${query}`, {
      credentials: "include",
    });
  },

  bulkCancelSubscriptions: (userIds) =>
    fetch(`${API_URL}/api/admin/subscriptions/bulk-cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userIds }),
    }),

  // ==================== ANALYTICS ====================
  getAnalyticsOverview: () =>
    fetch(`${API_URL}/api/admin/analytics/overview`, {
      credentials: "include",
    }),

  getChartData: () =>
    fetch(`${API_URL}/api/admin/analytics/chart-data`, {
      credentials: "include",
    }),

  // ==================== SYSTEM MONITORING ====================
  cleanupChatData: (startDate, endDate) =>
    fetch(`${API_URL}/api/admin/system/cleanup-chats`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ startDate, endDate }),
    }),

  restartServer: (confirmed) =>
    fetch(`${API_URL}/api/admin/system/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ confirmed }),
    }),

  getSystemConfig: () =>
    fetch(`${API_URL}/api/admin/system/config`, {
      credentials: "include",
    }),

  updateSystemConfig: (config) =>
    fetch(`${API_URL}/api/admin/system/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(config),
    }),
  // ==================== BACKUPS ====================
  createBackup: (type = "FULL", notes = "", startDate = null, endDate = null) =>
    fetch(`${API_URL}/api/admin/backups/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type, notes, startDate, endDate }),
    }),

  getBackupLogs: () =>
    fetch(`${API_URL}/api/admin/backups`, {
      credentials: "include",
    }),

  downloadBackup: (filename) =>
    `${API_URL}/api/admin/backups/download/${filename}`,
};

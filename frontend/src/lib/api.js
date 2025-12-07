// frontend/src/lib/api.js
// ✅ COMPLETE: All API methods properly organized
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = {
  // ==================== AUTH ====================
  createAnonymous: (data) =>
    fetch(`${API_URL}/api/auth/anonymous`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  signup: (data) =>
    fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  login: (data) =>
    fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  googleAuth: (data) =>
    fetch(`${API_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  forgotPassword: (email) =>
    fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    }),
  verifyOtp: (data) =>
    fetch(`${API_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),
  resetPassword: (data) =>
    fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  getCurrentUser: () =>
    fetch(`${API_URL}/api/auth/me`, {
      credentials: "include",
    }),

  logout: () =>
    fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }),

  // ==================== USER ====================
  checkUsername: (username) =>
    fetch(`${API_URL}/api/user/check-username/${username}`, {
      credentials: "include",
    }),

  updateProfile: (data) =>
    fetch(`${API_URL}/api/user/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  updateSettings: (data) =>
    fetch(`${API_URL}/api/user/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  searchUsers: (username) =>
    fetch(`${API_URL}/api/user/search?username=${username}`, {
      credentials: "include",
    }),

  deleteAccount: () =>
    fetch(`${API_URL}/api/user/account`, {
      method: "DELETE",
      credentials: "include",
    }),

  getUserProfile: (userId) =>
    fetch(`${API_URL}/api/user/profile/${userId}`, {
      credentials: "include",
    }),
  // CHATS
  getChatMessages: (chatId, params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append("limit", params.limit);
    if (params.before) query.append("before", params.before);
    if (params.after) query.append("after", params.after);

    return fetch(`${API_URL}/api/chats/${chatId}/messages?${query}`, {
      credentials: "include",
    });
  },
  // ==================== FRIENDS ====================
  sendFriendRequest: (toUserId) =>
    fetch(`${API_URL}/api/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ toUserId }),
    }),

  getFriendRequests: () =>
    fetch(`${API_URL}/api/friends/requests`, {
      credentials: "include",
    }),

  acceptRequest: (requestId) =>
    fetch(`${API_URL}/api/friends/accept/${requestId}`, {
      method: "POST",
      credentials: "include",
    }),

  rejectRequest: (requestId) =>
    fetch(`${API_URL}/api/friends/reject/${requestId}`, {
      method: "POST",
      credentials: "include",
    }),

  getFriends: () =>
    fetch(`${API_URL}/api/friends`, {
      credentials: "include",
    }),

  removeFriend: (friendId) =>
    fetch(`${API_URL}/api/friends/${friendId}`, {
      method: "DELETE",
      credentials: "include",
    }),
  // ==================== CHAT BLOCKING ====================
  cleanupDuplicateChats: (userId) =>
    fetch(`${API_URL}/api/chats/cleanup/${userId}`, {
      method: "POST",
      credentials: "include",
    }),

  blockUserInChat: (chatId) =>
    fetch(`${API_URL}/api/chats/${chatId}/block`, {
      method: "POST",
      credentials: "include",
    }),

  unblockUserInChat: (chatId) =>
    fetch(`${API_URL}/api/chats/${chatId}/unblock`, {
      method: "POST",
      credentials: "include",
    }),

  getChatBlockStatus: (chatId) =>
    fetch(`${API_URL}/api/chats/${chatId}/block-status`, {
      credentials: "include",
    }),
  setDisappearingMessages: (chatId, enabled, duration = 3600000) =>
    fetch(`${API_URL}/api/chats/${chatId}/disappearing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled, duration }),
    }),
  // ==================== SUBSCRIPTION ====================
  createSubscriptionOrder: (data) =>
    fetch(`${API_URL}/api/subscription/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  verifyPayment: (data) =>
    fetch(`${API_URL}/api/subscription/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  getSubscription: () =>
    fetch(`${API_URL}/api/subscription/status`, {
      credentials: "include",
    }),

  redeemPromoCode: (code) =>
    fetch(`${API_URL}/api/subscription/redeem-promo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    }),

  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);

    return fetch(`${API_URL}/api/upload/image`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  },
  // ==================== GROUPS ====================
  getGroupByChatId: (chatId) =>
    fetch(`${API_URL}/api/groups/by-chat/${chatId}`, {
      credentials: "include",
    }),
  createGroup: (data) =>
    fetch(`${API_URL}/api/groups/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  getMyGroups: () =>
    fetch(`${API_URL}/api/groups/my`, {
      credentials: "include",
    }),

  getGroup: (groupId) =>
    fetch(`${API_URL}/api/groups/${groupId}`, {
      credentials: "include",
    }),

  joinGroup: (groupId) =>
    fetch(`${API_URL}/api/groups/${groupId}/join`, {
      method: "POST",
      credentials: "include",
    }),

  joinViaInvite: (token) =>
    fetch(`${API_URL}/api/groups/join/${token}`, {
      method: "POST",
      credentials: "include",
    }),

  leaveGroup: (groupId) =>
    fetch(`${API_URL}/api/groups/${groupId}/leave`, {
      method: "POST",
      credentials: "include",
    }),

  updateGroup: (groupId, data) =>
    fetch(`${API_URL}/api/groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }),

  generateInvite: (groupId) =>
    fetch(`${API_URL}/api/groups/${groupId}/invite`, {
      method: "POST",
      credentials: "include",
    }),

  previewInvite: (token) =>
    fetch(`${API_URL}/api/groups/invite/${token}/preview`, {
      credentials: "include",
    }),

  searchGroups: (query) =>
    fetch(`${API_URL}/api/groups/search?q=${query}`, {
      credentials: "include",
    }),

  removeMember: (groupId, memberId) =>
    fetch(`${API_URL}/api/groups/${groupId}/members/${memberId}`, {
      method: "DELETE",
      credentials: "include",
    }),
  demoteAdmin: (groupId, memberId) =>
    fetch(`${API_URL}/api/groups/${groupId}/admins/${memberId}/demote`, {
      method: "DELETE",
      credentials: "include",
    }),
  promoteToAdmin: (groupId, memberId) =>
    fetch(`${API_URL}/api/groups/${groupId}/admins/${memberId}`, {
      method: "POST",
      credentials: "include",
    }),
};

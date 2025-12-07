// frontend/src/lib/socket.js
// ✅ COMPLETE: With group message support
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class SocketClient {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.currentChatId = null;
    this.currentGroupId = null; // ✅ ADD: Track current group
    this.listeners = new Map();
  }

  /**
   * Connect socket with user authentication
   */
  connect(userId) {
    if (this.socket?.connected && this.userId === userId) {
      console.log("✅ Socket already connected");
      return this.socket;
    }

    this.userId = userId;

    this.socket = io(SOCKET_URL, {
      auth: { userId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket.id);

      // Re-join current chat if exists
      if (this.currentChatId) {
        this.joinChat(this.currentChatId);
      }

      // ✅ Re-join current group if exists
      if (this.currentGroupId) {
        this.joinGroup(this.currentGroupId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Socket error:", error);
    });

    return this.socket;
  }

  /**
   * Disconnect socket manually
   */
  disconnect() {
    if (this.socket) {
      if (this.currentChatId) {
        this.leaveChat(this.currentChatId, { force: true });
      }
      if (this.currentGroupId) {
        this.leaveGroup(this.currentGroupId);
      }
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.currentChatId = null;
      this.currentGroupId = null;
      this.listeners.clear();
      console.log("🔌 Socket disconnected manually");
    }
  }

  /**
   * Join a chat room
   */
  joinChat(chatId) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected");
      this.currentChatId = chatId;
      return;
    }

    if (this.currentChatId === chatId) {
      this.socket.emit("join_room", { chatId });
      console.log(`🔁 Re-join chat: ${chatId}`);
      this.socket.emit("mark_read", { chatId });
      return;
    }

    this.currentChatId = chatId;
    this.socket.emit("join_room", { chatId });
    console.log(`🔗 Joined chat: ${chatId}`);
    this.socket.emit("mark_read", { chatId });
  }

  /**
   * Leave chat room
   */
  leaveChat(chatId, opts = { force: false }) {
    if (!this.socket?.connected) return;
    if (!chatId) return;

    if (!opts.force && this.currentChatId && this.currentChatId !== chatId) {
      console.log(`⚠️ leaveChat ignored (not current): ${chatId}`);
      return;
    }

    this.socket.emit("leave_room", { chatId });
    console.log(`🚪 Left chat: ${chatId}`);

    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }
  }

  // ========================================================================
  // ✅ GROUP FUNCTIONS
  // ========================================================================

  /**
   * Join a group room
   */
  joinGroup(groupId) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected");
      this.currentGroupId = groupId;
      return;
    }

    this.currentGroupId = groupId;
    this.socket.emit("join_group", { groupId });
    console.log(`👥 Joined group: ${groupId}`);
  }

  /**
   * Leave group room
   */
  leaveGroup(groupId) {
    if (!this.socket?.connected) return;
    if (!groupId) return;

    this.socket.emit("leave_group", { groupId });
    console.log(`🚪 Left group: ${groupId}`);

    if (this.currentGroupId === groupId) {
      this.currentGroupId = null;
    }
  }

  /**
   * Send group message
   */
  sendGroupMessage(data) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected - cannot send group message");
      return false;
    }

    console.log("📤 Sending group message:", data);
    this.socket.emit("send_group_message", data);
    return true;
  }

  /**
   * Group typing indicator
   */
  sendGroupTyping(groupId, isTyping) {
    if (!this.socket?.connected) return;
    this.socket.emit("group_typing", { groupId, isTyping });
  }

  /**
   * Add reaction to group message
   */
  addGroupReaction(groupId, messageId, emoji) {
    if (!this.socket?.connected) return;
    this.socket.emit("add_reaction", { groupId, messageId, emoji });
  }

  /**
   * Pin group message (admins only)
   */
  pinGroupMessage(groupId, messageId) {
    if (!this.socket?.connected) return;
    this.socket.emit("pin_message", { groupId, messageId });
  }

  /**
   * Kick member from group (admins only)
   */
  kickGroupMember(groupId, targetUserId) {
    if (!this.socket?.connected) return;
    this.socket.emit("kick_member", { groupId, targetUserId });
  }

  /**
   * Promote member to admin (owner only)
   */
  promoteGroupAdmin(groupId, targetUserId) {
    if (!this.socket?.connected) return;
    this.socket.emit("promote_admin", { groupId, targetUserId });
  }

  /**
   * Demote admin (owner only)
   */
  demoteGroupAdmin(groupId, targetUserId) {
    if (!this.socket?.connected) return;
    this.socket.emit("demote_admin", { groupId, targetUserId });
  }

  // ========================================================================
  // REGULAR CHAT FUNCTIONS
  // ========================================================================

  /**
   * Send regular message
   */
  sendMessage(chatId, data) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected");
      return;
    }
    this.socket.emit("send_message", { chatId, ...data });
  }

  /**
   * Typing indicator
   */
  sendTyping(chatId, isTyping) {
    if (!this.socket?.connected) return;
    this.socket.emit("typing", { chatId, isTyping });
  }

  /**
   * Friend requests
   */
  sendFriendRequest(toUserId, chatId) {
    if (!this.socket?.connected) return;
    this.socket.emit("send_friend_request", { toUserId, chatId });
  }

  acceptFriendRequest(fromUserId, chatId) {
    if (!this.socket?.connected) return;
    this.socket.emit("accept_friend_request", { fromUserId, chatId });
  }

  /**
   * Report user
   */
  reportUser(reportedUserId, chatId, reason) {
    if (!this.socket?.connected) return;
    this.socket.emit("report_user", { reportedUserId, chatId, reason });
  }

  /**
   * Block user in chat
   */
  blockUserInChat(chatId, partnerId) {
    if (!this.socket?.connected) return;
    this.socket.emit("block_user", { chatId, partnerId });
    console.log(`🚫 Block request sent: ${chatId}`);
  }

  /**
   * Unblock user in chat
   */
  unblockUserInChat(chatId) {
    if (!this.socket?.connected) return;
    this.socket.emit("unblock_user", { chatId });
    console.log(`✅ Unblock request sent: ${chatId}`);
  }

  /**
   * Toggle disappearing messages
   */
  toggleDisappearing(chatId, enabled, duration = 3600000) {
    if (!this.socket?.connected) return;
    this.socket.emit("toggle_disappearing", { chatId, enabled, duration });
    console.log(`🕒 Disappearing toggle: ${enabled ? "ON" : "OFF"}`);
  }

  // ========================================================================
  // EVENT LISTENERS
  // ========================================================================

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn("⚠️ Socket not initialized");
      return;
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const idx = callbacks.indexOf(callback);
        if (idx > -1) callbacks.splice(idx, 1);
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * Check if socket is connected
   */
  get connected() {
    return this.socket?.connected || false;
  }
}

const socketClient = new SocketClient();
export default socketClient;

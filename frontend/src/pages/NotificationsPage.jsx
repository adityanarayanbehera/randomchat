// frontend/src/pages/NotificationsPage.jsx
// ✅ FIXED: Proper routing for all chat types, working mute toggle, dark mode
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, Trash2, Check, Loader } from "lucide-react";
import { useStore } from "../store/useStore";
import socketClient from "../lib/socket";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useStore();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    setNotificationsEnabled(user?.settings?.notifications ?? true);

    // Listen for new notifications
    socketClient.on(
      "new_notification",
      ({ notification, unreadCount: count }) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount(count);
      }
    );

    return () => {
      socketClient.off("new_notification");
    };
  }, [user]);

  const fetchNotifications = async (category = "all") => {
    setLoading(true);
    try {
      const url =
        category === "all"
          ? `${API_URL}/api/notifications`
          : `${API_URL}/api/notifications?category=${category}`;

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error("❌ Fetch notifications error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("All marked as read");
      }
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all notifications? This cannot be undone.")) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications/clear-all`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        toast.success("All cleared");
      }
    } catch (error) {
      toast.error("Failed to clear");
    }
  };

  // ✅ FIXED: Working toggle with proper API call and state update
  const handleToggleNotifications = async () => {
    const newValue = !notificationsEnabled;

    try {
      const res = await fetch(`${API_URL}/api/user/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          notifications: newValue,
        }),
      });

      if (res.ok) {
        setNotificationsEnabled(newValue);

        // ✅ Update user store
        const currentUser = useStore.getState().user;
        useStore.setState({
          user: {
            ...currentUser,
            settings: {
              ...currentUser.settings,
              notifications: newValue,
            },
          },
        });

        toast.success(
          newValue ? "Notifications enabled" : "Notifications disabled"
        );
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("❌ Toggle notifications error:", error);
      toast.error("Failed to update settings");
    }
  };

  // ✅ FIXED: Proper routing for all chat types
  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      await fetch(`${API_URL}/api/notifications/${notification._id}/read`, {
        method: "POST",
        credentials: "include",
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // ✅ Navigate based on category
    try {
      if (notification.category === "friend_chat" && notification.chatId) {
        // Get friend ID from the notification
        const fromUserId = notification.fromUser?._id;
        if (fromUserId) {
          navigate(`/friend-chat/${fromUserId}`);
        } else {
          toast.error("Cannot open chat");
        }
      } else if (
        notification.category === "random_chat" &&
        notification.chatId
      ) {
        navigate(`/random-chat?roomId=${notification.chatId}`);
      } else if (
        notification.category === "group_chat" &&
        notification.chatId
      ) {
        // ✅ Get group ID from chatId
        const groupRes = await fetch(
          `${API_URL}/api/groups/by-chat/${notification.chatId}`,
          {
            credentials: "include",
          }
        );

        if (groupRes.ok) {
          const groupData = await groupRes.json();
          navigate(`/groups/${groupData.groupId}`);
        } else {
          toast.error("Group not found");
        }
      } else if (notification.type === "friend_request") {
        navigate("/friends");
      } else if (notification.type === "friend_accepted") {
        const fromUserId = notification.fromUser?._id;
        if (fromUserId) {
          navigate(`/friend-chat/${fromUserId}`);
        }
      } else {
        // Default: go to dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("❌ Navigation error:", error);
      toast.error("Failed to open chat");
    }
  };

  const categories = [
    { id: "all", label: "All" },
    { id: "random_chat", label: "Random" },
    { id: "friend_chat", label: "Friends" },
    { id: "group_chat", label: "Groups" },
    { id: "system", label: "System" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          <button
            onClick={handleToggleNotifications}
            className={`p-2 rounded-lg transition ${
              notificationsEnabled
                ? "bg-white bg-opacity-20 hover:bg-opacity-30"
                : "bg-red-500 hover:bg-red-600"
            }`}
            title={
              notificationsEnabled
                ? "Disable notifications"
                : "Enable notifications"
            }
          >
            {notificationsEnabled ? <Bell size={24} /> : <BellOff size={24} />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex-1 bg-white bg-opacity-20 text-white py-2 px-3 rounded-lg text-sm hover:bg-opacity-30 transition flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={16} />
            <span>Mark All Read</span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="flex-1 bg-white bg-opacity-20 text-white py-2 px-3 rounded-lg text-sm hover:bg-opacity-30 transition flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 overflow-x-auto">
        <div className="flex space-x-2 p-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                fetchNotifications(cat.id);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin text-blue-600" size={48} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
            <Bell size={64} className="mb-4 opacity-50" />
            <p>No notifications</p>
            <p className="text-sm mt-2">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 border-b dark:border-gray-700 cursor-pointer transition ${
                !notif.isRead
                  ? "bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 hover:bg-blue-100 dark:hover:bg-blue-900 dark:hover:bg-opacity-30"
                  : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {notif.fromUser?.username?.[0]?.toUpperCase() || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-semibold ${
                        !notif.isRead
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                    {notif.fromUser?.username && `${notif.fromUser.username}: `}
                    {notif.message}
                  </p>
                  <span className="inline-block mt-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                    {notif.category.replace("_", " ")}
                  </span>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Banner */}
      {!notificationsEnabled && (
        <div className="fixed bottom-20 left-0 right-0 bg-red-500 text-white p-3 text-center text-sm font-medium shadow-lg">
          ⚠️ Notifications are disabled. Enable them to receive updates.
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString();
}

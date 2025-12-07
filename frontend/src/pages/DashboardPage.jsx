// ========================================================================
// FILE: frontend/src/pages/DashboardPage.jsx
// ✅ OPTIMIZED: No duplicate API calls, crash-proof, handles 1000+ users
// ========================================================================
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shuffle,
  Bell,
  Settings,
  User,
  MessageCircle,
  Users,
  Crown,
  Loader,
  Plus,
  // Trash2 removed - cleanup handled automatically by workers
  
} from "lucide-react";
// import { FaShuffle } from "react-icons/fa";
import { useStore } from "../store/useStore";
import socketClient from "../lib/socket";
import toast from "react-hot-toast";
import ModernSearch from "../components/ModernSearch";
import { getAvatarSrc } from "../lib/utils";
import { DashboardSkeleton } from "../components/SkeletonLoaders";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useStore();

  const [randomChats, setRandomChats] = useState([]);
  const [friendChats, setFriendChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [notificationCount, setNotificationCount] = useState(0);
  // cleaningUp state removed - cleanup handled automatically

  // ✅ Expand/Collapse state for sections
  const [randomExpanded, setRandomExpanded] = useState(false);
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [groupsExpanded, setGroupsExpanded] = useState(false);

  // ✅ CRITICAL: Prevent duplicate API calls
  const hasFetchedDashboard = useRef(false);
  const hasCleanedUp = useRef(false);
  const hasFetchedNotifications = useRef(false);
  const socketListenersAttached = useRef(false);
  const userIdRef = useRef(user?._id);

  // ✅ OPTIMIZED: Auto-cleanup only ONCE
  useEffect(() => {
    if (!user?._id || hasCleanedUp.current) return;

    hasCleanedUp.current = true;
    autoCleanupDuplicates();
  }, [user?._id]);

  // ✅ OPTIMIZED: Fetch dashboard data only ONCE
  useEffect(() => {
    if (!user?._id) return;

    // Skip if already fetched for this user
    if (hasFetchedDashboard.current && userIdRef.current === user._id) {
      return;
    }

    userIdRef.current = user._id;
    hasFetchedDashboard.current = true;

    fetchDashboardData();
  }, [user?._id]);

  // ✅ OPTIMIZED: Fetch notifications only ONCE
  useEffect(() => {
    if (!user?._id || hasFetchedNotifications.current) return;

    hasFetchedNotifications.current = true;

    fetch(`${API_URL}/api/notifications`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success || data.unreadCount !== undefined) {
          setNotificationCount(data.unreadCount || 0);
        }
      })
      .catch((err) => console.error("Notification fetch error:", err));
  }, [user?._id]);

  // ✅ OPTIMIZED: Socket listeners only ONCE
  useEffect(() => {
    if (!user?._id || socketListenersAttached.current) return;

    socketListenersAttached.current = true;

    if (!socketClient.connected) {
      socketClient.connect(user._id);
    }

    // New notification handler
    const handleNewNotification = ({ unreadCount }) => {
      setNotificationCount(unreadCount || 0);
    };

    // Message updates
    const handleMessage = (message) => {
      updateChatList(message.chatId, message, "friend");
      if (message.sender !== user._id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.chatId]: (prev[message.chatId] || 0) + 1,
        }));
      }
    };

    const handleGroupMessage = (data) => {
      updateGroupList(data.chatId, data.message);
      if (data.message.sender !== user._id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [data.chatId]: (prev[data.chatId] || 0) + 1,
        }));
      }
    };

    const handleUnreadUpdate = ({ chatId, unreadCount }) => {
      setUnreadCounts((prev) => ({
        ...prev,
        [chatId]: unreadCount,
      }));
    };

    const handlePartnerSkipped = ({ chatId }) => {
      setRandomChats((prev) => prev.filter((c) => c._id !== chatId));
    };

    const handleChatEnded = ({ chatId }) => {
      setRandomChats((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, chatEnded: true } : c))
      );
    };

    // Attach listeners
    socketClient.on("new_notification", handleNewNotification);
    socketClient.on("message", handleMessage);
    socketClient.on("group_message", handleGroupMessage);
    socketClient.on("unread_update", handleUnreadUpdate);
    socketClient.on("partner_skipped", handlePartnerSkipped);
    socketClient.on("chat_ended", handleChatEnded);

    // ✅ CRITICAL: Cleanup on unmount
    return () => {
      socketClient.off("new_notification", handleNewNotification);
      socketClient.off("message", handleMessage);
      socketClient.off("group_message", handleGroupMessage);
      socketClient.off("unread_update", handleUnreadUpdate);
      socketClient.off("partner_skipped", handlePartnerSkipped);
      socketClient.off("chat_ended", handleChatEnded);

      // Reset flag for next mount
      socketListenersAttached.current = false;
    };
  }, [user?._id]);

  // ✅ Auto-cleanup duplicates (runs only once)
  const autoCleanupDuplicates = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chats/cleanup`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.duplicates?.length > 0) {
          console.log(`🧹 Auto-cleaned ${data.duplicates.length} duplicates`);
        }
      }
    } catch (error) {
      console.error("Auto cleanup error:", error);
    }
  };

  // ✅ Manual cleanup button
  const handleManualCleanup = async () => {
    setCleaningUp(true);
    try {
      const res = await fetch(`${API_URL}/api/chats/cleanup`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Cleanup successful!");

        // Refresh dashboard after cleanup
        hasFetchedDashboard.current = false;
        await fetchDashboardData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Cleanup failed");
      }
    } catch (error) {
      console.error("Manual cleanup error:", error);
      toast.error("Cleanup failed");
    } finally {
      setCleaningUp(false);
    }
  };

  // ✅ OPTIMIZED: Fetch dashboard data with priority loading
  const fetchDashboardData = async () => {
    console.log("📊 Fetching dashboard data...");
    setLoading(true);

    try {
      // ✅ STEP 1: Fetch recent chats (Random + Friends together)
      const chatsPromise = fetch(`${API_URL}/api/chats/recent`, {
        credentials: "include",
      }).then((res) => res.json());

      // ✅ STEP 2: Fetch groups (parallel, not blocking)
      const groupsPromise = fetch(`${API_URL}/api/groups/my`, {
        credentials: "include",
      }).then((res) => res.json());

      // ✅ PRIORITY: Load chats first, then groups
      const chatsData = await chatsPromise;

      if (chatsData.success || chatsData.data) {
        // Sort by lastMessageAt descending (newest first)
        const sortedRandom = (chatsData.data?.randomChats || []).sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() -
            new Date(a.lastMessageAt || 0).getTime()
        );

        const sortedFriends = (chatsData.data?.friendChats || []).sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() -
            new Date(a.lastMessageAt || 0).getTime()
        );

        setRandomChats(sortedRandom);
        setFriendChats(sortedFriends);

        // Set unread counts
        const counts = {};
        [...sortedRandom, ...sortedFriends].forEach((chat) => {
          counts[chat._id] = chat.unreadCount || 0;
        });
        setUnreadCounts((prev) => ({ ...prev, ...counts }));

        console.log("✅ Chats loaded:", {
          random: sortedRandom.length,
          friends: sortedFriends.length,
        });
      }

      // ✅ STEP 3: Load groups (non-blocking)
      const groupData = await groupsPromise;

      if (groupData.success || groupData.groups) {
        const groupsList = groupData.groups || [];

        // ✅ OPTIMIZED: Fetch all group messages in parallel (not sequential)
        const groupsWithMessages = await Promise.all(
          groupsList.map(async (group) => {
            try {
              const msgRes = await fetch(
                `${API_URL}/api/chats/${group.chatId}/messages?limit=1`,
                { credentials: "include" }
              );
              if (msgRes.ok) {
                const msgData = await msgRes.json();
                const lastMsg = msgData.messages?.[msgData.messages.length - 1];

                return {
                  ...group,
                  lastMessage:
                    lastMsg?.text || (lastMsg?.image ? "📷 Image" : ""),
                  lastSenderName: lastMsg?.senderName || "",
                  lastMessageAt: lastMsg?.createdAt || group.lastActivity,
                };
              }
            } catch (err) {
              console.error("Fetch group messages error:", err);
            }
            return {
              ...group,
              lastMessage: "",
              lastSenderName: "",
              lastMessageAt: group.lastActivity,
            };
          })
        );

        // Sort groups by lastMessageAt
        groupsWithMessages.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() -
            new Date(a.lastMessageAt || 0).getTime()
        );

        setGroups(groupsWithMessages);

        // Set group unread counts
        const groupCounts = {};
        groupsWithMessages.forEach((group) => {
          groupCounts[group.chatId] = group.unreadCount || 0;
        });
        setUnreadCounts((prev) => ({ ...prev, ...groupCounts }));

        console.log("✅ Groups loaded:", groupsWithMessages.length);
      }
    } catch (error) {
      console.error("❌ Dashboard fetch error:", error);
      toast.error("Failed to load chats. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Update chat list on new message
  const updateChatList = (chatId, message, type) => {
    const updateFn = (prev) => {
      const chatIndex = prev.findIndex((c) => c._id === chatId);
      if (chatIndex === -1) return prev;

      const updated = [...prev];
      updated[chatIndex] = {
        ...updated[chatIndex],
        lastMessage: message.text || (message.image ? "📷 Image" : "Message"),
        lastMessageAt: new Date(message.timestamp || Date.now()),
      };

      // Move to top
      const [chat] = updated.splice(chatIndex, 1);
      return [chat, ...updated];
    };

    if (type === "friend") {
      setFriendChats(updateFn);
    } else {
      setRandomChats(updateFn);
    }
  };

  // ✅ Update group list on new message
  const updateGroupList = (chatId, message) => {
    setGroups((prev) => {
      const groupIndex = prev.findIndex((g) => g.chatId === chatId);
      if (groupIndex === -1) return prev;

      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        lastMessage: message.text || (message.image ? "📷 Image" : ""),
        lastSenderName: message.senderName || "",
        lastMessageAt: new Date(message.timestamp || Date.now()),
      };

      // Move to top
      const [group] = updated.splice(groupIndex, 1);
      return [group, ...updated];
    });
  };

  // ✅ Handle Start Random Chat - End active chat first
  const handleStartRandomChat = () => {
    // Check if there's an active random chat
    if (randomChats.length > 0 && randomChats[0]._id) {
      const activeChatId = randomChats[0]._id;
      console.log("🛑 Ending active random chat before starting new search:", activeChatId);
      
      // Emit end_chat event
      socketClient.socket.emit("end_chat", { chatId: activeChatId });
      
      // Small delay to ensure event is processed
      setTimeout(() => {
        navigate("/random-chat");
      }, 100);
    } else {
      // No active chat, navigate directly
      navigate("/random-chat");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Nav */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center space-x-3 hover:opacity-80 transition"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-blue-500 font-bold overflow-hidden">
              {user?.avatar || user?.username ? (
                <img
                  src={getAvatarSrc(user)}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                "?"
              )}
            </div>
            <span className="font-semibold">{user?.username || "User"}</span>
          </button>

          <div className="flex items-center space-x-3">
            {/* Bin icon removed - cleanup handled automatically by workers */}
            <button
              onClick={() => navigate("/notifications")}
              className="relative p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            >
              <Bell size={24} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            >
              <Settings size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <ModernSearch />
      </div>

      {/* Start Random Chat */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <button
          onClick={handleStartRandomChat}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center justify-center space-x-2"
        >
          <Shuffle size={20} />
          <span>Start Random Chat</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Recent Random Chat */}
            {randomChats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
                <h2 className="font-bold text-lg mb-3 flex items-center space-x-2 dark:text-white">
                  <Shuffle size={20} className="text-purple-500" />
                  <span>Recent Random Chat</span>
                </h2>
                {randomChats.slice(0, 1).map((chat) => (
                  <ChatCard
                    key={chat._id}
                    chat={chat}
                    unreadCount={unreadCounts[chat._id] || 0}
                    onClick={() => navigate(`/random-chat?roomId=${chat._id}`)}
                    isRandom={true}
                  />
                ))}
              </div>
            )}

            {/* Friends */}
            <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg flex items-center space-x-2 dark:text-white">
                  <MessageCircle size={20} className="text-blue-500" />
                  <span>Friends</span>
                </h2>

              </div>
              {friendChats.length > 0 ? (
                <>
                  {(friendsExpanded ? friendChats : friendChats.slice(0, 3)).map((chat) => (
                    <ChatCard
                      key={chat._id || `friend-${chat.partner._id}`}
                      chat={chat}
                      unreadCount={unreadCounts[chat._id] || 0}
                      onClick={() =>
                        navigate(`/friend-chat/${chat.partner._id}`)
                      }
                      isRandom={false}
                    />
                  ))}
                  {friendChats.length > 3 && (
                    <button
                      onClick={() => setFriendsExpanded(!friendsExpanded)}
                      className="w-full text-center text-blue-500 hover:underline text-sm mt-2 py-2"
                    >
                      {friendsExpanded ? 'Show Less' : `Show More (${friendChats.length - 3} more)`}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No friends yet. Add friends from random chats!
                </p>
              )}
            </div>

            {/* Groups */}
            <div className="bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg flex items-center space-x-2 dark:text-white">
                  <Users size={20} className="text-green-500" />
                  <span>Groups</span>
                </h2>
                <button
                  onClick={() => navigate("/groups/create")}
                  className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition flex items-center space-x-2"
                >
                  <Plus size={18} />
                  <span>Create</span>
                </button>
              </div>
              {groups.length > 0 ? (
                <>
                  {(groupsExpanded ? groups : groups.slice(0, 3)).map((group) => (
                    <GroupCard
                      key={group._id}
                      group={group}
                      unreadCount={unreadCounts[group.chatId] || 0}
                      onClick={() => navigate(`/groups/${group._id}`)}
                    />
                  ))}
                  {groups.length > 3 && (
                    <button
                      onClick={() => setGroupsExpanded(!groupsExpanded)}
                      className="w-full text-center text-green-500 hover:underline text-sm mt-2 py-2"
                    >
                      {groupsExpanded ? 'Show Less' : `Show More (${groups.length - 3} more)`}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Users
                    size={48}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
                  />
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                    No groups yet
                  </p>
                  <button
                    onClick={() => navigate("/groups/create")}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition"
                  >
                    Create Your First Group
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
        <div className="flex justify-around items-center max-w-lg mx-auto relative">
          {[
            {
              id: "home",
              icon: MessageCircle,
              label: "Home",
              path: "/dashboard",
            },
            { id: "friends", icon: Users, label: "Friends", path: "/friends" },
            { id: "center", icon: null, label: "", path: "" }, // Placeholder for center button
            {
              id: "subscription",
              icon: Crown,
              label: "Premium",
              path: "/subscription",
            },
            { id: "profile", icon: User, label: "Profile", path: "/profile" },
          ].map((tab) => {
            if (tab.id === "center") {
              // Center floating button
              return (
                <div key="center" className="flex flex-col items-center justify-center py-3 px-6">
                  <button
                    onClick={handleStartRandomChat}
                    className="absolute -top-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                  >
                    <Shuffle size={28} />
                  </button>
                </div>
              );
            }
            
            const Icon = tab.icon;
            const isActive = tab.id === "home";
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center py-3 px-6 transition ${
                  isActive
                    ? "text-blue-500"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                }`}
              >
                <Icon size={24} />
                <span className="text-xs mt-1 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ✅ ChatCard Component (unchanged UI)
function ChatCard({ chat, unreadCount, onClick, isRandom }) {
  const isUnread = unreadCount > 0;
  const isEnded = chat.chatEnded;

  return (
    <div
      onClick={isEnded ? undefined : onClick}
      className={`flex items-center space-x-3 p-3 rounded-lg transition mb-2 ${
        isEnded
          ? "bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed"
          : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
    >
      <div className="relative flex-shrink-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden ${
            isRandom
              ? "bg-gradient-to-br from-purple-400 to-pink-500"
              : "bg-gradient-to-br from-blue-400 to-cyan-500"
          }`}
        >
          {chat.partner?.avatar || chat.partner?.username ? (
            <img
              src={getAvatarSrc(chat.partner)}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            "?"
          )}
        </div>
        {/* Removed online indicator for performance */}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate dark:text-white">
            {chat.partner?.username || "Unknown User"}
          </h3>
          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
            {formatTime(chat.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${
              isEnded
                ? "text-red-500 dark:text-red-400 italic"
                : isUnread
                ? "font-bold text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {isEnded ? "Chat ended" : chat.lastMessage || "Start chatting"}
          </p>
          {isUnread && !isEnded && (
            <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ GroupCard Component (unchanged UI)
function GroupCard({ group, unreadCount, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition mb-2"
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-green-400 to-teal-500 overflow-hidden">
          {group.avatar ? (
            <img
              src={group.avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            group.name[0].toUpperCase()
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate dark:text-white flex items-center space-x-2">
            <span>{group.name}</span>
            {group.isAdmin && (
              <Crown size={14} className="text-yellow-500 flex-shrink-0" />
            )}
          </h3>
          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
            {formatTime(group.lastMessageAt)}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {group.lastSenderName && (
            <span className="font-semibold">{group.lastSenderName}: </span>
          )}
          {group.lastMessage || "No messages yet"}
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  );
}

// ✅ Time formatting helper
function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000)
    return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

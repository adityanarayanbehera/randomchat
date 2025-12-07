// frontend/src/pages/FriendsPage.jsx
// ✅ COMPLETE: Block/Unblock UI + Real-time updates + All existing features
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Check,
  X,
  MessageCircle,
  Trash2,
  User,
  Crown,
  Shield,
  Loader,
  Users,
  UserX,
  ShieldOff,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import socketClient from "../lib/socket";
import toast from "react-hot-toast";
import { getAvatarSrc } from "../lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function FriendsPage() {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);

  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  // ✅ Socket listeners for real-time updates
  useEffect(() => {
    if (!user?._id) return;

    const handleUserBlocked = ({ fromUserId }) => {
      console.log("🚫 User blocked event received:", fromUserId);

      // Move from friends to blocked
      setFriends((prev) => prev.filter((f) => f._id !== fromUserId));

      // Refresh blocked list
      fetchBlockedUsers();

      toast("A user blocked you", { icon: "🚫" });
    };

    const handleUserUnblocked = ({ fromUserId }) => {
      console.log("✅ User unblocked event received:", fromUserId);

      // Remove from blocked list
      setBlockedUsers((prev) => prev.filter((b) => b._id !== fromUserId));

      toast("A user unblocked you", { icon: "✅" });
    };

    socketClient.on("user_blocked", handleUserBlocked);
    socketClient.on("user_unblocked", handleUserUnblocked);

    return () => {
      socketClient.off("user_blocked", handleUserBlocked);
      socketClient.off("user_unblocked", handleUserUnblocked);
    };
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchFriends(), fetchRequests(), fetchBlockedUsers()]);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await api.getFriends();
      const data = await res.json();
      if (res.ok) setFriends(data.friends || []);
    } catch (error) {
      console.error("Fetch friends error:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await api.getFriendRequests();
      const data = await res.json();
      if (res.ok) setRequests(data.requests || []);
    } catch (error) {
      console.error("Fetch requests error:", error);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user/blocked`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        console.log(
          "✅ Blocked users fetched:",
          data.blockedUsers?.length || 0
        );
        setBlockedUsers(data.blockedUsers || []);
      }
    } catch (error) {
      console.error("Fetch blocked users error:", error);
    }
  };

  const handleAccept = async (requestId) => {
    setActionLoading(requestId);
    try {
      const res = await api.acceptRequest(requestId);
      if (!res.ok) throw new Error("Failed to accept");

      toast.success("Friend request accepted!");
      await fetchFriends();
      await fetchRequests();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(requestId);
    try {
      const res = await api.rejectRequest(requestId);
      if (!res.ok) throw new Error("Failed to reject");

      toast.success("Request rejected");
      await fetchRequests();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (friendId, friendName) => {
    if (!confirm(`Remove ${friendName} from friends?`)) return;

    setActionLoading(friendId);
    try {
      const res = await api.removeFriend(friendId);
      if (!res.ok) throw new Error("Failed to remove");

      toast.success("Friend removed");
      await fetchFriends();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ NEW: Block user handler
  const handleBlock = async (friendId, friendName) => {
    if (!confirm(`Block ${friendName}? You won't see their messages.`)) return;

    setActionLoading(friendId);
    try {
      const res = await fetch(`${API_URL}/api/user/block/${friendId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to block user");

      // Emit socket event for real-time update
      if (socketClient.connected) {
        socketClient.socket.emit("block_user_action", {
          targetUserId: friendId,
        });
      }

      toast.success("User blocked");

      // Refresh all data
      await fetchAllData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ NEW: Unblock user handler
  const handleUnblock = async (userId, username) => {
    if (
      !confirm(
        `Unblock ${username}? You'll be able to see their messages again.`
      )
    )
      return;

    setActionLoading(userId);
    try {
      const res = await fetch(`${API_URL}/api/user/unblock/${userId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to unblock");

      // Emit socket event for real-time update
      if (socketClient.connected) {
        socketClient.socket.emit("unblock_user_action", {
          targetUserId: userId,
        });
      }

      toast.success("User unblocked");

      // Refresh blocked users list
      await fetchBlockedUsers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChat = (friendId) => {
    navigate(`/friend-chat/${friendId}`);
  };

  const handleViewProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  const getAvatarColor = (name) => {
    const colors = [
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600",
      "from-pink-400 to-pink-600",
      "from-green-400 to-green-600",
      "from-yellow-400 to-yellow-600",
      "from-red-400 to-red-600",
      "from-indigo-400 to-indigo-600",
      "from-cyan-400 to-cyan-600",
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const tabs = [
    { id: "friends", label: "Friends", count: friends.length },
    { id: "requests", label: "Requests", count: requests.length },
    { id: "blocked", label: "Blocked", count: blockedUsers.length },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold flex items-center space-x-2">
              <Users size={20} />
              <span>Friends</span>
            </h1>
          </div>

          {requests.length > 0 && activeTab !== "requests" && (
            <button
              onClick={() => setActiveTab("requests")}
              className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse"
            >
              {requests.length} New
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mt-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-lg"
                  : "bg-white bg-opacity-20 text-white hover:bg-opacity-30"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-white bg-opacity-30 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="animate-spin text-blue-600" size={48} />
          </div>
        ) : (
          <>
            {/* Friend Requests Tab */}
            {activeTab === "requests" && (
              <div className="p-4 space-y-3">
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <UserPlus size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No pending requests</p>
                    <p className="text-sm mt-2">
                      Friend requests will appear here
                    </p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div
                      key={request._id}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg hover:shadow-xl transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div
                            className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(
                              request.from.username
                            )} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden`}
                          >
                            {request.from.avatar || request.from.username ? (
                              <img
                                src={getAvatarSrc(request.from)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              "?"
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white">
                              {request.from.username}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {request.from.gender}
                            </p>
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-2">
                          <button
                            onClick={() => handleAccept(request._id)}
                            disabled={actionLoading === request._id}
                            className="bg-green-500 text-white p-2.5 rounded-xl hover:bg-green-600 transition disabled:opacity-50 shadow-md"
                          >
                            {actionLoading === request._id ? (
                              <Loader className="animate-spin" size={18} />
                            ) : (
                              <Check size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(request._id)}
                            disabled={actionLoading === request._id}
                            className="bg-red-500 text-white p-2.5 rounded-xl hover:bg-red-600 transition disabled:opacity-50 shadow-md"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === "friends" && (
              <div className="p-4 space-y-3">
                {friends.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Users size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No friends yet</p>
                    <p className="text-sm mt-2">
                      Add friends from random chats!
                    </p>
                  </div>
                ) : (
                  friends.map((friend) => {
                    return (
                      <div
                        key={friend._id}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg hover:shadow-xl transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="relative">
                              <div
                                className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(
                                  friend.username
                                )} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden`}
                              >
                                {friend.avatar || friend.username ? (
                                  <img
                                    src={getAvatarSrc(friend)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  "?"
                                )}
                              </div>
                              {/* Removed online indicator */}
                            </div>

                            <div className="flex-1">
                              <p className="font-bold text-gray-900 dark:text-white">
                                {friend.username}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {friend.gender}
                              </p>
                            </div>
                          </div>

                          <div className="flex space-x-2 ml-2">
                            <button
                              onClick={() => handleChat(friend._id)}
                              className="bg-blue-500 text-white p-2.5 rounded-xl hover:bg-blue-600 transition shadow-md"
                              title="Chat"
                            >
                              <MessageCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleViewProfile(friend._id)}
                              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition shadow-md"
                              title="View Profile"
                            >
                              <User size={18} />
                            </button>
                            {/* ✅ NEW: Block Button */}
                            <button
                              onClick={() =>
                                handleBlock(friend._id, friend.username)
                              }
                              disabled={actionLoading === friend._id}
                              className="bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 shadow-md"
                              title="Block User"
                            >
                              {actionLoading === friend._id ? (
                                <Loader className="animate-spin" size={18} />
                              ) : (
                                <UserX size={18} />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleRemove(friend._id, friend.username)
                              }
                              disabled={actionLoading === friend._id}
                              className="bg-red-500 text-white p-2.5 rounded-xl hover:bg-red-600 transition disabled:opacity-50 shadow-md"
                              title="Remove Friend"
                            >
                              {actionLoading === friend._id ? (
                                <Loader className="animate-spin" size={18} />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ✅ Blocked Users Tab */}
            {activeTab === "blocked" && (
              <div className="p-4 space-y-3">
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Shield size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No blocked users</p>
                    <p className="text-sm mt-2">
                      Blocked users will appear here
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-300 dark:border-yellow-800 rounded-xl p-4 mb-4">
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                        ⚠️ Blocked users cannot send you messages or see your
                        activity. Unblock them to restore communication.
                      </p>
                    </div>

                    {blockedUsers.map((blockedUser) => (
                      <div
                        key={blockedUser._id}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border-2 border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div
                              className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(
                                blockedUser.username
                              )} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden opacity-60`}
                            >
                              {blockedUser.avatar || blockedUser.username ? (
                                <img
                                  src={getAvatarSrc(blockedUser)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                "?"
                              )}
                            </div>

                            <div className="flex-1">
                              <p className="font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                                <span>{blockedUser.username}</span>
                                <Shield size={16} className="text-red-500" />
                              </p>
                              <p className="text-xs text-red-500 dark:text-red-400 font-semibold">
                                Blocked
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleUnblock(
                                blockedUser._id,
                                blockedUser.username
                              )
                            }
                            disabled={actionLoading === blockedUser._id}
                            className="bg-green-500 text-white px-4 py-2.5 rounded-xl hover:bg-green-600 transition disabled:opacity-50 shadow-md font-semibold text-sm flex items-center space-x-2"
                          >
                            {actionLoading === blockedUser._id ? (
                              <Loader className="animate-spin" size={18} />
                            ) : (
                              <>
                                <ShieldOff size={18} />
                                <span>Unblock</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {[
            {
              id: "home",
              icon: MessageCircle,
              label: "Home",
              path: "/dashboard",
            },
            { id: "friends", icon: Users, label: "Friends", path: "/friends" },
            {
              id: "subscription",
              icon: Crown,
              label: "Premium",
              path: "/subscription",
            },
            { id: "profile", icon: User, label: "Profile", path: "/profile" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === "friends";

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center py-3 px-6 transition ${
                  isActive ? "text-blue-500" : "text-gray-400"
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

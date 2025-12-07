import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  UserPlus,
  UserX,
  Shield,
  Calendar,
  MapPin,
  Loader,
  Check,
  X,
} from "lucide-react";
import { useStore } from "../store/useStore";
import toast from "react-hot-toast";
import { getAvatarSrc } from "../lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: currentUser } = useStore();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (userId === currentUser?._id) {
      navigate("/profile");
      return;
    }
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/user/profile/${userId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await res.json();
      setProfileUser(data.user);
      setIsBlocked(data.user.isBlocked || false);

      // Check if already friends
      const friendsRes = await fetch(`${API_URL}/api/friends`, {
        credentials: "include",
      });
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        const friendsList = friendsData.friends || [];
        setIsFriend(friendsList.some((f) => f._id === userId));
      }

      // Check if friend request already sent
      const requestsRes = await fetch(`${API_URL}/api/friends/requests`, {
        credentials: "include",
      });
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        const sentRequests = requestsData.requests || [];
        setRequestSent(sentRequests.some((r) => r.to._id === userId));
      }
    } catch (error) {
      console.error("❌ Fetch profile error:", error);
      toast.error("Failed to load profile");
      setTimeout(() => navigate("/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toUserId: userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send request");
      }

      setRequestSent(true);
      toast.success("Friend request sent!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChat = () => {
    if (!isFriend) {
      return toast.error("You must be friends to chat");
    }
    navigate(`/friend-chat/${userId}`);
  };

  const handleBlock = async () => {
    if (
      !confirm(`Block ${profileUser?.username}? You won't see their messages.`)
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/user/block/${userId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to block user");
      }

      setIsBlocked(true);
      toast.success("User blocked");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/user/unblock/${userId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to unblock user");
      }

      setIsBlocked(false);
      toast.success("User unblocked");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <X size={64} className="text-red-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          User not found
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  // const isOnline = false; // Removed online status feature

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">User Profile</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="relative inline-block mb-4">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-5xl shadow-xl border-4 border-white dark:border-gray-800 overflow-hidden">
              {profileUser.avatar || profileUser.username ? (
                <img
                  src={getAvatarSrc(profileUser)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                "?"
              )}
            </div>
            {/* Removed online indicator */}
          </div>

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {profileUser.username}
          </h2>

          <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 mb-4">
            <span className="capitalize">{profileUser.gender}</span>
          </div>

          {/* Blocked Status */}
          {isBlocked && (
            <div className="bg-red-100 dark:bg-red-900 dark:bg-opacity-20 border border-red-300 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-red-700 dark:text-red-400 font-semibold flex items-center justify-center space-x-2">
                <Shield size={18} />
                <span>This user is blocked</span>
              </p>
            </div>
          )}

          {/* Friend Status */}
          {isFriend && !isBlocked && (
            <div className="bg-green-100 dark:bg-green-900 dark:bg-opacity-20 border border-green-300 dark:border-green-800 rounded-lg p-3 mb-4">
              <p className="text-green-700 dark:text-green-400 font-semibold flex items-center justify-center space-x-2">
                <Check size={18} />
                <span>You are friends</span>
              </p>
            </div>
          )}

          {/* Request Sent Status */}
          {requestSent && !isFriend && !isBlocked && (
            <div className="bg-blue-100 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-300 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-blue-700 dark:text-blue-400 font-semibold flex items-center justify-center space-x-2">
                <Loader size={18} className="animate-pulse" />
                <span>Friend request sent</span>
              </p>
            </div>
          )}
        </div>

        {/* Info Cards */}
        {profileUser.age && (
          <InfoCard
            icon={Calendar}
            label="Age"
            value={`${profileUser.age} years old`}
            color="blue"
          />
        )}

        {profileUser.location && (
          <InfoCard
            icon={MapPin}
            label="Location"
            value={profileUser.location}
            color="green"
          />
        )}

        {/* Action Buttons */}
        {!isBlocked && (
          <div className="space-y-3">
            {isFriend ? (
              <button
                onClick={handleChat}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition flex items-center justify-center space-x-2"
              >
                <MessageCircle size={24} />
                <span>Send Message</span>
              </button>
            ) : requestSent ? (
              <div className="w-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-4 rounded-2xl font-bold text-lg shadow-lg cursor-not-allowed flex items-center justify-center space-x-2">
                <Check size={24} />
                <span>Request Sent</span>
              </div>
            ) : (
              <button
                onClick={handleAddFriend}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {actionLoading ? (
                  <Loader className="animate-spin" size={24} />
                ) : (
                  <>
                    <UserPlus size={24} />
                    <span>Add Friend</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Block/Unblock Button */}
        {/* <div className="pt-4">
          {isBlocked ? (
            <button
              onClick={handleUnblock}
              disabled={actionLoading}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {actionLoading ? (
                <Loader className="animate-spin" size={20} />
              ) : (
                <>
                  <Shield size={20} />
                  <span>Unblock User</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleBlock}
              disabled={actionLoading}
              className="w-full bg-red-100 dark:bg-red-900 dark:bg-opacity-20 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-800 py-3 rounded-xl font-semibold hover:bg-red-200 dark:hover:bg-red-800 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {actionLoading ? (
                <Loader className="animate-spin" size={20} />
              ) : (
                <>
                  <UserX size={20} />
                  <span>Block User</span>
                </>
              )}
            </button>
          )}
        </div> */}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-500",
    green: "bg-green-100 dark:bg-green-900 text-green-500",
    purple: "bg-purple-100 dark:bg-purple-900 text-purple-500",
    orange: "bg-orange-100 dark:bg-orange-900 text-orange-500",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg flex items-center space-x-4 hover:shadow-xl transition">
      <div
        className={`w-12 h-12 ${colors[color]} rounded-xl flex items-center justify-center`}
      >
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="font-bold text-gray-900 dark:text-white truncate text-lg">
          {value}
        </p>
      </div>
    </div>
  );
}

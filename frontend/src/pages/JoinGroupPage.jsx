// frontend/src/pages/JoinGroupPage.jsx
// ✅ COMPLETE: Beautiful join group UI with full validation
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Users,
  CheckCircle,
  XCircle,
  Loader,
  ArrowRight,
  Shield,
  Globe,
} from "lucide-react";
import { useStore } from "../store/useStore";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function JoinGroupPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const { user, isAuthenticated } = useStore();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please sign up or login to join groups");
      sessionStorage.setItem("pendingGroupInvite", token);
      setTimeout(() => navigate("/signup"), 2000);
      return;
    }

    validateInvite();
  }, [token, isAuthenticated]);

  const validateInvite = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/groups/invite/${token}/preview`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
      } else if (res.status === 400) {
        setError("This invite link has expired or is invalid");
      } else if (res.status === 403) {
        const data = await res.json();
        setError(data.message);
        if (data.alreadyMember) {
          setTimeout(() => navigate(`/groups/${data.groupId}`), 2000);
        }
      }
    } catch (err) {
      console.error("❌ Validate invite error:", err);
      setError("Failed to load invite. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user?._id) {
      return toast.error("Please login to join");
    }

    setJoining(true);
    try {
      const res = await fetch(`${API_URL}/api/groups/join/${token}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to join group");
      }

      setSuccess(true);
      toast.success(`Welcome to ${group?.name || "the group"}!`);

      setTimeout(() => {
        navigate(`/groups/${data.groupId}`);
      }, 2000);
    } catch (error) {
      console.error("❌ Join group error:", error);
      toast.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 via-teal-600 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader
            className="animate-spin mx-auto mb-4 text-green-600"
            size={48}
          />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Checking invite...
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
            Please wait while we verify this link
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-600 to-purple-500 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900 dark:bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={48} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Invite
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 via-teal-600 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 dark:bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle
              size={48}
              className="text-green-600 dark:text-green-400"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You're In! 🎉
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Successfully joined {group?.name}
          </p>

          <div className="animate-pulse text-gray-500 dark:text-gray-400 text-sm">
            Redirecting to group chat...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 via-teal-600 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Group Info */}
        <div className="text-center mb-6">
          <div
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white font-bold text-4xl mb-4 shadow-lg ${
              group?.avatar || "bg-gradient-to-br from-green-400 to-teal-500"
            } overflow-hidden`}
          >
            {group?.avatar ? (
              <img
                src={group.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              group?.name?.[0]?.toUpperCase() || "G"
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {group?.name}
          </h1>

          {group?.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {group.description}
            </p>
          )}

          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Users size={16} />
              <span>{group?.members?.length || 0} members</span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${
                group?.isPublic
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {group?.isPublic ? <Globe size={12} /> : <Shield size={12} />}
              <span>{group?.isPublic ? "Public" : "Private"}</span>
            </span>
          </div>
        </div>

        {/* Invite Message */}
        <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-200 text-center">
            You've been invited to join <strong>{group?.name}</strong>
          </p>
        </div>

        {/* Owner Info */}
        {group?.owner && (
          <div className="flex items-center justify-center space-x-3 mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {group.owner.avatar ? (
                <img
                  src={group.owner.avatar}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                group.owner.username?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <div className="text-sm">
              <p className="text-gray-600 dark:text-gray-400">Created by</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {group.owner.username}
              </p>
            </div>
          </div>
        )}

        {/* Join Button */}
        <button
          onClick={handleJoinGroup}
          disabled={joining}
          className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {joining ? (
            <>
              <Loader className="animate-spin" size={20} />
              <span>Joining...</span>
            </>
          ) : (
            <>
              <span>Join Group</span>
              <ArrowRight size={20} />
            </>
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full mt-3 text-gray-600 dark:text-gray-400 py-2 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          Maybe Later
        </button>

        {/* Warning */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          By joining, you'll be able to see all messages and participate in
          group discussions
        </p>
      </div>
    </div>
  );
}

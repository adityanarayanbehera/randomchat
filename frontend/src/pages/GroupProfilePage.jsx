// frontend/src/pages/GroupProfilePage.jsx
// ✅ COMPLETE: Beautiful group profile with member management
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Crown,
  Shield,
  Users as UsersIcon,
  MessageCircle,
  UserPlus,
  UserMinus,
  Link as LinkIcon,
  Loader,
  MoreVertical,
  X,
  Check,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import { getAvatarSrc } from "../lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function GroupProfilePage() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { user } = useStore();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    isPublic: false,
  });
  // const [onlineMembers, setOnlineMembers] = useState(new Set()); // Removed online status

  useEffect(() => {
    if (!groupId) return;
    fetchGroup();
  }, [groupId]);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load group");

      const data = await res.json();
      setGroup(data.group);
      setEditData({
        name: data.group.name,
        description: data.group.description || "",
        isPublic: data.group.isPublic,
      });

      // Removed online status check
    } catch (error) {
      console.error("❌ Fetch group error:", error);
      toast.error("Failed to load group");
      setTimeout(() => navigate("/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editData.name.trim()) {
      return toast.error("Group name is required");
    }

    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editData),
      });

      if (!res.ok) throw new Error("Failed to update");

      const data = await res.json();
      setGroup(data.group);
      setIsEditing(false);
      toast.success("Group updated!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}/invite`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate link");

      const data = await res.json();
      navigator.clipboard.writeText(data.inviteLink);
      toast.success("Invite link copied!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleKickMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from this group?`)) return;

    try {
      const res = await fetch(
        `${API_URL}/api/groups/${groupId}/members/${memberId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Failed to remove member");

      toast.success("Member removed");
      fetchGroup();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handlePromoteAdmin = async (memberId, memberName) => {
    if (!confirm(`Make ${memberName} an admin?`)) return;

    try {
      const res = await fetch(
        `${API_URL}/api/groups/${groupId}/admins/${memberId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Failed to promote");

      toast.success("Admin promoted!");
      fetchGroup();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSendFriendRequest = async (memberId) => {
    try {
      const res = await api.sendFriendRequest(memberId);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success("Friend request sent!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const isOwner = group?.owner?._id === user?._id;
  const isAdmin = group?.admins?.some((a) => a._id === user?._id) || isOwner;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader className="animate-spin text-green-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Group Info</h1>
          {isAdmin && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
            >
              <Edit2 size={24} />
            </button>
          )}
          {!isAdmin && <div className="w-10"></div>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {/* Group Avatar & Name */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center mb-4 shadow-lg">
          <div
            className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-white font-bold text-5xl ${
              group.avatar || "bg-gradient-to-br from-green-400 to-teal-500"
            } mb-4 overflow-hidden shadow-lg`}
          >
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

          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
                placeholder="Group name"
                maxLength={100}
              />

              <textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none bg-white dark:bg-gray-700 dark:text-white"
                placeholder="Description (optional)"
                maxLength={300}
                rows={3}
              />

              <div className="flex items-center justify-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.isPublic}
                    onChange={(e) =>
                      setEditData({ ...editData, isPublic: e.target.checked })
                    }
                    className="form-checkbox h-5 w-5 text-green-500 rounded focus:ring-green-500"
                  />
                  <span className="text-sm dark:text-white font-medium">
                    Public Group
                  </span>
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGroup}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {group.name}
              </h2>
              {group.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                  {group.description}
                </p>
              )}
              <div className="flex items-center justify-center space-x-2 mt-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    group.isPublic
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {group.isPublic ? "Public" : "Private"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {group.members?.length} members
                </span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 space-y-3 shadow-lg">
          <button
            onClick={handleCopyInviteLink}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition hover:shadow-lg"
          >
            <LinkIcon size={20} />
            <span>Copy Invite Link</span>
          </button>

          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition hover:shadow-lg"
          >
            <MessageCircle size={20} />
            <span>Go to Chat</span>
          </button>
        </div>

        {/* Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
          <h3 className="font-bold text-lg mb-3 flex items-center space-x-2 dark:text-white">
            <UsersIcon size={20} className="text-green-500" />
            <span>Members ({group.members?.length || 0})</span>
          </h3>

          {/* Admins */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-2">
              Admins
            </p>
            {group.admins?.map((admin) => (
              <MemberCard
                key={admin._id}
                member={admin}
                isAdmin={true}
                isOwner={admin._id === group.owner._id}
                currentUserId={user._id}
                canManage={isOwner && admin._id !== user._id}
                onKick={handleKickMember}
                onPromote={handlePromoteAdmin}
                onSendRequest={handleSendFriendRequest}
              />
            ))}
          </div>

          {/* Regular Members */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-2">
              Members
            </p>
            {group.members
              ?.filter((m) => !group.admins?.some((a) => a._id === m._id))
              .map((member) => (
                <MemberCard
                  key={member._id}
                  member={member}
                  isAdmin={false}
                  isOwner={false}
                  currentUserId={user._id}
                  canManage={isAdmin}
                  onKick={handleKickMember}
                  onPromote={handlePromoteAdmin}
                  onSendRequest={handleSendFriendRequest}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  isAdmin,
  isOwner,
  // isOnline, // Removed
  currentUserId,
  canManage,
  onKick,
  onPromote,
  onSendRequest,
}) {
  const [showActions, setShowActions] = useState(false);
  const isMe = member._id === currentUserId;

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg mb-2 transition">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
            {member.avatar || member.username ? (
              <img
                src={getAvatarSrc(member)}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              "?"
            )}
          </div>
          {/* Removed online indicator */}
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold dark:text-white">
              {member.username}
            </span>
            {isOwner && <Crown size={16} className="text-yellow-500" />}
            {isAdmin && !isOwner && (
              <Shield size={16} className="text-blue-500" />
            )}
            {isMe && (
              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isOwner ? "Owner" : isAdmin ? "Admin" : "Member"}
          </p>
        </div>
      </div>

      {!isMe && (
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
          >
            <MoreVertical size={18} />
          </button>

          {showActions && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowActions(false)}
              />

              <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-48 z-50 border dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => {
                    onSendRequest(member._id);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-sm dark:text-white transition"
                >
                  <UserPlus size={16} />
                  <span>Add Friend</span>
                </button>

                {canManage && !isAdmin && (
                  <button
                    onClick={() => {
                      onPromote(member._id, member.username);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-sm border-t dark:border-gray-700 dark:text-white transition"
                  >
                    <Shield size={16} />
                    <span>Make Admin</span>
                  </button>
                )}

                {canManage && (
                  <button
                    onClick={() => {
                      onKick(member._id, member.username);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900 dark:hover:bg-opacity-20 flex items-center space-x-2 text-sm border-t dark:border-gray-700 text-red-600 transition"
                  >
                    <UserMinus size={16} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// frontend/src/pages/CreateGroupPage.jsx
// ✅ NEW: Create group with validation and friend selection
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Lock,
  Globe,
  Search,
  X,
  Loader,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import toast from "react-hot-toast";

export default function CreateGroupPage() {
  const navigate = useNavigate();
  const { user } = useStore();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
  });
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await api.getFriends();
      const data = await res.json();
      if (res.ok) setFriends(data.friends || []);
    } catch (error) {
      console.error("Fetch friends error:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return toast.error("Group name is required");
    }

    if (formData.description.length > 300) {
      return toast.error("Description must be 300 characters or less");
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...formData,
            initialMembers: selectedFriends.map((f) => f._id),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setCreatedGroup(data);
      toast.success("Group created successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friend) => {
    setSelectedFriends((prev) =>
      prev.find((f) => f._id === friend._id)
        ? prev.filter((f) => f._id !== friend._id)
        : [...prev, friend]
    );
  };

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyInviteLink = () => {
    navigator.clipboard.writeText(createdGroup.inviteLink);
    toast.success("Invite link copied!");
  };

  if (createdGroup) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4">
          <h1 className="text-xl font-bold text-center">Group Created! 🎉</h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div
                className={`w-24 h-24 bg-gradient-to-br ${
                  createdGroup.group.avatar || "from-blue-400 to-purple-500"
                } rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4`}
              >
                {createdGroup.group.name[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold dark:text-white">
                {createdGroup.group.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                {createdGroup.group.description || "No description"}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-2">
                📋 Share Invite Link
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={createdGroup.inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
                <button
                  onClick={copyInviteLink}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <LinkIcon size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Link expires in 24 hours
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/groups/${createdGroup.group._id}`)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
              >
                Go to Group Chat
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Create Group</h1>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          {/* Group Name */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter group name"
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.name.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What's this group about?"
              maxLength={300}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.description.length}/300 characters
            </p>
          </div>

          {/* Privacy */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Privacy
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: false })}
                className={`w-full flex items-center justify-between p-4 border-2 rounded-lg transition ${
                  !formData.isPublic
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Lock
                    size={24}
                    className={
                      !formData.isPublic ? "text-blue-500" : "text-gray-400"
                    }
                  />
                  <div className="text-left">
                    <p
                      className={`font-semibold ${
                        !formData.isPublic
                          ? "text-blue-900 dark:text-blue-200"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Private
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Only members can join via invite link
                    </p>
                  </div>
                </div>
                {!formData.isPublic && (
                  <Check size={24} className="text-blue-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: true })}
                className={`w-full flex items-center justify-between p-4 border-2 rounded-lg transition ${
                  formData.isPublic
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Globe
                    size={24}
                    className={
                      formData.isPublic ? "text-blue-500" : "text-gray-400"
                    }
                  />
                  <div className="text-left">
                    <p
                      className={`font-semibold ${
                        formData.isPublic
                          ? "text-blue-900 dark:text-blue-200"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Public
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Anyone can find and join this group
                    </p>
                  </div>
                </div>
                {formData.isPublic && (
                  <Check size={24} className="text-blue-500" />
                )}
              </button>
            </div>
          </div>

          {/* Add Friends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Add Friends (Optional)
            </label>

            {/* Search */}
            <div className="relative mb-3">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Selected Friends */}
            {selectedFriends.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedFriends.map((friend) => (
                  <div
                    key={friend._id}
                    className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full"
                  >
                    <span className="text-sm font-medium">
                      {friend.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFriend(friend)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Friend List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredFriends.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {friends.length === 0 ? "No friends yet" : "No friends found"}
                </p>
              ) : (
                filteredFriends.map((friend) => {
                  const isSelected = selectedFriends.find(
                    (f) => f._id === friend._id
                  );

                  return (
                    <button
                      key={friend._id}
                      type="button"
                      onClick={() => toggleFriend(friend)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {friend.username[0].toUpperCase()}
                        </div>
                        <span className="font-medium dark:text-white">
                          {friend.username}
                        </span>
                      </div>
                      {isSelected && (
                        <Check size={20} className="text-blue-500" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !formData.name.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Creating Group...</span>
              </>
            ) : (
              <>
                <Users size={20} />
                <span>Create Group</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

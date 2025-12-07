// frontend/src/pages/FriendChatPage.jsx
// ✅ FULLY FIXED: Block persists + Socket events + Disappearing messages + Unblock button
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Smile,
  Image as ImageIcon,
  MoreVertical,
  UserX,
  Flag,
  Trash2,
  Clock,
  Check,
  Loader,
  Reply,
  X,
  Palette,
  Moon,
  Sun,
  Shield,
  ShieldOff,
  ChevronRight,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import imageCompression from "browser-image-compression";
import { useStore } from "../store/useStore";
import socketClient from "../lib/socket";
import toast from "react-hot-toast";
import { getAvatarSrc } from "../lib/utils";
import { MessageSkeleton } from "../components/SkeletonLoaders";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function FriendChatPage() {
  const navigate = useNavigate();
  const { friendId } = useParams();
  const { user } = useStore();

  const [chatId, setChatId] = useState(null);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [theme, setTheme] = useState("dark");

  // ✅ Block state management
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedBy, setBlockedBy] = useState(null);
  const [blockLoading, setBlockLoading] = useState(false);

  // ✅ REMOVED: Disappearing messages - replaced with 6-day auto-delete system

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ✅ Theme backgrounds
  const themeBackgrounds = {
    dark: "bg-[#0a1014] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZGFyay1wYXR0ZXJuIiB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNTBMMTAwIDEwMCIgc3Ryb2tlPSIjMWExZDIxIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTUwIDBMMTAwIDUwIiBzdHJva2U9IiMxYTFkMjEiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZGFyay1wYXR0ZXJuKSIvPjwvc3ZnPg==')]",
    default: "bg-blue-50 dark:bg-gray-900",
    light: "bg-white",
  };

  // ✅ Navbar colors based on theme
  const navbarColors = {
    dark: "bg-gradient-to-r from-gray-800 to-gray-900",
    default: "bg-gradient-to-r from-blue-500 to-purple-600",
    light: "bg-gradient-to-r from-blue-400 to-indigo-500",
  };

  // ✅ CRITICAL: Initialize on mount and every friendId change
  useEffect(() => {
    if (!friendId || !user?._id) return;

    initChat();

    return () => {
      if (chatId) socketClient.leaveChat(chatId);
    };
  }, [friendId, user?._id]);

  // ✅ CRITICAL: Socket listeners for block/unblock events
  useEffect(() => {
    if (!chatId) return;

    const handleUserBlocked = ({
      chatId: blockedChatId,
      blockedBy: blocker,
    }) => {
      if (blockedChatId === chatId) {
        console.log("🚫 Received user_blocked event, blocker:", blocker);
        setIsBlocked(true);
        setBlockedBy(blocker === user._id ? "me" : "partner");
        toast.error(
          blocker === user._id ? "You blocked this chat" : "Partner blocked you"
        );
      }
    };

    const handleBlockConfirmed = ({ chatId: blockedChatId }) => {
      if (blockedChatId === chatId) {
        console.log("✅ Block confirmed");
        setIsBlocked(true);
        setBlockedBy("me");
      }
    };

    const handleUserUnblocked = ({ chatId: unblockedChatId }) => {
      if (unblockedChatId === chatId) {
        console.log("✅ Received user_unblocked event");
        setIsBlocked(false);
        setBlockedBy(null);
        toast.success("Chat unblocked");
      }
    };

    const handleUnblockConfirmed = ({ chatId: unblockedChatId }) => {
      if (unblockedChatId === chatId) {
        console.log("✅ Unblock confirmed");
        setIsBlocked(false);
        setBlockedBy(null);
      }
    };

    socketClient.on("user_blocked", handleUserBlocked);
    socketClient.on("block_confirmed", handleBlockConfirmed);
    socketClient.on("user_unblocked", handleUserUnblocked);
    socketClient.on("unblock_confirmed", handleUnblockConfirmed);

    return () => {
      socketClient.off("user_blocked", handleUserBlocked);
      socketClient.off("block_confirmed", handleBlockConfirmed);
      socketClient.off("user_unblocked", handleUserUnblocked);
      socketClient.off("unblock_confirmed", handleUnblockConfirmed);
    };
  }, [chatId, user._id]);

  // ✅ Socket listeners for messages
  useEffect(() => {
    if (!chatId) return;
    socketClient.joinChat(chatId);

    const handleNewMessage = (message) => {
      if (message.chatId === chatId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleTyping = ({ chatId: typingChatId, isTyping: typing }) => {
      if (typingChatId === chatId) setIsTyping(typing);
    };

    socketClient.on("message", handleNewMessage);
    socketClient.on("friend_typing", handleTyping);

    return () => {
      socketClient.off("message", handleNewMessage);
      socketClient.off("friend_typing", handleTyping);
    };
  }, [chatId]);

  // ✅ Scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToBottom(messages.length === 1 ? "auto" : "smooth");
      }, 100);
    }
  }, [messages]);

  // ✅ REMOVED: Disappearing timer - replaced with unified 6-day auto-delete

  // ✅ Initialize chat with block status check
  const initChat = async () => {
    setLoading(true);
    try {
      const chatRes = await fetch(`${API_URL}/api/chats/friend/${friendId}`, {
        credentials: "include",
      });

      if (!chatRes.ok) throw new Error("Failed to get friend chat");

      const chatData = await chatRes.json();
      const newChatId = chatData.chatId;
      setChatId(newChatId);

      // ✅ CRITICAL: Check block status first
      await checkBlockStatus(newChatId);

      const friendRes = await fetch(`${API_URL}/api/user/profile/${friendId}`, {
        credentials: "include",
      });

      if (friendRes.ok) {
        const friendData = await friendRes.json();
        setPartner(friendData.user);
      }

      await fetchMessages(newChatId);

      const metaRes = await fetch(`${API_URL}/api/chats/${newChatId}/meta`, {
        credentials: "include",
      });

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        // REMOVED: Disappearing settings - auto-managed by server
      }
    } catch (error) {
      console.error("❌ Init chat error:", error);
      toast.error("Failed to load chat");
      setTimeout(() => navigate("/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Block status check
  const checkBlockStatus = async (cId) => {
    try {
      const res = await fetch(`${API_URL}/api/chats/${cId}/block-status`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setIsBlocked(data.isBlocked);
        setBlockedBy(data.blockedBy);

        if (data.isBlocked) {
          console.log("⚠️ Chat is blocked by:", data.blockedBy);
        }
      }
    } catch (error) {
      console.error("❌ Check block status error:", error);
    }
  };

  const fetchMessages = async (cId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/chats/${cId}/messages?limit=100`,
        {
          credentials: "include",
        }
      );

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("❌ Fetch messages error:", error);
    }
  };

  // ✅ CRITICAL: Send message with block check
  const handleSendMessage = (e) => {
    e.preventDefault();

    if (isBlocked) {
      toast.error(
        blockedBy === "me"
          ? "You blocked this chat. Unblock to send messages."
          : "Partner blocked you. Cannot send messages."
      );
      return;
    }

    if (!input.trim() || !chatId) return;

    const tempMessage = {
      id: `temp_${Date.now()}`,
      sender: user._id,
      text: input,
      timestamp: Date.now(),
      type: "text",
      replyTo: replyTo?.id,
      replyToText: replyTo?.text,
      replyToSender: replyTo?.senderName,
    };

    setMessages((prev) => [...prev, tempMessage]);

    socketClient.sendMessage(chatId, {
      text: input,
      type: "text",
      replyTo: replyTo?.id,
    });

    setInput("");
    setReplyTo(null);
    setShowEmoji(false);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!chatId || isBlocked) return;

    socketClient.sendTyping(chatId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketClient.sendTyping(chatId, false);
    }, 1000);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isBlocked) {
      toast.error("Cannot send images in blocked chat");
      return;
    }

    if (user.isAnonymous) {
      toast.error("Please sign up to send images");
      setTimeout(() => navigate("/signup"), 2000);
      return;
    }

    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      return toast.error("Only JPG/PNG images allowed");
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be under 5MB");
    }

    const uploadToast = toast.loading("Uploading image...");

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("image", compressedFile);

      const res = await fetch(`${API_URL}/api/upload/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      // ✅ CRITICAL: Check response and parse JSON
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      // ✅ CRITICAL: Check if URL exists in response
      if (!data.url) {
        throw new Error("No image URL received from server");
      }

      console.log("✅ Image uploaded successfully:", data.url);

      // ✅ Add temp message to sender's UI immediately
      const tempMsg = {
        id: `temp_${Date.now()}`,
        sender: user._id,
        image: data.url,
        type: "image",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, tempMsg]);

      // ✅ Send via socket
      socketClient.sendMessage(chatId, {
        type: "image",
        image: data.url,
      });

      toast.success("Image sent!", { id: uploadToast });
    } catch (error) {
      console.error("❌ Image upload error:", error);
      toast.error(error.message || "Failed to upload image", {
        id: uploadToast,
      });
    }
  };

  // ✅ Block user handler
  const handleBlockUser = async () => {
    if (!confirm(`Block ${partner?.username}? You won't see their messages.`))
      return;

    setBlockLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chats/${chatId}/block-user`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to block user");

      setIsBlocked(true);
      setBlockedBy("me");
      setShowMenu(false);
      toast.success("User blocked");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBlockLoading(false);
    }
  };

  // ✅ Unblock user handler
  const handleUnblockUser = async () => {
    if (!confirm(`Unblock ${partner?.username}?`)) return;

    setBlockLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chats/${chatId}/unblock-user`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to unblock user");

      setIsBlocked(false);
      setBlockedBy(null);
      toast.success("User unblocked");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBlockLoading(false);
    }
  };

  // ✅ Report Modal Component
  const ReportModal = () => {
    const [reason, setReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const reasons = [
      "Spam",
      "Harassment",
      "Inappropriate Content",
      "Fake Account",
      "Other",
    ];

    const handleSubmit = async () => {
      const finalReason = reason === "Other" ? customReason : reason;
      if (!finalReason.trim()) {
        return toast.error("Please select or enter a reason");
      }

      setSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/api/user/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            reportedUserId: friendId,
            reason: finalReason,
            chatId,
          }),
        });

        if (!res.ok) throw new Error("Failed to submit report");

        toast.success("Report submitted. Thank you!");
        setShowReportModal(false);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Report User
            </h3>
            <button
              onClick={() => setShowReportModal(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Report {partner?.username} for violating community guidelines
          </p>

          <div className="space-y-2 mb-4">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                  reason === r
                    ? "border-red-500 bg-red-50 dark:bg-red-900 dark:bg-opacity-20"
                    : "border-gray-200 dark:border-gray-700 hover:border-red-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {reason === "Other" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none bg-white dark:bg-gray-700 dark:text-white mb-4"
              rows={3}
            />
          )}

          <div className="flex space-x-3">
            <button
              onClick={() => setShowReportModal(false)}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ Empty chat handler
  const handleEmptyChat = async () => {
    if (
      !confirm(
        "Delete all messages permanently? This cannot be undone and will clear messages for both users."
      )
    )
      return;

    try {
      const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setMessages([]);
        toast.success("Chat cleared");
        setShowMenu(false);
      }
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  };


  // ✅ REMOVED: handleDisappearingMessages - replaced with 6-day auto-delete


  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach((msg) => {
      const date = new Date(msg.timestamp || msg.createdAt);
      const key = date.toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return groups;
  };

  const formatDateSeparator = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 animate-slide-in-right">
      {/* ✅ Top Bar */}
      <div className={`text-white p-3 shadow-lg ${navbarColors[theme]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition"
            >
              <ArrowLeft size={22} />
            </button>

            <button
              onClick={() => navigate(`/user/${friendId}`)}
              className="flex items-center space-x-3 hover:bg-white hover:bg-opacity-10 rounded-lg px-2 py-1 transition"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                  {partner?.avatar || partner?.username ? (
                    <img
                      src={getAvatarSrc(partner)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "?"
                  )}
                </div>
                {/* Removed online indicator */}
              </div>

              <div className="text-left">
                <h3 className="font-semibold text-sm">
                  {partner?.username || "Friend"}
                </h3>
                {/* Typing indicator removed - shown at bottom instead */}
              </div>
            </button>
          </div>

          {/* Theme Switcher */}
          <div className="relative mr-2">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition"
            >
              <Palette size={20} />
            </button>

            {showThemeMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowThemeMenu(false)}
                />
                <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-48 z-50 border dark:border-gray-700 overflow-hidden">
                  {[
                    { id: "dark", icon: Moon, label: "Dark" },
                    { id: "default", icon: Palette, label: "Default" },
                    { id: "light", icon: Sun, label: "Light Mode" },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                          theme === t.id
                            ? "bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20"
                            : ""
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-sm dark:text-white">
                          {t.label}
                        </span>
                        {theme === t.id && (
                          <Check size={16} className="ml-auto text-blue-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition"
            >
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />

                <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-56 z-50 border dark:border-gray-700 overflow-hidden">
                  {/* Block/Unblock */}
                  {isBlocked && blockedBy === "me" ? (
                    <button
                      onClick={handleUnblockUser}
                      disabled={blockLoading}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-green-600 dark:text-green-400"
                    >
                      <ShieldOff size={18} />
                      <span>
                        {blockLoading ? "Unblocking..." : "Unblock User"}
                      </span>
                    </button>
                  ) : !isBlocked ? (
                    <button
                      onClick={handleBlockUser}
                      disabled={blockLoading}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-red-600 dark:text-red-400"
                    >
                      <UserX size={18} />
                      <span>{blockLoading ? "Blocking..." : "Block User"}</span>
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      setShowReportModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-700 dark:text-gray-300 border-t dark:border-gray-700"
                  >
                    <Flag size={18} />
                    <span>Report User</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleEmptyChat();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900 dark:hover:bg-opacity-20 flex items-center space-x-3 text-red-600 border-t dark:border-gray-700"
                  >
                    <Trash2 size={18} />
                    <span>Empty Chat</span>
                  </button>


                  {/* ✅ REMOVED: Disappearing Messages menu - replaced with 6-day auto-delete */}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ✅ CRITICAL: Block Warning Banner */}
      {isBlocked && (
        <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-30 border-b-2 border-red-500 p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="text-red-600" size={20} />
            <div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                {blockedBy === "me"
                  ? "You blocked this chat"
                  : "Partner blocked you"}
              </p>
              <p className="text-xs text-red-500 dark:text-red-300">
                {blockedBy === "me"
                  ? "Unblock to send messages"
                  : "You cannot send messages"}
              </p>
            </div>
          </div>
          {blockedBy === "me" && (
            <button
              onClick={handleUnblockUser}
              disabled={blockLoading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center space-x-2"
            >
              <ShieldOff size={16} />
              <span>{blockLoading ? "Unblocking..." : "Unblock"}</span>
            </button>
          )}
        </div>
      )}

      {/* ✅ Messages Area */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto p-4 ${themeBackgrounds[theme]}`}
      >
        {loading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Send size={48} className="mb-4 opacity-50" />
            <p className="text-lg">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex justify-center my-4">
                  <div className="bg-[#202c33] text-white px-3 py-1 rounded-lg text-xs font-medium shadow">
                    {formatDateSeparator(date)}
                  </div>
                </div>

                {msgs.map((msg, index) => (
                  <MessageBubble
                    key={msg.id || msg._id || index}
                    message={msg}
                    userId={user._id}
                    onImageClick={setFullscreenImage}
                    onReply={setReplyTo}
                  />
                ))}
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ✅ Typing Indicator */}
      {isTyping && (
        <div className="px-4 py-2 bg-transparent">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <span>{partner?.username} is typing...</span>
          </div>
        </div>
      )}

      {/* ✅ Reply Preview */}
      {replyTo && (
        <div className="bg-[#2a3942] p-3 flex items-center justify-between border-t border-gray-700">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                Replying to {replyTo.senderName || "Unknown"}
              </p>
              <p className="text-sm text-gray-300 truncate">
                {replyTo.text || "📷 Image"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      )}

      {/* ✅ Input Area */}
      <div className="bg-[#202c33] p-3">
        <div className="relative">
          {showEmoji && !isBlocked && (
            <div className="absolute bottom-full mb-2 right-0 z-50">
              <EmojiPicker
                onEmojiClick={(e) => {
                  setInput(input + e.emoji);
                  setShowEmoji(false);
                }}
                theme="dark"
              />
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="flex items-center space-x-2"
          >
            <button
              type="button"
              onClick={() => !isBlocked && setShowEmoji(!showEmoji)}
              disabled={isBlocked}
              className="p-2 text-gray-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Smile size={24} />
            </button>

            <label
              className={`p-2 text-gray-400 transition ${
                isBlocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-white cursor-pointer"
              }`}
            >
              <ImageIcon size={24} />
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageUpload}
                disabled={isBlocked}
                className="hidden"
              />
            </label>

            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              disabled={isBlocked}
              placeholder={
                isBlocked
                  ? blockedBy === "me"
                    ? "Unblock to send messages"
                    : "Chat is blocked"
                  : "Type a message..."
              }
              className="flex-1 px-4 py-3 bg-[#2a3942] text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={!input.trim() || isBlocked}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* ✅ Modals */}
      {showReportModal && <ReportModal />}

      {/* ✅ Fullscreen Image */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
            }}
            className="absolute top-5 right-5 text-white text-3xl font-bold hover:scale-110 transition bg-gray-800 bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center"
          >
            ✕
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen"
            className="max-w-[90%] max-h-[90%] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ✅ Message Bubble Component
function MessageBubble({ message, userId, onImageClick, onReply }) {
  const isMe = message.sender === userId;

  return (
    <div
      className={`flex mb-3 group ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div className="relative max-w-[75%] sm:max-w-[65%]">
        {message.replyTo && (
          <div
            className={`mb-1 px-3 py-2 rounded-lg text-xs ${
              isMe ? "bg-[#0a3d5c] bg-opacity-60" : "bg-[#1a5a7a] bg-opacity-60"
            }`}
          >
            <p className="text-green-400 font-semibold truncate">
              {message.replyToSender || "Unknown"}
            </p>
            <p className="text-gray-300 truncate">
              {message.replyToText || "📷 Image"}
            </p>
          </div>
        )}

        <div
          className={`rounded-lg shadow-md ${
            isMe
              ? "bg-[#0c2853] text-white rounded-br-none"
              : "bg-[#227fb4] text-white rounded-bl-none"
          }`}
        >
          {message.image ? (
            <div className="p-1">
              <img
                src={message.image}
                alt="Shared"
                className="rounded-lg max-w-[280px] max-h-[320px] object-cover cursor-pointer hover:opacity-90 transition"
                onClick={() => onImageClick(message.image)}
              />
              <div className="flex items-center justify-end space-x-1 mt-1 px-2 pb-1">
                <p className="text-xs text-gray-300">
                  {new Date(
                    message.timestamp || message.createdAt
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {isMe && <MessageStatus status={message.status} />}
              </div>
            </div>
          ) : (
            <div className="px-3 py-2">
              <p className="text-sm break-words whitespace-pre-wrap">
                {message.text}
              </p>
              <div className="flex items-center justify-end space-x-1 mt-1">
                <p className="text-xs text-gray-300">
                  {new Date(
                    message.timestamp || message.createdAt
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {isMe && <MessageStatus status={message.status} />}
              </div>
            </div>
          )}
        </div>

        {!isMe && (
          <button
            onClick={() =>
              onReply({
                id: message.id || message._id,
                text: message.text,
                image: message.image,
                senderName: message.senderName || "Friend",
              })
            }
            className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2a3942] p-1.5 rounded-full hover:bg-[#374248]"
          >
            <Reply size={16} className="text-gray-300" />
          </button>
        )}
      </div>
    </div>
  );
}

// ✅ Message Status Component
function MessageStatus({ status }) {
  if (status === "read") {
    return (
      <div className="flex">
        <Check size={14} className="text-[#53bdeb] -mr-2" />
        <Check size={14} className="text-[#53bdeb]" />
      </div>
    );
  }
  if (status === "delivered") {
    return (
      <div className="flex">
        <Check size={14} className="text-gray-400 -mr-2" />
        <Check size={14} className="text-gray-400" />
      </div>
    );
  }
  return <Check size={14} className="text-gray-400" />;
}

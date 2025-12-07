// frontend/src/pages/GroupChatPage.jsx
// ✅ FIXED: Messages persist after refresh, proper loading

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Smile,
  Image as ImageIcon,
  MoreVertical,
  Link as LinkIcon,
  LogOut,
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
  ChevronRight,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import imageCompression from "browser-image-compression";
import { useStore } from "../store/useStore";
import socketClient from "../lib/socket";
import toast from "react-hot-toast";
import { useImageUpload } from "../hooks/useImageUpload";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function GroupChatPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { user } = useStore();

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showDisappearMenu, setShowDisappearMenu] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [disappearingDuration, setDisappearingDuration] = useState(10080);
  const [isOwner, setIsOwner] = useState(false);
  const [disappearingMessagesToRemove, setDisappearingMessagesToRemove] =
    useState(new Set());

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const disappearingTimerRef = useRef(null);
  const hasInitialized = useRef(false);

  const themeBackgrounds = {
    dark: "bg-[#0a1014] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZGFyay1wYXR0ZXJuIiB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNTBMMTAwIDEwMCIgc3Ryb2tlPSIjMWExZDIxIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTUwIDBMMTAwIDUwIiBzdHJva2U9IiMxYTFkMjEiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZGFyay1wYXR0ZXJuKSIvPjwvc3ZnPg==')]",
    default: "bg-blue-50 dark:bg-gray-900",
    light: "bg-white",
  };

  const navbarColors = {
    dark: "bg-gradient-to-r from-gray-800 to-gray-900",
    default: "bg-gradient-to-r from-blue-500 to-purple-600",
    light: "bg-gradient-to-r from-blue-400 to-indigo-500",
  };

  // ✅ CRITICAL: Initialize once with proper dependency
  useEffect(() => {
    if (!groupId || !user?._id || hasInitialized.current) return;

    hasInitialized.current = true;
    console.log("🚀 Initializing group chat:", groupId);

    initGroupChat();

    return () => {
      console.log("🧹 Cleanup: Leaving group", groupId);
      if (socketClient.connected) {
        socketClient.socket?.emit("leave_group", { groupId });
      }
      if (disappearingTimerRef.current) {
        clearInterval(disappearingTimerRef.current);
      }
      hasInitialized.current = false;
    };
  }, [groupId, user?._id]);

  // ✅ Socket connection management
  useEffect(() => {
    if (!user?._id || !groupId) return;

    // Ensure socket is connected
    if (!socketClient.connected) {
      console.log("🔌 Connecting socket...");
      socketClient.connect(user._id);
    }

    // Wait for connection before joining
    const handleConnect = () => {
      console.log("✅ Socket connected, joining group:", groupId);
      socketClient.joinGroup(groupId);
    };

    if (socketClient.connected) {
      socketClient.joinGroup(groupId);
    } else {
      socketClient.socket?.on("connect", handleConnect);
    }

    return () => {
      socketClient.socket?.off("connect", handleConnect);
    };
  }, [user?._id, groupId]);

  // ✅ Socket event listeners
  useEffect(() => {
    if (!groupId || !socketClient.socket) return;

    const handleGroupMessage = (data) => {
      console.log("📨 Received group message:", data);
      if (data.groupId === groupId) {
        setMessages((prev) => {
          // Prevent duplicates
          const exists = prev.some((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
      }
    };

    const handleTyping = (data) => {
      if (data.groupId === groupId && data.userId !== user._id) {
        if (data.isTyping) {
          setTypingUsers((prev) => [...new Set([...prev, data.username])]);
        } else {
          setTypingUsers((prev) => prev.filter((u) => u !== data.username));
        }
      }
    };

    const handleReaction = (data) => {
      if (data.groupId === groupId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, reactions: data.reactions }
              : msg
          )
        );
      }
    };

    const handleDisappearingUpdated = (data) => {
      if (data.groupId === groupId) {
        setDisappearingDuration(data.duration);
        toast(`Owner changed timer to ${formatGroupDuration(data.duration)}`, {
          icon: "⏱️",
        });
      }
    };

    const handleMessagesDisappeared = (data) => {
      if (data.groupId === groupId) {
        console.log("💨 Messages disappeared, refreshing...");
        if (group?.chatId) {
          fetchMessages(group.chatId);
        }
        toast(`${data.deletedCount} message(s) disappeared`, { icon: "💨" });
      }
    };

    socketClient.socket.on("group_message", handleGroupMessage);
    socketClient.socket.on("group_typing_update", handleTyping);
    socketClient.socket.on("reaction_added", handleReaction);
    socketClient.socket.on(
      "group_disappearing_updated",
      handleDisappearingUpdated
    );
    socketClient.socket.on(
      "group_messages_disappeared",
      handleMessagesDisappeared
    );

    console.log("✅ Socket listeners attached");

    return () => {
      console.log("🧹 Cleanup: Removing socket listeners");
      socketClient.socket?.off("group_message", handleGroupMessage);
      socketClient.socket?.off("group_typing_update", handleTyping);
      socketClient.socket?.off("reaction_added", handleReaction);
      socketClient.socket?.off(
        "group_disappearing_updated",
        handleDisappearingUpdated
      );
      socketClient.socket?.off(
        "group_messages_disappeared",
        handleMessagesDisappeared
      );
    };
  }, [groupId, user?._id, group?.chatId]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom("smooth"), 100);
    }
  }, [messages]);

  // Typing timeout
  useEffect(() => {
    if (typingUsers.length > 0) {
      const timeout = setTimeout(() => setTypingUsers([]), 3000);
      return () => clearTimeout(timeout);
    }
  }, [typingUsers]);

  // Disappearing messages timer
  useEffect(() => {
    if (!disappearingDuration || disappearingDuration === 0) {
      if (disappearingTimerRef.current) {
        clearInterval(disappearingTimerRef.current);
        disappearingTimerRef.current = null;
      }
      return;
    }

    if (disappearingTimerRef.current)
      clearInterval(disappearingTimerRef.current);

    disappearingTimerRef.current = setInterval(() => {
      const now = Date.now();
      const cutoffTime = now - disappearingDuration * 60 * 1000;

      setMessages((prev) => {
        const toRemove = new Set();

        prev.forEach((msg) => {
          const msgTime = msg.timestamp || new Date(msg.createdAt).getTime();
          if (msgTime <= cutoffTime) {
            toRemove.add(msg.id || msg._id);
          }
        });

        if (toRemove.size > 0) {
          console.log(`💨 Client: Removing ${toRemove.size} expired messages`);
          setDisappearingMessagesToRemove(toRemove);

          setTimeout(() => {
            setMessages((prevMsgs) =>
              prevMsgs.filter((m) => !toRemove.has(m.id || m._id))
            );
            setDisappearingMessagesToRemove(new Set());
          }, 1000);
        }

        return prev;
      });
    }, 5000);

    return () => {
      if (disappearingTimerRef.current)
        clearInterval(disappearingTimerRef.current);
    };
  }, [disappearingDuration]);

  const initGroupChat = async () => {
    setLoading(true);
    try {
      console.log("📡 Fetching group data for:", groupId);

      const groupRes = await fetch(`${API_URL}/api/groups/${groupId}`, {
        credentials: "include",
      });

      if (!groupRes.ok) {
        throw new Error("Failed to load group");
      }

      const groupData = await groupRes.json();
      console.log("✅ Group data loaded:", groupData.group.name);

      setGroup(groupData.group);
      setIsOwner(groupData.group.owner._id === user._id);

      // ✅ CRITICAL: Fetch messages
      console.log("📡 Fetching messages for chatId:", groupData.group.chatId);
      await fetchMessages(groupData.group.chatId);

      // Fetch disappearing settings
      try {
        const disappearRes = await fetch(
          `${API_URL}/api/groups/${groupId}/disappearing`,
          { credentials: "include" }
        );

        if (disappearRes.ok) {
          const disappearData = await disappearRes.json();
          setDisappearingDuration(disappearData.duration || 10080);
          console.log("⏱️ Disappearing duration:", disappearData.duration);
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch disappearing settings:", err);
      }
    } catch (error) {
      console.error("❌ Init group chat error:", error);
      toast.error("Failed to load group");
      setTimeout(() => navigate("/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      console.log("📡 Fetching messages from API for chat:", chatId);

      const res = await fetch(
        `${API_URL}/api/chats/${chatId}/messages?limit=100`,
        { credentials: "include" }
      );

      if (!res.ok) {
        console.error("❌ Failed to fetch messages, status:", res.status);
        return;
      }

      const data = await res.json();
      console.log(`✅ Loaded ${data.messages?.length || 0} messages from API`);

      setMessages(data.messages || []);

      // Scroll to bottom after loading
      setTimeout(() => scrollToBottom("auto"), 200);
    } catch (error) {
      console.error("❌ Fetch messages error:", error);
      toast.error("Failed to load messages");
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!input.trim() || !groupId) {
      console.warn("⚠️ Cannot send: empty input or no groupId");
      return;
    }

    // Extract mentions
    const mentionPattern = /@(\w+)/g;
    const matches = [...input.matchAll(mentionPattern)];
    const mentionedUserIds = [];

    matches.forEach((match) => {
      const username = match[1];
      const member = group?.members?.find((m) => m.username === username);
      if (member) {
        mentionedUserIds.push(member._id);
      }
    });

    const messageData = {
      groupId,
      text: input,
      type: "text",
      mentions: mentionedUserIds,
      replyTo: replyTo?.id || null,
    };

    console.log("📤 Sending group message:", messageData);

    const sent = socketClient.sendGroupMessage(messageData);

    if (sent) {
      setInput("");
      setReplyTo(null);
      setShowEmoji(false);
      console.log("✅ Message sent successfully");
    } else {
      toast.error("Failed to send message - socket not connected");
    }
  };

  // const handleImageUpload = async (e) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   if (user.isAnonymous) {
  //     toast.error("Please sign up to send images");
  //     setTimeout(() => navigate("/signup"), 2000);
  //     return;
  //   }

  //   if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
  //     return toast.error("Only JPG/PNG images allowed");
  //   }

  //   if (file.size > 5 * 1024 * 1024) {
  //     return toast.error("Image must be under 5MB");
  //   }

  //   const uploadToast = toast.loading("Uploading image...");

  //   try {
  //     const compressedFile = await imageCompression(file, {
  //       maxSizeMB: 1,
  //       maxWidthOrHeight: 1024,
  //       useWebWorker: true,
  //     });

  //     const formData = new FormData();
  //     formData.append("image", compressedFile);

  //     const res = await fetch(`${API_URL}/api/upload/image`, {
  //       method: "POST",
  //       credentials: "include",
  //       body: formData,
  //     });

  //     if (!res.ok) throw new Error("Upload failed");

  //     const data = await res.json();

  //     const messageData = {
  //       groupId,
  //       image: data.url,
  //       type: "image",
  //       replyTo: replyTo?.id || null,
  //     };

  //     console.log("📤 Sending group image:", messageData);

  //     const sent = socketClient.sendGroupMessage(messageData);

  //     if (sent) {
  //       setReplyTo(null);
  //       toast.success("Image sent!", { id: uploadToast });
  //     } else {
  //       throw new Error("Socket not connected");
  //     }
  //   } catch (error) {
  //     console.error("❌ Image upload error:", error);
  //     toast.error("Failed to upload image", { id: uploadToast });
  //   }
  // };
  // Inside component:
  const { uploadImage, uploading } = useImageUpload();

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (user.isAnonymous) {
      toast.error("Please sign up to send images");
      setTimeout(() => navigate("/signup"), 2000);
      return;
    }

    // ✅ Upload using hook (handles ALL formats)
    const imageUrl = await uploadImage(file);

    if (!imageUrl) return; // Upload failed

    // ✅ Send to group
    const messageData = {
      groupId,
      image: imageUrl,
      type: "image",
      replyTo: replyTo?.id || null,
    };

    const sent = socketClient.sendGroupMessage(messageData);

    if (sent) {
      setReplyTo(null);
    } else {
      toast.error("Failed to send image");
    }
  };
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    const lastWord = value.split(" ").pop();
    if (lastWord.startsWith("@")) {
      setMentionSearch(lastWord.slice(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }

    socketClient.sendGroupTyping(groupId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketClient.sendGroupTyping(groupId, false);
    }, 1000);
  };

  const handleMentionSelect = (member) => {
    const words = input.split(" ");
    words[words.length - 1] = `@${member.username} `;
    setInput(words.join(" "));
    setShowMentions(false);
    inputRef.current?.focus();
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
      setShowMenu(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Leave this group? You'll lose access to all messages."))
      return;

    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}/leave`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to leave group");

      toast.success("Left group");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleEmptyChat = async () => {
    if (!confirm("Delete all messages permanently? This cannot be undone."))
      return;

    try {
      const res = await fetch(`${API_URL}/api/chats/${group.chatId}/messages`, {
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

  const handleDisappearingMessages = async (duration) => {
    if (!isOwner) {
      toast.error("Only group owner can change this setting");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}/disappearing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ duration }),
      });

      if (!res.ok) throw new Error("Failed to set timer");

      const data = await res.json();
      setDisappearingDuration(duration);
      toast.success(data.message);
      setShowDisappearMenu(false);
    } catch (error) {
      console.error("❌ Error:", error);
      toast.error("Failed to set disappearing messages");
    }
  };

  const formatGroupDuration = (minutes) => {
    if (minutes === 1440) return "24 hours";
    if (minutes === 4320) return "3 days";
    if (minutes === 10080) return "7 days";
    if (minutes === 21600) return "15 days";
    return `${minutes} minutes`;
  };

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

  const filteredMembers = group?.members?.filter((m) =>
    m.username.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const groupedMessages = groupMessagesByDate(messages);

  // Disappearing Messages Modal
  const DisappearingMessageModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock size={24} className="text-white" />
              <h3 className="text-xl font-bold text-white">
                Disappearing Messages
              </h3>
            </div>
            <button
              onClick={() => setShowDisappearMenu(false)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {isOwner
                ? "As group owner, you can control when messages disappear."
                : "Only the group owner can change this setting."}
            </p>

            <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                Current Setting:
              </p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {formatGroupDuration(disappearingDuration)}
              </p>
            </div>

            {isOwner && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {[
                  {
                    label: "24 hours",
                    value: 1440,
                    description: "Messages disappear after 1 day",
                  },
                  {
                    label: "3 days",
                    value: 4320,
                    description: "Messages disappear after 3 days",
                  },
                  {
                    label: "7 days",
                    value: 10080,
                    description: "Default setting",
                    isDefault: true,
                  },
                  {
                    label: "15 days",
                    value: 21600,
                    description: "Messages disappear after 15 days",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleDisappearingMessages(option.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                      disappearingDuration === option.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 shadow-md"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {option.label}
                          </span>
                          {option.isDefault && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {option.description}
                        </p>
                      </div>
                      {disappearingDuration === option.value && (
                        <Check
                          size={20}
                          className="text-blue-500 flex-shrink-0 ml-2"
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isOwner && (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                Only {group?.owner?.username || "the owner"} can modify this
                setting
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Group not found</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Bar */}
      <div className={`${navbarColors[theme]} text-white p-3 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition"
            >
              <ArrowLeft size={22} />
            </button>
            <button
              onClick={() => navigate(`/groups/${groupId}/profile`)}
              className="flex items-center space-x-3 hover:bg-white hover:bg-opacity-10 rounded-lg px-2 py-1 transition"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
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
              <div className="text-left">
                <h3 className="font-semibold text-sm">{group.name}</h3>
                {typingUsers.length > 0 ? (
                  <p className="text-xs text-white opacity-80">
                    {typingUsers.join(", ")} typing...
                  </p>
                ) : (
                  <p className="text-xs text-white opacity-80">
                    {group.members?.length} members
                  </p>
                )}
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
                ></div>
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
                ></div>
                <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-56 z-50 border dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={handleCopyInviteLink}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-700 dark:text-gray-300"
                  >
                    <LinkIcon size={18} />
                    <span>Copy Invite Link</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate(`/groups/${groupId}/profile`);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-700 dark:text-gray-300 border-t dark:border-gray-700"
                  >
                    <Flag size={18} />
                    <span>Group Profile</span>
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

                  <button
                    onClick={() => {
                      setShowDisappearMenu(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-gray-700 dark:text-gray-300 border-t dark:border-gray-700"
                  >
                    <div className="flex items-center space-x-3">
                      <Clock size={18} />
                      <span>Disappearing Messages</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-green-500 font-medium">
                        {disappearingDuration === 1440
                          ? "24h"
                          : disappearingDuration === 4320
                          ? "3d"
                          : disappearingDuration === 10080
                          ? "7d"
                          : "15d"}
                      </span>
                      <ChevronRight size={16} />
                    </div>
                  </button>

                  <button
                    onClick={handleLeaveGroup}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-red-600 dark:text-red-400 border-t dark:border-gray-700"
                  >
                    <LogOut size={18} />
                    <span>Leave Group</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto p-4 ${themeBackgrounds[theme]}`}
      >
        {messages.length === 0 ? (
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
                  <GroupMessageBubble
                    key={msg.id || msg._id || index}
                    message={msg}
                    userId={user._id}
                    onImageClick={setFullscreenImage}
                    onReply={setReplyTo}
                    isDisappearing={disappearingMessagesToRemove.has(
                      msg.id || msg._id
                    )}
                  />
                ))}
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
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
            <span>{typingUsers.join(", ")} typing...</span>
          </div>
        </div>
      )}

      {/* Reply Preview */}
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

      {/* Mention Suggestions */}
      {showMentions && filteredMembers?.length > 0 && (
        <div className="bg-[#2a3942] border-t border-gray-700 max-h-48 overflow-y-auto">
          {filteredMembers.slice(0, 5).map((member) => (
            <button
              key={member._id}
              onClick={() => handleMentionSelect(member)}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {member.username[0].toUpperCase()}
              </div>
              <span className="text-white">{member.username}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#202c33] p-3">
        <div className="relative">
          {showEmoji && (
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
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-2 text-gray-400 hover:text-white transition"
            >
              <Smile size={24} />
            </button>

            <label className="p-2 text-gray-400 hover:text-white cursor-pointer transition">
              <ImageIcon size={24} />
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message... (use @ to mention)"
              className="flex-1 px-4 py-3 bg-[#2a3942] text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      {showDisappearMenu && <DisappearingMessageModal />}

      {/* Fullscreen Image */}
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

// Message Bubble Component
function GroupMessageBubble({
  message,
  userId,
  onImageClick,
  onReply,
  isDisappearing,
}) {
  const isMe = message.sender === userId;

  return (
    <div
      className={`flex mb-3 group ${isMe ? "justify-end" : "justify-start"} ${
        isDisappearing ? "animate-puff" : ""
      }`}
    >
      <div className="relative max-w-[75%] sm:max-w-[65%]">
        {!isMe && (
          <p className="text-xs font-bold text-blue-400 mb-1 ml-2">
            {message.senderName || "Unknown"}
          </p>
        )}

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
              </div>
            </div>
          )}
        </div>

        {message.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className="bg-gray-700 rounded-full px-2 py-1 text-xs text-white"
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

        {!isMe && (
          <button
            onClick={() =>
              onReply({
                id: message.id || message._id,
                text: message.text,
                image: message.image,
                senderName: message.senderName || "Unknown",
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

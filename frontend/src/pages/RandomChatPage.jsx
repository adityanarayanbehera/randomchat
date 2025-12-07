// frontend/src/pages/RandomChatPage.jsx
// ✅ OPTIMIZED: Added Settings icon in header
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Send,
  SkipForward,
  XCircle,
  UserPlus,
  Smile,
  ArrowLeft,
  Check,
  User as UserIcon,
  MessageCircle,
  X as XIcon,
  Settings,
  MoreVertical,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import imageCompression from "browser-image-compression";
import { useStore } from "../store/useStore";
import socketClient from "../lib/socket";
import toast from "react-hot-toast";
import { Image as ImageIcon } from "lucide-react";
import { getAvatarSrc } from "../lib/utils";
import { MessageSkeleton } from "../components/SkeletonLoaders";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function RandomChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useStore();

  const existingRoomId = searchParams.get("roomId");

  const [chatId, setChatId] = useState(existingRoomId || null);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  // ✅ Intro message states
  const [introMessage, setIntroMessage] = useState("Hello");
  const [showIntroPopup, setShowIntroPopup] = useState(false);
  const [savingIntro, setSavingIntro] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ✅ CRITICAL: Prevent duplicate API calls
  const hasLoadedMessages = useRef(false);
  const hasFetchedIntro = useRef(false);
  const socketInitialized = useRef(false);

  // ✅ Load intro message from localStorage (instant UI update)
  useEffect(() => {
    const localIntro = localStorage.getItem("introMessage");
    if (localIntro) {
      setIntroMessage(localIntro);
    }
  }, []);

  // ✅ OPTIMIZED: Fetch intro message only ONCE
  useEffect(() => {
    if (!user?._id || hasFetchedIntro.current) return;

    hasFetchedIntro.current = true;

    fetch(`${API_URL}/api/user/intro-message`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const msg = data.message || "Hello";
          setIntroMessage(msg);
          localStorage.setItem("introMessage", msg);
        }
      })
      .catch((err) => console.error("Failed to fetch intro message:", err));
  }, [user?._id]);

  // ✅ Save intro message handler
  const handleSaveIntroMessage = async () => {
    const trimmed = introMessage.trim();

    if (!trimmed) {
      toast.error("Intro message cannot be empty");
      return;
    }

    if (trimmed.length > 200) {
      toast.error("Intro message must be 200 characters or less");
      return;
    }

    setSavingIntro(true);

    try {
      const res = await fetch(`${API_URL}/api/user/intro-message`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");

      localStorage.setItem("introMessage", trimmed);
      toast.success("✨ Intro message saved!");
      setShowIntroPopup(false);
    } catch (error) {
      console.error("❌ Intro update error:", error);
      toast.error(error.message);
    } finally {
      setSavingIntro(false);
    }
  };

  // ✅ OPTIMIZED: Load existing chat only ONCE
  useEffect(() => {
    if (existingRoomId && !hasLoadedMessages.current) {
      console.log("📂 Loading existing chat:", existingRoomId);
      hasLoadedMessages.current = true;
      loadExistingChat(existingRoomId);
    }
  }, [existingRoomId]);

  const loadExistingChat = async (roomId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/chats/${roomId}/messages?limit=100`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Loaded messages:", data.messages.length);
        setMessages(data.messages || []);

        if (data.messages.length > 0) {
          const firstMsg = data.messages[0];
          const partnerId =
            firstMsg.sender === user._id ? firstMsg.recipient : firstMsg.sender;

          setPartner({
            _id: partnerId,
            username: "Chat Partner",
          });
        }

        setChatId(roomId);
        socketClient.joinChat(roomId);
      }
    } catch (error) {
      console.error("❌ Load chat error:", error);
    }
  };

  // ✅ OPTIMIZED: Initialize socket only ONCE
  useEffect(() => {
    if (!user || socketInitialized.current) {
      if (!user) navigate("/");
      return;
    }

    socketInitialized.current = true;
    socketClient.connect(user._id);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isSearching && !chatId) {
          socketClient.socket.emit("leave_queue", { userId: user._id });
          setIsSearching(false);
          toast("Search paused (tab inactive)", { icon: "⸺" });
        }
      } else {
        if (!socketClient.connected) {
          socketClient.connect(user._id);
        }
      }
    };

    const handleBeforeUnload = () => {
      if (isSearching) {
        socketClient.socket.emit("leave_queue", { userId: user._id });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // ✅ Socket event listeners
    socketClient.on("queue_joined", () => {
      setIsSearching(true);
      toast("Finding a partner...", { icon: "🔍" });
    });

    socketClient.on("matched", (data) => {
      console.log("✅ Matched:", data);
      setChatId(data.roomId);
      setPartner(data.partner);
      setMessages([]);
      setIsSearching(false);
      setChatEnded(false);
      setFriendRequestSent(false);
      toast.success(`Connected with ${data.partner.username}!`);
    });

    socketClient.on("match_timeout", () => {
      setIsSearching(false);
      toast.error("No users available. Try again later.");
    });

    socketClient.on("message", (msg) => {
      if (msg.chatId === chatId || msg.roomId === chatId) {
        setMessages((prev) => [...prev, msg]);

        if (msg.isIntroMessage && msg.sender !== user._id) {
          toast("✨ Partner sent their intro message", {
            icon: "👋",
            duration: 2000,
          });
        }
      }
    });

    socketClient.on("ready_for_intro", ({ chatId: introChatId }) => {
      console.log("🪄 Ready for intro message for chat:", introChatId);

      socketClient.sendTyping(introChatId, true);
      setTimeout(() => socketClient.sendTyping(introChatId, false), 800);

      setTimeout(() => {
        socketClient.sendMessage(introChatId, {
          text: user.introMessage || introMessage || "Hello",
          type: "text",
          isIntroMessage: true,
        });
        console.log("💬 Sent intro message from frontend");
      }, 1000);
    });

    socketClient.on("friend_request_popup", (requestData) => {
      if (requestData.chatId === chatId) {
        setMessages((prev) => [...prev, requestData]);
      }
    });

    socketClient.on("friend_request_sent", (data) => {
      if (data.success) {
        setFriendRequestSent(true);
        toast.success("Friend request sent!");
      }
    });

    socketClient.on("friend_request_accepted", (data) => {
      if (data.chatId === chatId) {
        setMessages((prev) => [...prev, data.message]);
        toast.success("You are now friends!");
        setTimeout(() => {
          navigate(`/friend-chat/${data.friendId}`);
        }, 2000);
      }
    });

    socketClient.on(
      "friend_typing",
      ({ chatId: typingChatId, isTyping: typing }) => {
        if (typingChatId === chatId) {
          setIsTyping(typing);
        }
      }
    );

    socketClient.on("partner_skipped", ({ chatId: skippedChatId }) => {
      if (skippedChatId === chatId) {
        setMessages((prev) => [
          ...prev,
          {
            id: `system_${Date.now()}`,
            type: "system",
            text: "Partner left the chat",
            timestamp: Date.now(),
          },
        ]);
        setChatEnded(true);
        toast("Partner left the chat", { icon: "👋" });
      }
    });

    socketClient.on("chat_ended", ({ chatId: endedChatId, reason }) => {
      console.log("🛑 Received chat_ended event:", { endedChatId, reason, currentChatId: chatId });
      
      if (endedChatId === chatId) {
        console.log("✅ Chat IDs match - terminating chat");
        setMessages((prev) => [
          ...prev,
          {
            id: `system_${Date.now()}`,
            type: "system",
            text: reason || "Chat ended by partner",
            timestamp: Date.now(),
          },
        ]);
        setChatEnded(true);
        toast(reason || "Chat ended", { icon: "🛑" });
      } else {
        console.log("⚠️ Chat IDs don't match - ignoring event");
      }
    });

    // ✅ CRITICAL: Cleanup all listeners on unmount
    return () => {
      socketClient.off("queue_joined");
      socketClient.off("matched");
      socketClient.off("match_timeout");
      socketClient.off("message");
      socketClient.off("ready_for_intro");
      socketClient.off("friend_request_popup");
      socketClient.off("friend_request_sent");
      socketClient.off("friend_request_accepted");
      socketClient.off("friend_typing");
      socketClient.off("partner_skipped");
      socketClient.off("chat_ended");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Reset initialization flag
      socketInitialized.current = false;
    };
  }, [user, chatId, navigate, isSearching, introMessage]);

  // ✅ Join chat room when chatId changes
  useEffect(() => {
    if (chatId) {
      socketClient.joinChat(chatId);
    }
  }, [chatId]);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartChat = () => {
    if (isSearching) return;

    console.log("🔍 Starting new random chat search...");
    resetChat();
    setIsSearching(true);
    setChatEnded(false);

    if (socketClient.connected) {
      socketClient.socket.emit("join_queue", { filters: {} });
    } else {
      socketClient.connect(user._id);
      setTimeout(() => {
        socketClient.socket.emit("join_queue", { filters: {} });
      }, 500);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !chatId || chatEnded) return;

    const tempId = `temp_${Date.now()}`;
    const message = {
      tempId,
      id: tempId,
      sender: user._id,
      text: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, message]);

    socketClient.sendMessage(chatId, {
      text: input,
      type: "text",
    });

    setInput("");
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!chatId || chatEnded) return;

    socketClient.sendTyping(chatId, true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketClient.sendTyping(chatId, false);
    }, 1000);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (user.isAnonymous) {
      toast.error("Please sign up to send images");
      setTimeout(() => navigate("/signup"), 2000);
      return;
    }

    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Only JPG/PNG images allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }

      const data = await res.json();

      const tempMsg = {
        id: `temp_${Date.now()}`,
        sender: user._id,
        image: data.url,
        type: "image",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, tempMsg]);

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

  const handleSkip = () => {
    if (!chatId) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `system_${Date.now()}`,
        type: "system",
        text: "You left the chat",
        timestamp: Date.now(),
      },
    ]);

    socketClient.socket.emit("skip", { chatId });
    toast("Finding new partner...", { icon: "🔍" });

    resetChat();
    setTimeout(() => handleStartChat(), 1000);
  };

  const handleEnd = () => {
    if (!chatId) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `system_${Date.now()}`,
        type: "system",
        text: "You ended the chat",
        timestamp: Date.now(),
      },
    ]);

    socketClient.socket.emit("end_chat", { chatId });
    setChatEnded(true);
    toast("Chat ended", { icon: "✅" });

    setTimeout(() => {
      resetChat();
      navigate("/dashboard");
    }, 2000);
  };

  const handleSendFriendRequest = () => {
    if (user.isAnonymous) {
      toast.error("Please sign up to send friend requests");
      return;
    }

    if (friendRequestSent) {
      toast("Request already sent", { icon: "⏳" });
      return;
    }

    const senderBubble = {
      id: `friend_request_sent_${Date.now()}`,
      type: "friend_request_sent",
      sender: user._id,
      text: "Friend request sent",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, senderBubble]);
    setFriendRequestSent(true);

    socketClient.sendFriendRequest(partner._id, chatId);
  };

  const handleAcceptFriendRequest = (requestId) => {
    socketClient.socket.emit("accept_friend_request", {
      requestId,
      chatId,
    });
  };

  const handleViewProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  const resetChat = () => {
    if (chatId) {
      socketClient.leaveChat(chatId);
    }
    setChatId(null);
    setPartner(null);
    setMessages([]);
    setIsSearching(false);
    setChatEnded(false);
    setFriendRequestSent(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const charCount = introMessage.length;
  const charLimit = 200;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>

          {partner ? (
            <div className="flex items-center space-x-3 flex-1 ml-3 px-2 py-1">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src="/default-avatars/user-svgrepo-com.svg"
                  alt="User"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold">{partner.username}</h3>
                {isTyping && (
                  <p className="text-left text-xs text-blue-100">typing...</p>
                )}
              </div>
            </div>
          ) : (
            <h3 className="font-bold flex-1 text-center">Random Chat</h3>
          )}

          {/* ✅ Settings Icon & Friend Request */}
          <div className="flex items-center space-x-2">
            {partner && !chatEnded && !friendRequestSent && (
              <button
                onClick={handleSendFriendRequest}
                className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
                title="Send Friend Request"
              >
                <UserPlus size={20} />
              </button>
            )}

            {/* Settings Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
                title="More Options"
              >
                <MoreVertical size={20} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-left"
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {!chatId && !isSearching && !chatEnded && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <p className="text-lg font-medium">Start a random chat!</p>
            <p className="text-sm mt-2">Click below to find a stranger</p>
          </div>
        )}

        {isSearching && (
          <div className="flex flex-col items-center justify-center space-y-3 text-blue-600 mt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="font-medium">Finding you a chat partner...</span>
          </div>
        )}

        {messages.map((msg, index) => {
          if (msg.type === "system") {
            return (
              <div key={msg.id || index} className="flex justify-center my-3">
                <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-full text-xs">
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.type === "friend_request_sent") {
            return (
              <div key={msg.id || index} className="flex justify-center my-4">
                <div className="bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900 dark:to-teal-900 p-4 rounded-2xl shadow-lg max-w-xs">
                  <div className="text-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2">
                      ✓
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-2">
                      Friend Request Sent
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Sent to {partner?.username}
                    </p>
                  </div>

                  <button
                    onClick={() => handleViewProfile(partner?._id)}
                    className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center space-x-2"
                  >
                    <UserIcon size={16} />
                    <span>View Their Profile</span>
                  </button>
                </div>
              </div>
            );
          }

          if (msg.type === "friend_request") {
            const isReceived = msg.sender !== user._id;

            if (isReceived) {
              return (
                <div key={msg.id || index} className="flex justify-center my-4">
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 p-4 rounded-2xl shadow-lg max-w-xs">
                    <div className="text-center mb-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2">
                        {msg.senderData.username[0].toUpperCase()}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        Friend Request from
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {msg.senderData.username}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleViewProfile(msg.sender)}
                        className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center justify-center space-x-2"
                      >
                        <UserIcon size={16} />
                        <span>View Profile</span>
                      </button>
                      <button
                        onClick={() => handleAcceptFriendRequest(msg.requestId)}
                        className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition flex items-center justify-center space-x-2"
                      >
                        <Check size={16} />
                        <span>Accept Request</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          }

          if (msg.type === "friend_accepted") {
            return (
              <div key={msg.id || index} className="flex justify-center my-3">
                <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-3 rounded-2xl text-sm font-medium max-w-xs text-center">
                  🎉 {msg.text}
                </div>
              </div>
            );
          }

          // Regular messages
          return (
            <div
              key={msg.id || msg.tempId || index}
              className={`flex mb-3 ${
                msg.sender === user._id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                  msg.sender === user._id
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none shadow"
                }`}
              >
                {msg.image ? (
                  <img
                    src={msg.image}
                    alt="Shared"
                    className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition"
                    onClick={() => setFullscreenImage(msg.image)}
                  />
                ) : (
                  <p className="text-sm break-words">{msg.text}</p>
                )}
                <p
                  className={`text-xs mt-1 ${
                    msg.sender === user._id ? "text-blue-100" : "text-gray-400"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Section */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4">
        {!chatId && !isSearching ? (
          <button
            onClick={handleStartChat}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
          >
            Start Random Chat
          </button>
        ) : chatEnded ? (
          <div className="space-y-2">
            <p className="text-center text-gray-500 dark:text-gray-400 mb-2">
              Chat has ended
            </p>
            <button
              onClick={handleStartChat}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
            >
              Start New Random Chat
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Back to Dashboard
            </button>
          </div>
        ) : chatId ? (
          <div className="space-y-2">
            <div className="relative">
              {showEmoji && (
                <div className="absolute bottom-full mb-2 right-0 z-50">
                  <EmojiPicker
                    onEmojiClick={(e) => {
                      setInput(input + e.emoji);
                      setShowEmoji(false);
                    }}
                  />
                </div>
              )}

              {/* Chat Input Row */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center space-x-2"
              >
                <button
                  type="button"
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="p-2 text-gray-500 hover:text-blue-500"
                >
                  <Smile size={24} />
                </button>

                {/* Intro Message Button */}
                <button
                  type="button"
                  onClick={() => setShowIntroPopup(true)}
                  className="p-2 text-gray-500 hover:text-blue-500"
                  title="Set Intro Message"
                >
                  <MessageCircle size={24} />
                </button>

                {/* Image Upload Button */}
                <label className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 cursor-pointer transition">
                  <ImageIcon size={24} />
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {/* Text Input */}
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>

            {/* Skip and End Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handleSkip}
                className="flex-1 flex items-center justify-center space-x-2 bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition"
              >
                <SkipForward size={18} />
                <span>Skip</span>
              </button>
              <button
                onClick={handleEnd}
                className="flex-1 flex items-center justify-center space-x-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
              >
                <XCircle size={18} />
                <span>End</span>
              </button>
            </div>

            {/* Fullscreen Image */}
            {fullscreenImage && (
              <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                <button
                  className="absolute top-4 right-4 text-white bg-black bg-opacity-40 rounded-full p-2 hover:bg-opacity-60 transition"
                  onClick={() => setFullscreenImage(null)}
                >
                  <XIcon size={28} />
                </button>
                <img
                  src={fullscreenImage}
                  alt="Fullscreen"
                  className="max-w-full max-h-full rounded-lg"
                />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* INTRO MESSAGE POPUP */}
      {showIntroPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg w-11/12 max-w-sm">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">
              Set Your Intro Message
            </h3>
            <textarea
              value={introMessage}
              onChange={(e) => setIntroMessage(e.target.value)}
              placeholder="Enter your intro message (max 200 chars)"
              maxLength={200}
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex justify-between mt-2 text-sm text-gray-400">
              <span>
                {charCount}/{charLimit}
              </span>
            </div>
            <div className="flex justify-end mt-3 space-x-2">
              <button
                onClick={() => setShowIntroPopup(false)}
                className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIntroMessage}
                disabled={savingIntro}
                className="px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {savingIntro ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

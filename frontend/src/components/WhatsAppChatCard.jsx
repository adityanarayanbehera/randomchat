export default function WhatsAppChatCard({
  avatar,
  name,
  lastMessage,
  time,
  unreadCount = 0,
  onClick,
  chatType = "random", // "random", "friend", "group"
}) {
  const isUnread = unreadCount > 0;

  // Avatar gradient based on chat type
  const avatarGradient = chatType === "group"
    ? "from-green-400 to-teal-500"
    : chatType === "friend"
    ? "from-blue-400 to-cyan-500"
    : "from-purple-400 to-pink-500";

  return (
    <div
      onClick={isEnded ? undefined : onClick}
      className={`flex items-center px-4 py-3 ${
        isEnded
          ? "bg-gray-50 dark:bg-gray-900 opacity-60 cursor-not-allowed"
          : "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer active:bg-gray-100 dark:active:bg-gray-600"
      } transition-colors border-b dark:border-gray-700`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden bg-gradient-to-br ${avatarGradient}`}
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            name?.[0]?.toUpperCase() || "?"
          )}
        </div>
        {/* Removed online indicator */}
      </div>

      {/* Content */}
      <div className="flex-1 ml-3 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <h3
            className={`truncate ${
              isUnread && !isEnded
                ? "font-semibold text-gray-900 dark:text-white"
                : "font-medium text-gray-900 dark:text-white"
            }`}
          >
            {name || "Unknown User"}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
            {time}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${
              isEnded
                ? "text-red-500 dark:text-red-400 italic"
                : isTyping
                ? "text-green-600 dark:text-green-400"
                : isUnread
                ? "font-semibold text-gray-800 dark:text-gray-200"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {isEnded
              ? "Chat ended"
              : isTyping
              ? "Typing..."
              : lastMessage || "Start chatting"}
          </p>
          {isUnread && !isEnded && (
            <span className="ml-2 bg-green-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

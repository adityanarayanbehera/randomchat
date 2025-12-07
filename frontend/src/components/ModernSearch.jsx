import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  UserPlus,
  MessageCircle,
  User,
  Users,
  Loader,
  Filter,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ModernSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ users: [], groups: [] });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
        setShowFilterMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // ✅ ENHANCED: Works with single character input
    if (query.length < 1) {
      setSuggestions([]);
      setResults({ users: [], groups: [] });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/search/suggestions?q=${encodeURIComponent(query)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.success) {
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error("Suggestions error:", error);
      }
    }, 300);
  }, [query]);

  const handleSearch = async () => {
    // ✅ ENHANCED: Single character search allowed
    if (query.trim().length < 1) {
      return toast.error("Enter at least 1 character");
    }

    setLoading(true);
    setShowResults(true);

    try {
      const res = await fetch(
        `${API_URL}/api/search?q=${encodeURIComponent(
          query
        )}&type=${filterType}&limit=50`,
        { credentials: "include" }
      );
      const data = await res.json();

      if (data.success) {
        setResults(data.results);
        if (data.totalResults === 0) {
          toast("No results found", { icon: "🔍" });
        }
      }
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults({ users: [], groups: [] });
    setSuggestions([]);
    setShowResults(false);
  };

  const handleSuggestionClick = async (suggestion) => {
    setQuery(suggestion.text);
    setSuggestions([]);
    await handleSearch();
  };

  const handleAddFriend = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toUserId: userId }),
      });

      if (res.ok) {
        toast.success("Friend request sent!");
        setResults((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u._id === userId ? { ...u, requestSent: true } : u
          ),
        }));
      } else {
        const data = await res.json();
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to send request");
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}/join`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Joined group!");
        navigate(`/groups/${groupId}`);
      } else {
        const data = await res.json();
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to join group");
    }
  };

  const totalResults = results.users.length + results.groups.length;

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => query.length >= 1 && setShowResults(true)}
          placeholder="Search users or groups...Type 1+ characters"
          className="w-full pl-10 pr-24 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white transition-all"
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {query && (
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
            >
              <X size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`p-1.5 rounded-lg transition ${
                filterType !== "all"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
            >
              <Filter size={18} />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-50 w-32">
                {["all", "users", "groups"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setFilterType(type);
                      setShowFilterMenu(false);
                      if (query.length >= 2) handleSearch();
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition capitalize ${
                      filterType === type
                        ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || query.length < 1}
            className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>
      </div>

      {suggestions.length > 0 && !showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
          <div className="p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 px-2 mb-2 font-semibold">
              Quick suggestions
            </p>
            {suggestions.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleSuggestionClick(item)}
                className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    item.text[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {item.text}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {item.type}
                  </p>
                </div>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-2xl max-h-[70vh] overflow-y-auto z-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-blue-600" size={32} />
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Search size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </div>
          ) : (
            <div className="p-2">
              {(filterType === "all" || filterType === "users") &&
                results.users.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 px-2 mb-2">
                      <User size={16} className="text-blue-500" />
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        USERS ({results.users.length})
                      </p>
                    </div>
                    {results.users.map((user) => (
                      <UserCard
                        key={user._id}
                        user={user}
                        onAddFriend={handleAddFriend}
                        onNavigate={() => setShowResults(false)}
                      />
                    ))}
                  </div>
                )}

              {(filterType === "all" || filterType === "groups") &&
                results.groups.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 px-2 mb-2">
                      <Users size={16} className="text-green-500" />
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        GROUPS ({results.groups.length})
                      </p>
                    </div>
                    {results.groups.map((group) => (
                      <GroupCard
                        key={group._id}
                        group={group}
                        onJoinGroup={handleJoinGroup}
                        onNavigate={() => setShowResults(false)}
                      />
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserCard({ user, onAddFriend, onNavigate }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition">
      <button
        onClick={() => {
          navigate(`/user/${user._id}`);
          onNavigate();
        }}
        className="flex items-center space-x-3 flex-1 min-w-0"
      >
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              user.username[0].toUpperCase()
            )}
          </div>
          {/* Removed online indicator */}
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {user.username}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {user.gender}
          </p>
        </div>
      </button>

      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
        {user.isFriend ? (
          <button
            onClick={() => {
              navigate(`/friend-chat/${user._id}`);
              onNavigate();
            }}
            className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition"
            title="Chat"
          >
            <MessageCircle size={18} />
          </button>
        ) : (
          <button
            onClick={() => onAddFriend(user._id)}
            className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition"
            title="Add Friend"
          >
            <UserPlus size={18} />
          </button>
        )}

        <button
          onClick={() => {
            navigate(`/user/${user._id}`);
            onNavigate();
          }}
          className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          title="View Profile"
        >
          <User size={18} />
        </button>
      </div>
    </div>
  );
}

function GroupCard({ group, onJoinGroup, onNavigate }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition">
      <button
        onClick={() => {
          navigate(`/groups/${group._id}/profile`);
          onNavigate();
        }}
        className="flex items-center space-x-3 flex-1 min-w-0"
      >
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
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

        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {group.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {group.memberCount} members •{" "}
            {group.isPublic ? "Public" : "Private"}
          </p>
        </div>
      </button>

      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
        {group.isMember ? (
          <button
            onClick={() => {
              navigate(`/groups/${group._id}`);
              onNavigate();
            }}
            className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition"
            title="Open Chat"
          >
            <MessageCircle size={18} />
          </button>
        ) : (
          <button
            onClick={() => onJoinGroup(group._id)}
            className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition"
            title="Join Group"
          >
            <UserPlus size={18} />
          </button>
        )}

        <button
          onClick={() => {
            navigate(`/groups/${group._id}/profile`);
            onNavigate();
          }}
          className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          title="View Group"
        >
          <Users size={18} />
        </button>
      </div>
    </div>
  );
}

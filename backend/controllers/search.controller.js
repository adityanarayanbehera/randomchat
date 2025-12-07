// backend/controllers/search.controller.js
// ✅ PRODUCTION-READY: Unified search for users and groups
import User from "../models/User.model.js";
import Group from "../models/Group.model.js";

/**
 * GET /api/search?q=query&type=all|users|groups&limit=20
 * Real-time search with fuzzy matching
 */
export const searchAll = async (req, res) => {
  try {
    const { q, type = "all", limit = 20 } = req.query;
    const userId = req.userId;

    // Validation
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Query must be at least 2 characters",
      });
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(searchQuery, "i"); // Case-insensitive
    const results = { users: [], groups: [] };

    // Get user's friends list for status checks
    const currentUser = await User.findById(userId)
      .select("friends blockedUsers")
      .lean();
    const friendIds = currentUser?.friends?.map((id) => id.toString()) || [];
    const blockedIds =
      currentUser?.blockedUsers?.map((id) => id.toString()) || [];

    // Search Users (if type is 'all' or 'users')
    if (type === "all" || type === "users") {
      const users = await User.find({
        username: searchRegex,
        _id: { $ne: userId, $nin: blockedIds }, // Exclude self and blocked users
        isAnonymous: false, // Only registered users
      })
        .select("username avatar gender lastActive")
        .limit(parseInt(limit))
        .lean();

      results.users = users.map((user) => ({
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        gender: user.gender,
        // isOnline removed to reduce server load
        isFriend: friendIds.includes(user._id.toString()),
        type: "user",
      }));
    }

    // Search Groups (if type is 'all' or 'groups')
    if (type === "all" || type === "groups") {
      // Search by group name
      const groupQuery = {
        $or: [{ name: searchRegex }, { description: searchRegex }],
      };

      // Only show public groups OR groups user is member of
      const groups = await Group.find(groupQuery)
        .select("name description avatar isPublic members owner")
        .limit(parseInt(limit))
        .lean();

      results.groups = groups
        .filter(
          (group) =>
            group.isPublic || group.members.some((m) => m.toString() === userId)
        )
        .map((group) => ({
          _id: group._id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          isPublic: group.isPublic,
          memberCount: group.members.length,
          isMember: group.members.some((m) => m.toString() === userId),
          isOwner: group.owner.toString() === userId,
          type: "group",
        }));
    }

    // Sort by relevance (exact matches first, then partial)
    const sortByRelevance = (items, key) => {
      return items.sort((a, b) => {
        const aName = (a[key] || "").toLowerCase();
        const bName = (b[key] || "").toLowerCase();
        const searchLower = searchQuery.toLowerCase();

        // Exact match first
        if (aName === searchLower) return -1;
        if (bName === searchLower) return 1;

        // Starts with query
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower))
          return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower))
          return 1;

        // Alphabetical
        return aName.localeCompare(bName);
      });
    };

    results.users = sortByRelevance(results.users, "username");
    results.groups = sortByRelevance(results.groups, "name");

    res.json({
      success: true,
      query: searchQuery,
      results,
      totalResults: results.users.length + results.groups.length,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

/**
 * GET /api/search/suggestions?q=query
 * Quick suggestions (faster, limited results)
 */
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.userId;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchRegex = new RegExp(`^${q.trim()}`, "i"); // Starts with query

    const [users, groups] = await Promise.all([
      User.find({
        username: searchRegex,
        _id: { $ne: userId },
        isAnonymous: false,
      })
        .select("username avatar")
        .limit(5)
        .lean(),

      Group.find({
        name: searchRegex,
        $or: [{ isPublic: true }, { members: userId }],
      })
        .select("name avatar")
        .limit(5)
        .lean(),
    ]);

    const suggestions = [
      ...users.map((u) => ({
        id: u._id,
        text: u.username,
        avatar: u.avatar,
        type: "user",
      })),
      ...groups.map((g) => ({
        id: g._id,
        text: g.name,
        avatar: g.avatar,
        type: "group",
      })),
    ].slice(0, 8);

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error("❌ Suggestions error:", error);
    res.status(500).json({ success: false, suggestions: [] });
  }
};

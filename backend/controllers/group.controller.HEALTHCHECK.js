// backend/controllers/group.controller.js
// Add this method for health check

/**
 * GET /api/groups/:groupId/health
 * Verify group chat message persistence
 */
export const checkGroupHealth = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const chat = await Chat.findById(group.chatId).lean();

    res.json({
      success: true,
      health: {
        groupExists: !!group,
        groupName: group.name,
        chatExists: !!chat,
        chatId: group.chatId,
        chatType: chat?.type,
        messagesArrayExists: Array.isArray(chat?.messages),
        messagesCount: chat?.messages?.length || 0,
        lastMessage: chat?.messages?.[chat.messages.length - 1] || null,
        lastActivity: group.lastActivity,
        disappearingDuration: group.disappearingDuration,
      },
    });
  } catch (error) {
    console.error("❌ Check group health error:", error);
    res.status(500).json({ message: "Failed to check group health" });
  }
};

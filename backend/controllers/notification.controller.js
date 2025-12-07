import Notification from "../models/Notification.model.js";
import { redisClient } from "../server.js";

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const userId = req.userId;

    const query = { userId };
    if (category && category !== "all") {
      query.category = category;
    }

    const notifications = await Notification.find(query)
      .populate("fromUser", "username avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true }
    );

    await redisClient.set(`unread_notifications:${req.userId}`, "0");

    res.json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await Notification.findByIdAndUpdate(notificationId, { isRead: true });

    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      isRead: false,
    });

    await redisClient.set(
      `unread_notifications:${req.userId}`,
      unreadCount.toString()
    );

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.userId });
    await redisClient.set(`unread_notifications:${req.userId}`, "0");

    res.json({ success: true });
  } catch (error) {
    console.error("Clear notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleNotifications = async (req, res) => {
  try {
    const { enabled } = req.body;

    await User.findByIdAndUpdate(req.userId, {
      "settings.notifications": enabled,
    });

    res.json({ success: true, enabled });
  } catch (error) {
    console.error("Toggle notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

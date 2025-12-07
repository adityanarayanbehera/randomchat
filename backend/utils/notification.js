import Notification from "../models/Notification.model.js";
import { redisClient } from "../server.js";

export async function createNotification(data) {
  try {
    const notification = await Notification.create(data);

    const unreadCount = await Notification.countDocuments({
      userId: data.userId,
      isRead: false,
    });

    await redisClient.set(
      `unread_notifications:${data.userId}`,
      unreadCount.toString()
    );

    const populated = await Notification.findById(notification._id)
      .populate("fromUser", "username avatar")
      .lean();

    return { notification: populated, unreadCount };
  } catch (error) {
    console.error("Create notification error:", error);
    return null;
  }
}

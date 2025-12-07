// backend/controllers/friend.controller.js
import FriendRequest from "../models/FriendRequest.model.js";
import User from "../models/User.model.js";
import Chat from "../models/Chat.model.js";
import ChatMeta from "../models/ChatMeta.model.js";
import { redisClient } from "../server.js";

// Send Friend Request
export const sendRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;
    const fromUserId = req.userId;

    if (fromUserId === toUserId) {
      return res
        .status(400)
        .json({ message: "Cannot send request to yourself" });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: toUserId },
        { from: toUserId, to: fromUserId },
      ],
      status: "pending",
    });

    if (existing) {
      return res.status(400).json({ message: "Request already sent" });
    }

    const request = await FriendRequest.create({
      from: fromUserId,
      to: toUserId,
    });

    const populatedRequest = await FriendRequest.findById(request._id).populate(
      "from",
      "username avatar gender"
    );

    res.status(201).json({
      success: true,
      request: populatedRequest,
    });
  } catch (error) {
    console.error("Send request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Friend Requests
export const getRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.userId,
      status: "pending",
    })
      .populate("from", "username avatar gender lastActive")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Accept Friend Request
export const acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.to.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    request.status = "accepted";
    await request.save();

    // Add to friends list
    await User.findByIdAndUpdate(request.from, {
      $addToSet: { friends: request.to },
    });
    await User.findByIdAndUpdate(request.to, {
      $addToSet: { friends: request.from },
    });

    // Check if a random chat already exists between these users
    const existingRandomChat = await Chat.findOne({
      participants: { $all: [request.from, request.to], $size: 2 },
      isRandomChat: true,
    });

    if (existingRandomChat) {
      // ✅ MIGRATE: Convert random chat to friend chat
      existingRandomChat.isRandomChat = false;
      existingRandomChat.isFriendChat = true;
      existingRandomChat.type = "private";
      existingRandomChat.expiresAt = null; // Remove expiration
      await existingRandomChat.save();
      
      console.log(`✅ Migrated random chat ${existingRandomChat._id} to friend chat`);
    } else {
      // Create new friend chat if no random chat exists
      await Chat.create({
        participants: [request.from, request.to],
        isFriendChat: true,
        isRandomChat: false,
        type: "private",
      });
    }

    res.status(200).json({
      success: true,
      message: "Request accepted",
    });
  } catch (error) {
    console.error("Accept request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject Friend Request
export const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "rejected";
    await request.save();

    res.status(200).json({
      success: true,
      message: "Request rejected",
    });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Friends
export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate(
      "friends",
      "username avatar gender lastActive"
    );

    res.status(200).json({
      success: true,
      friends: user.friends,
    });
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove Friend
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    await User.findByIdAndUpdate(req.userId, {
      $pull: { friends: friendId },
    });
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.userId },
    });



    // ✅ DELETE CHAT DATA (Strict Cleanup)
    const chat = await Chat.findOne({
      participants: { $all: [req.userId, friendId], $size: 2 },
    });

    if (chat) {
      await Chat.findByIdAndDelete(chat._id);
      await ChatMeta.deleteMany({ chatId: chat._id });
      await redisClient.del(`chat:messages:${chat._id}`);
      console.log(`🗑️ Deleted chat data between ${req.userId} and ${friendId}`);
    }

    res.status(200).json({
      success: true,
      message: "Friend removed and chat deleted",
    });
  } catch (error) {
    console.error("Remove friend error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

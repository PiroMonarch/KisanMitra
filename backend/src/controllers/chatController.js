const ChatRoom = require("../models/ChatRoom");
const ChatMessage = require("../models/ChatMessage");
const Order = require("../models/Order");
const { ensureRoomForOrder, isParticipant, applyExpiry } = require("../services/chatService");

exports.getOrderChat = async (req, res) => {
  try {
    const { orderId } = req.params;
    const room = await ensureRoomForOrder(orderId);
    if (!isParticipant(room, req.user.id)) {
      return res.status(403).json({ message: "Not authorized for this chat" });
    }

    const order = await Order.findById(orderId);
    await applyExpiry(room, order);

    if (room.expiresAt && room.expiresAt < new Date()) {
      room.isDisabled = true;
      await room.save();
    }

    const messages = await ChatMessage.find({ roomId: room._id }).sort({ createdAt: 1 });
    res.json({ room, messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reportMessage = async (req, res) => {
  try {
    const { messageId } = req.body;
    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const room = await ChatRoom.findById(message.roomId);
    if (!room || !isParticipant(room, req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!message.reportedBy.some((id) => String(id) === String(req.user.id))) {
      message.reportedBy.push(req.user.id);
      await message.save();
    }

    if (message.reportedBy.length >= 2) {
      room.isDisabled = true;
      await room.save();
    }

    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

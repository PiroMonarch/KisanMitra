const ChatRoom = require("../models/ChatRoom");
const ChatMessage = require("../models/ChatMessage");
const Order = require("../models/Order");
const User = require("../models/User");
const GroupFulfillment = require("../models/GroupFulfillment");

const ensureRoomForOrder = async (orderId) => {
  const existing = await ChatRoom.findOne({ orderId });
  if (existing) return existing;

  const order = await Order.findById(orderId).populate("buyer", "name role");
  if (!order) throw new Error("Order not found");

  const farmerIds = Array.from(new Set(order.items.map((item) => String(item.farmerId))));
  const group = await GroupFulfillment.findOne({ orderId: order._id });
  if (group?.contributions?.length) {
    group.contributions.forEach((contrib) => farmerIds.push(String(contrib.farmerId)));
  }
  const uniqueFarmerIds = Array.from(new Set(farmerIds));
  const farmers = await User.find({ _id: { $in: uniqueFarmerIds } }).select("name role");

  const participants = [
    { userId: order.buyer._id, role: "buyer", name: order.buyer.name },
    ...farmers.map((farmer) => ({ userId: farmer._id, role: "farmer", name: farmer.name }))
  ];

  const room = await ChatRoom.create({
    orderId,
    participants,
    isGroup: farmers.length > 1,
    isDisabled: false,
  });

  return room;
};

const isParticipant = (room, userId) =>
  room.participants.some((p) => String(p.userId) === String(userId));

const addSystemMessage = async (orderId, content) => {
  const room = await ensureRoomForOrder(orderId);
  return ChatMessage.create({
    roomId: room._id,
    orderId,
    content,
    type: "system",
    senderRole: "system"
  });
};

const applyExpiry = async (room, order) => {
  if (room.expiresAt) return room;
  if (order?.deliveryStatus?.toLowerCase().includes("delivered")) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    room.expiresAt = expires;
    await room.save();
  } else if (order?.status && ["Accepted", "Rejected"].includes(order.status)) {
    const expires = new Date(order.updatedAt || Date.now());
    expires.setDate(expires.getDate() + 7);
    room.expiresAt = expires;
    await room.save();
  }
  return room;
};

module.exports = { ensureRoomForOrder, isParticipant, addSystemMessage, applyExpiry };

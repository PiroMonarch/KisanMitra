const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    senderRole: { type: String },
    senderName: { type: String },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "system"], default: "text" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);

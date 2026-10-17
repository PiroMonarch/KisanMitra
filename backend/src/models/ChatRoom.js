const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
    name: { type: String },
  },
  { _id: false }
);

const chatRoomSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    participants: [participantSchema],
    isGroup: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatRoom", chatRoomSchema);

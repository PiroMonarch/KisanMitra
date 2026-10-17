const mongoose = require("mongoose");

const subscriptionRequestSchema = new mongoose.Schema(
  {
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    buyerDetails: {
      name: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
    },
    itemName: { type: String, required: true },
    qty: { type: Number, required: true },
    unit: { type: String, required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    deliveryOption: { type: String, default: "platform" },
    paymentMethod: { type: String, default: "cod" },
    status: { type: String, default: "open" }, // open | accepted | expired
    expiresAt: { type: Date },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionRequest", subscriptionRequestSchema);

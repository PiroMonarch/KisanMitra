const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    grade: { type: String, default: "Standard" },
    price: { type: Number, required: true },
    unitPrice: { type: Number },
    discountPercent: { type: Number, default: 0 },
    lineTotal: { type: Number },
    unit: { type: String, required: true },
    qty: { type: Number, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    farmerName: { type: String },
    status: { type: String, default: "Pending" }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
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
    deliveryOption: { type: String, default: "platform" }, // platform | farmer | pickup
    paymentMethod: { type: String, default: "cod" }, // cod | upi | card
    deliveryStatus: { type: String, default: "Pending Farmer Approval" },
    deliveryEta: { type: String },
    deliveryPartner: { type: String },
    routeGroupId: { type: String },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    status: { type: String, default: "Pending" },
    source: { type: String, default: "manual" }, // manual | subscription
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    subscriptionMeta: {
      itemName: String,
      qty: Number,
      unit: String,
      dayOfWeek: Number,
    },
    assignedFarmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);

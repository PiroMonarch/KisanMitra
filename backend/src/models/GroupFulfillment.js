const mongoose = require("mongoose");

const contributionSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    value: { type: Number, required: true }
  },
  { _id: false }
);

const groupFulfillmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    productName: { type: String, required: true },
    grade: { type: String, default: "Standard" },
    unit: { type: String, required: true },
    requestedQty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    priceMin: { type: Number, required: true },
    priceMax: { type: Number, required: true },
    deliveryArea: { type: String },
    status: { type: String, default: "Open" },
    contributions: [contributionSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("GroupFulfillment", groupFulfillmentSchema);

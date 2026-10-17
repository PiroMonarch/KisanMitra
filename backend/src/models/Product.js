const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    grade: { type: String, default: "Standard" },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true },
    minOrderQty: { type: Number, default: 1 },
    lowStockThreshold: { type: Number, default: 0 },
    bulkPricing: [
      {
        minQty: { type: Number, required: true },
        pricePerUnit: { type: Number, required: true },
      }
    ],
    deliveryOptions: {
      farmerDelivery: { type: Boolean, default: true },
      platformDelivery: { type: Boolean, default: true },
      buyerPickup: { type: Boolean, default: true }
    },
    image: { type: String },
    description: { type: String },
    shelfLifeDays: { type: Number, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);

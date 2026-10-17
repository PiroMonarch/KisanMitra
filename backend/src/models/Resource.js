const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    visibility: { type: String, enum: ["all", "farmers"], default: "all" },
    type: { type: String, enum: ["rental", "buy"], required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    rentalDuration: { type: String },
    brand: { type: String },
    quality: { type: String },
    providerName: { type: String },
    providerPhone: { type: String },
    providerRating: { type: Number, default: 4.2 },
    availability: { type: String, default: "Available" },
    priceComparisons: [
      {
        label: { type: String },
        price: { type: Number },
        url: { type: String },
      },
    ],
    location: {
      lat: Number,
      lng: Number,
      address: String,
      city: String,
      state: String,
    },
    deliveryOptions: {
      pickup: { type: Boolean, default: true },
      delivery: { type: Boolean, default: false },
    },
    onlineUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);

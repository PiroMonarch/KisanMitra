const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["farmer", "buyer"],
      required: true,
    },

    language: {
      type: String,
      enum: ["en", "hi", "pa"],
      default: "en",
    },

    location: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      city: String,
      district: String,
      state: String,
      capturedAt: Date,
    },
    address: {
      name: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
    },
    trustSignals: {
      verifiedFarmer: { type: Boolean, default: false },
      organicProducer: { type: Boolean, default: false },
      ratingAverage: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
      qualityAverage: { type: Number, default: 0 },
      recentQualityScores: [
        {
          score: { type: Number, min: 1, max: 5 },
          orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      recentReviews: [
        {
          rating: { type: Number, min: 1, max: 5 },
          comment: { type: String, trim: true },
          buyerName: { type: String },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

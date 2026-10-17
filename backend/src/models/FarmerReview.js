const mongoose = require("mongoose");

const farmerReviewSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    qualityScore: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

farmerReviewSchema.index({ order: 1, farmer: 1, buyer: 1 }, { unique: true });

module.exports = mongoose.model("FarmerReview", farmerReviewSchema);

const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    itemName: { type: String, required: true, trim: true },
    qty: { type: Number, required: true },
    unit: { type: String, required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    deliveryOption: { type: String, default: "platform" },
    paymentMethod: { type: String, default: "cod" },
    buyerDetails: {
      name: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
    },
    status: { type: String, default: "active" }, // active | paused | cancelled
    nextRunAt: { type: Date, required: true },
    lastRunAt: { type: Date },
    lastResult: { type: String }, // created | no_candidates | skipped
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);

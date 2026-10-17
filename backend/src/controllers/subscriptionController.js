const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { computeNextRunAt, runDueSubscriptions } = require("../services/subscriptionService");

const normalizeDay = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (num < 0 || num > 6) return null;
  return num;
};

exports.createSubscription = async (req, res) => {
  try {
    const buyer = await User.findById(req.user.id);
    if (!buyer || buyer.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can create subscriptions" });
    }

    const {
      itemName,
      qty,
      unit,
      dayOfWeek,
      deliveryOption,
      paymentMethod,
      buyerDetails,
    } = req.body;

    if (!itemName || !qty || !unit) {
      return res.status(400).json({ message: "Item name, quantity, and unit are required" });
    }

    const normalizedDay = normalizeDay(dayOfWeek);
    if (normalizedDay === null) {
      return res.status(400).json({ message: "Day of week must be between 0 (Sunday) and 6 (Saturday)" });
    }

    if (
      !buyerDetails?.addressLine1 ||
      !buyerDetails?.city ||
      !buyerDetails?.state ||
      !buyerDetails?.pincode ||
      !buyerDetails?.phone ||
      !buyerDetails?.name
    ) {
      return res.status(400).json({ message: "Buyer contact and address details are required" });
    }

    const nextRunAt = computeNextRunAt(normalizedDay);

    const subscription = await Subscription.create({
      buyer: buyer._id,
      itemName: String(itemName).trim(),
      qty: Number(qty),
      unit,
      dayOfWeek: normalizedDay,
      deliveryOption: deliveryOption || "platform",
      paymentMethod: paymentMethod || "cod",
      buyerDetails: {
        name: buyerDetails.name,
        phone: buyerDetails.phone,
        addressLine1: buyerDetails.addressLine1,
        addressLine2: buyerDetails.addressLine2 || "",
        city: buyerDetails.city,
        state: buyerDetails.state,
        pincode: buyerDetails.pincode,
      },
      status: "active",
      nextRunAt,
    });

    res.status(201).json({ subscription });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBuyerSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ buyer: req.user.id })
      .sort({ createdAt: -1 });
    res.set("Cache-Control", "no-store");
    res.json({ subscriptions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    if (String(subscription.buyer) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to cancel this subscription" });
    }

    subscription.status = "cancelled";
    await subscription.save();
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.runSubscriptionsNow = async (req, res) => {
  try {
    const result = await runDueSubscriptions(new Date());
    res.json({ result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

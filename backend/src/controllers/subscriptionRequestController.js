const SubscriptionRequest = require("../models/SubscriptionRequest");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const { addSystemMessage } = require("../services/chatService");

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pickUnitPrice = (product, qty) => {
  if (Array.isArray(product.bulkPricing) && product.bulkPricing.length > 0) {
    const sorted = [...product.bulkPricing].sort((a, b) => a.minQty - b.minQty);
    let selected = null;
    for (const tier of sorted) {
      if (qty >= tier.minQty) selected = tier;
    }
    if (selected) return selected.pricePerUnit;
  }
  return product.price;
};

exports.getOpenRequests = async (req, res) => {
  try {
    const farmer = await User.findById(req.user.id);
    if (!farmer || farmer.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can view requests" });
    }

    const now = new Date();
    const requests = await SubscriptionRequest.find({
      status: "open",
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }],
    })
      .sort({ createdAt: -1 });
    res.set("Cache-Control", "no-store");
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const farmer = await User.findById(req.user.id);
    if (!farmer || farmer.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can accept requests" });
    }

    const { productId } = req.body || {};

    const request = await SubscriptionRequest.findOneAndUpdate(
      { _id: req.params.id, status: "open" },
      { status: "accepted", acceptedBy: farmer._id, acceptedAt: new Date() },
      { new: true }
    );
    if (!request) {
      return res.status(409).json({ message: "Request already accepted" });
    }

    let product = await Product.findOne({
      owner: farmer._id,
      name: new RegExp(`^${escapeRegex(request.itemName)}$`, "i"),
      unit: request.unit,
    });
    if (productId) {
      const selected = await Product.findOne({ _id: productId, owner: farmer._id });
      if (selected) product = selected;
    }

    const qty = request.qty;
    const unit = request.unit;
    let unitPrice = 0;
    let price = 0;
    let lineTotal = 0;
    let productIdValue = undefined;
    let productName = request.itemName;
    let grade = "Standard";

    if (product) {
      unitPrice = pickUnitPrice(product, qty);
      price = product.price;
      lineTotal = unitPrice * qty;
      productIdValue = product._id;
      productName = product.name;
      grade = product.grade || "Standard";
    }

    const order = await Order.create({
      buyer: request.buyer,
      buyerDetails: request.buyerDetails,
      deliveryOption: request.deliveryOption || "platform",
      paymentMethod: request.paymentMethod || "cod",
      deliveryStatus: "Pending Farmer Approval",
      items: [
        {
          product: productIdValue,
          name: productName,
          grade,
          price,
          unitPrice,
          discountPercent: 0,
          lineTotal,
          unit,
          qty,
          farmerId: farmer._id,
          farmerName: farmer.name,
          status: "Accepted",
        },
      ],
      total: lineTotal,
      status: "Accepted",
      source: "subscription",
      subscriptionId: request.subscription,
      subscriptionMeta: {
        itemName: request.itemName,
        qty: request.qty,
        unit: request.unit,
        dayOfWeek: request.dayOfWeek,
      },
      assignedFarmerId: farmer._id,
    });

    if (order.deliveryOption === "platform") {
      order.deliveryPartner = "Kisan Logistics";
      const eta = new Date();
      eta.setDate(eta.getDate() + 2);
      order.deliveryEta = eta.toISOString();
      order.deliveryStatus = "Assigned to Delivery Partner";
    } else if (order.deliveryOption === "farmer") {
      order.deliveryStatus = "Farmer Delivery Scheduled";
    } else {
      order.deliveryStatus = "Ready for Pickup";
    }

    await order.save();
    await addSystemMessage(order._id, "Subscription request accepted");

    if (product) {
      product.quantity = Math.max((product.quantity || 0) - qty, 0);
      await product.save();
    }

    res.json({ request, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

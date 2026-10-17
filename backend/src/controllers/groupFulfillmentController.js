const GroupFulfillment = require("../models/GroupFulfillment");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const { addSystemMessage } = require("../services/chatService");

const sumContributions = (contributions) =>
  contributions.reduce((sum, c) => sum + (c.qty || 0), 0);

exports.getRequestsForFarmer = async (req, res) => {
  try {
    const farmer = await User.findById(req.user.id);
    if (!farmer || farmer.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can view group fulfillments" });
    }

    const farmerProducts = await Product.find({ owner: farmer._id });
    const names = farmerProducts.map((p) => p.name);
    const grades = farmerProducts.map((p) => p.grade || "Standard");

    const requests = await GroupFulfillment.find({
      status: { $in: ["Open", "Ready"] },
      productName: { $in: names },
      grade: { $in: grades }
    }).sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.contribute = async (req, res) => {
  try {
    const { requestId, productId, qty } = req.body;
    const farmer = await User.findById(req.user.id);
    if (!farmer || farmer.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can contribute" });
    }

    const request = await GroupFulfillment.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Group request not found" });
    }

    const product = await Product.findById(productId);
    if (!product || String(product.owner) !== String(farmer._id)) {
      return res.status(400).json({ message: "Invalid product for contribution" });
    }

    if (product.name.toLowerCase() !== request.productName.toLowerCase()) {
      return res.status(400).json({ message: "Product name does not match request" });
    }
    if ((product.grade || "Standard") !== request.grade) {
      return res.status(400).json({ message: "Product grade does not match request" });
    }
    if (product.price < request.priceMin || product.price > request.priceMax) {
      return res.status(400).json({ message: "Product price out of allowed range" });
    }

    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }
    if (qtyNum > product.quantity) {
      return res.status(400).json({ message: "Insufficient stock for contribution" });
    }

    const existing = request.contributions.find(
      (c) => String(c.farmerId) === String(farmer._id) && String(c.productId) === String(product._id)
    );

    const unitPrice = request.unitPrice;
    const value = unitPrice * qtyNum;

    if (existing) {
      existing.qty = qtyNum;
      existing.value = value;
    } else {
      request.contributions.push({
        farmerId: farmer._id,
        productId: product._id,
        qty: qtyNum,
        unitPrice,
        value
      });
    }

    const total = sumContributions(request.contributions);
    request.status = total >= request.requestedQty ? "Ready" : "Open";
    await request.save();

    res.json({ request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.finalize = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await GroupFulfillment.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Group request not found" });
    }

    const total = sumContributions(request.contributions);
    if (total < request.requestedQty) {
      return res.status(400).json({ message: "Total contribution does not meet requested quantity" });
    }

    for (const contribution of request.contributions) {
      const product = await Product.findById(contribution.productId);
      if (!product || product.quantity < contribution.qty) {
        return res.status(400).json({ message: "Insufficient stock for group finalization" });
      }
    }

    for (const contribution of request.contributions) {
      const product = await Product.findById(contribution.productId);
      if (!product) continue;
      product.quantity = Math.max(product.quantity - contribution.qty, 0);
      await product.save();
    }

    request.status = "Accepted";
    await request.save();

    const order = await Order.findById(request.orderId);
    if (order) {
      order.status = "Accepted";
      order.items = order.items.map((item) => ({ ...item.toObject(), status: "Accepted" }));
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
      await addSystemMessage(order._id, "Order accepted via group fulfillment");
      if (order.deliveryStatus) {
        await addSystemMessage(order._id, `Delivery update: ${order.deliveryStatus}`);
      }
    }

    res.json({ request, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

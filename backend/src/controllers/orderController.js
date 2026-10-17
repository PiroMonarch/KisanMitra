const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const FarmerReview = require("../models/FarmerReview");
const GroupFulfillment = require("../models/GroupFulfillment");
const { addSystemMessage } = require("../services/chatService");

/* ---------------- HELPERS ---------------- */

const computeOrderStatus = (items) => {
  const statuses = items.map((item) => item.status);
  if (statuses.every((s) => s === "Accepted")) return "Accepted";
  if (statuses.every((s) => s === "Rejected")) return "Rejected";
  if (statuses.some((s) => s === "Accepted" || s === "Rejected"))
    return "Partially Accepted";
  return "Pending";
};

const pickUnitPrice = (product, qty) => {
  if (Array.isArray(product.bulkPricing) && product.bulkPricing.length > 0) {
    const sorted = [...product.bulkPricing].sort(
      (a, b) => a.minQty - b.minQty
    );
    let selected = null;
    for (const tier of sorted) {
      if (qty >= tier.minQty) selected = tier;
    }
    if (selected) return selected.pricePerUnit;
  }
  return product.price;
};

/* ---------------- PLACE ORDER (BUYER) ---------------- */

exports.placeOrder = async (req, res) => {
  try {
    const buyer = await User.findById(req.user.id);
    if (!buyer || buyer.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can place orders" });
    }

    const {
      items,
      deliveryOption,
      paymentMethod,
      buyerDetails,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (
      !buyerDetails?.addressLine1 ||
      !buyerDetails?.city ||
      !buyerDetails?.state ||
      !buyerDetails?.pincode
    ) {
      return res
        .status(400)
        .json({ message: "Delivery address is required" });
    }

    if (!buyerDetails?.phone || !buyerDetails?.name) {
      return res
        .status(400)
        .json({ message: "Buyer contact details are required" });
    }

    if (!paymentMethod) {
      return res
        .status(400)
        .json({ message: "Payment method is required" });
    }

    const populatedItems = [];
    let total = 0;
    const requestedDelivery = deliveryOption || "platform";

    for (const item of items) {
      const product = await Product.findById(item.productId).populate(
        "owner",
        "name"
      );
      if (!product) continue;

      /* ---- DELIVERY OPTION VALIDATION (FIXED LOCATION) ---- */
      if (
        requestedDelivery === "pickup" &&
        product.deliveryOptions?.buyerPickup === false
      ) {
        return res.status(400).json({
          message: `${product.name} is not available for pickup`,
        });
      }

      if (
        requestedDelivery === "farmer" &&
        product.deliveryOptions?.farmerDelivery === false
      ) {
        return res.status(400).json({
          message: `${product.name} is not available for farmer delivery`,
        });
      }

      if (
        requestedDelivery === "platform" &&
        product.deliveryOptions?.platformDelivery === false
      ) {
        return res.status(400).json({
          message: `${product.name} is not available for platform delivery`,
        });
      }
      /* ---------------------------------------------------- */

      const qty = Number(item.qty) || 1;

      if (qty < product.minOrderQty) {
        return res.status(400).json({
          message: `Minimum order for ${product.name} is ${product.minOrderQty} ${product.unit}`,
        });
      }

      const needsGroup = qty > product.quantity;
      if (needsGroup) {
        const priceMin = product.price - product.price * 0.1;
        const priceMax = product.price + product.price * 0.1;
        // Allow group fulfillment requests even if current total stock is insufficient.
        // This lets buyers place large orders and farmers coordinate supply.
      }

      const unitPrice = pickUnitPrice(product, qty);
      const lineTotal = unitPrice * qty;

      const discountPercent =
        product.price > unitPrice
          ? Math.round(
              ((product.price - unitPrice) / product.price) * 100
            )
          : 0;

      total += lineTotal;

      populatedItems.push({
        product: product._id,
        name: product.name,
        grade: product.grade || "Standard",
        price: product.price,
        unitPrice,
        discountPercent,
        lineTotal,
        unit: product.unit,
        qty,
        farmerId: product.owner._id,
        farmerName: product.owner.name,
        status: needsGroup ? "Group Pending" : "Pending",
      });
    }

    if (populatedItems.length === 0) {
      return res.status(400).json({ message: "No valid products in order" });
    }

    const order = await Order.create({
      buyer: buyer._id,
      buyerDetails: {
        name: buyerDetails.name,
        phone: buyerDetails.phone,
        addressLine1: buyerDetails.addressLine1,
        addressLine2: buyerDetails.addressLine2,
        city: buyerDetails.city,
        state: buyerDetails.state,
        pincode: buyerDetails.pincode,
      },
      deliveryOption: requestedDelivery,
      paymentMethod,
      deliveryStatus: "Pending Farmer Approval",
      items: populatedItems,
      total,
      status: "Pending",
    });

    await addSystemMessage(order._id, "Order placed");

    for (const item of populatedItems) {
      if (item.status === "Group Pending") {
        const priceMin = item.price - item.price * 0.1;
        const priceMax = item.price + item.price * 0.1;
        await GroupFulfillment.create({
          orderId: order._id,
          productName: item.name,
          grade: item.grade || "Standard",
          unit: item.unit,
          requestedQty: item.qty,
          unitPrice: item.unitPrice || item.price,
          priceMin,
          priceMax,
          deliveryArea: `${buyerDetails.city}, ${buyerDetails.state}`,
          status: "Open",
          contributions: []
        });
        order.status = "Pending Group Fulfillment";
        order.deliveryStatus = "Pending Group Fulfillment";
        await order.save();
        await addSystemMessage(order._id, "Group fulfillment requested for this order");
      }
    }

    res.status(201).json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- BUYER ORDERS ---------------- */

exports.getBuyerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user.id }).sort({
      createdAt: -1,
    });
    if (orders.length === 0) {
      return res.json({ orders: [] });
    }

    const orderIds = orders.map((order) => order._id);
    const reviews = await FarmerReview.find({
      buyer: req.user.id,
      order: { $in: orderIds },
    }).select("order farmer rating qualityScore");

    const reviewsByOrder = reviews.reduce((acc, review) => {
      const orderId = String(review.order);
      if (!acc[orderId]) acc[orderId] = [];
      acc[orderId].push({
        farmer: review.farmer,
        rating: review.rating,
        qualityScore: review.qualityScore,
      });
      return acc;
    }, {});

    const ordersWithReviews = orders.map((order) => ({
      ...order.toObject(),
      buyerReviews: reviewsByOrder[String(order._id)] || [],
    }));

    res.json({ orders: ordersWithReviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- FARMER ORDERS ---------------- */

exports.getFarmerOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      "items.farmerId": req.user.id,
    })
      .populate("buyer", "name phone email")
      .sort({ createdAt: -1 });

    if (orders.length === 0) {
      return res.json({ orders: [] });
    }

    const orderIds = orders.map((order) => order._id);
    const reviews = await FarmerReview.find({
      order: { $in: orderIds },
      farmer: req.user.id,
    })
      .populate("buyer", "name")
      .select("order rating qualityScore comment buyer createdAt");

    const reviewsByOrder = reviews.reduce((acc, review) => {
      const orderId = String(review.order);
      if (!acc[orderId]) acc[orderId] = [];
      acc[orderId].push({
        rating: review.rating,
        qualityScore: review.qualityScore,
        comment: review.comment,
        buyerName: review.buyer?.name || "Buyer",
        createdAt: review.createdAt,
      });
      return acc;
    }, {});

    const ordersWithReviews = orders.map((order) => ({
      ...order.toObject(),
      farmerReviews: reviewsByOrder[String(order._id)] || [],
    }));

    res.json({ orders: ordersWithReviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- ACCEPT ORDER (FARMER) ---------------- */

exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });
    if (order.status === "Pending Group Fulfillment") {
      return res.status(400).json({ message: "Order is pending group fulfillment" });
    }

    if (order.source === "subscription") {
      if (order.assignedFarmerId && String(order.assignedFarmerId) !== req.user.id) {
        return res.status(409).json({ message: "Subscription order already accepted" });
      }
    }

    for (const item of order.items) {
      if (String(item.farmerId) === req.user.id && item.status !== "Accepted") {
        if (!item.product) continue;
        const product = await Product.findById(item.product);
        if (!product)
          return res
            .status(400)
            .json({ message: "Product not found" });

        if (product.quantity < item.qty) {
          return res.status(400).json({
            message: `Insufficient stock for ${item.name}`,
          });
        }
      }
    }

    if (order.source === "subscription") {
      order.assignedFarmerId = req.user.id;
      order.items = order.items.map((item) => {
        if (String(item.farmerId) === req.user.id) {
          return { ...item.toObject(), status: "Accepted" };
        }
        return { ...item.toObject(), status: "Rejected" };
      });
      const acceptedTotal = order.items
        .filter((item) => item.status === "Accepted")
        .reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      order.total = acceptedTotal;
    } else {
      order.items = order.items.map((item) => {
        if (String(item.farmerId) === req.user.id && item.status !== "Accepted") {
          return { ...item.toObject(), status: "Accepted" };
        }
        return item;
      });
    }

    for (const item of order.items) {
      if (String(item.farmerId) === req.user.id && item.status === "Accepted") {
        if (!item.product) continue;
        const product = await Product.findById(item.product);
        if (!product) continue;

        product.quantity = Math.max(product.quantity - item.qty, 0);
        await product.save();
      }
    }

    if (order.source === "subscription") {
      order.status = "Accepted";
    } else {
      order.status = computeOrderStatus(order.items);
    }

    if (order.status === "Accepted") {
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
    } else if (order.status === "Partially Accepted") {
      order.deliveryStatus = "Pending Other Farmers";
    }

    await order.save();
    await addSystemMessage(order._id, `Order status updated: ${order.status}`);
    if (order.deliveryStatus) {
      await addSystemMessage(order._id, `Delivery update: ${order.deliveryStatus}`);
    }
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.rejectOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.source === "subscription" && order.assignedFarmerId) {
      return res.status(409).json({ message: "Subscription order already accepted" });
    }

    order.items = order.items.map((item) => {
      if (String(item.farmerId) === req.user.id) {
        return { ...item.toObject(), status: "Rejected" };
      }
      return item;
    });

    order.status = computeOrderStatus(order.items);
    if (order.status === "Rejected") {
      order.deliveryStatus = "Rejected by Farmer";
    }

    await order.save();
    await addSystemMessage(order._id, `Order status updated: ${order.status}`);
    if (order.deliveryStatus) {
      await addSystemMessage(order._id, `Delivery update: ${order.deliveryStatus}`);
    }
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- MARK ORDER RECEIVED (BUYER) ---------------- */

exports.markOrderReceived = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (String(order.buyer) !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    if (order.status === "Rejected") {
      return res.status(400).json({ message: "Rejected orders cannot be marked as received" });
    }

    order.status = "Completed";
    if (order.deliveryOption === "pickup") {
      order.deliveryStatus = "Picked Up";
    } else {
      order.deliveryStatus = "Delivered";
    }
    await order.save();
    await addSystemMessage(order._id, "Buyer confirmed order received");
    await addSystemMessage(order._id, `Delivery update: ${order.deliveryStatus}`);

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- BUYER REVIEW (FARMER) ---------------- */

exports.submitFarmerReview = async (req, res) => {
  try {
    const buyer = await User.findById(req.user.id);
    if (!buyer || buyer.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can submit reviews" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (String(order.buyer) !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to review this order" });
    }

    const { farmerId, rating, qualityScore, comment } = req.body;
    const normalizedRating = Number(rating);
    const normalizedQuality = Number(qualityScore);

    if (!farmerId) {
      return res.status(400).json({ message: "Farmer ID is required" });
    }
    if (!normalizedRating || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    if (!normalizedQuality || normalizedQuality < 1 || normalizedQuality > 5) {
      return res.status(400).json({ message: "Quality score must be between 1 and 5" });
    }

    const hasFarmerItem = order.items.some(
      (item) => String(item.farmerId) === String(farmerId)
    );
    if (!hasFarmerItem) {
      return res.status(400).json({ message: "Farmer not found in this order" });
    }

    const isDelivered =
      order.status === "Completed" ||
      ["Delivered", "Picked Up"].includes(order.deliveryStatus);

    if (!isDelivered) {
      return res.status(400).json({ message: "Order must be received before reviewing" });
    }

    const existing = await FarmerReview.findOne({
      order: order._id,
      farmer: farmerId,
      buyer: buyer._id,
    });
    if (existing) {
      return res.status(400).json({ message: "Review already submitted for this farmer" });
    }

    const review = await FarmerReview.create({
      farmer: farmerId,
      buyer: buyer._id,
      order: order._id,
      rating: normalizedRating,
      qualityScore: normalizedQuality,
      comment: comment || "",
    });

    const farmer = await User.findById(farmerId);
    if (farmer) {
      const trust = farmer.trustSignals || {};
      const ratingCount = Number(trust.ratingCount || 0);
      const nextRatingCount = ratingCount + 1;
      const ratingAverage =
        (Number(trust.ratingAverage || 0) * ratingCount + normalizedRating) /
        nextRatingCount;

      const qualityAverage =
        (Number(trust.qualityAverage || 0) * ratingCount + normalizedQuality) /
        nextRatingCount;

      const recentQualityScores = Array.isArray(trust.recentQualityScores)
        ? [...trust.recentQualityScores]
        : [];
      recentQualityScores.unshift({
        score: normalizedQuality,
        orderId: order._id,
        createdAt: new Date(),
      });

      const recentReviews = Array.isArray(trust.recentReviews)
        ? [...trust.recentReviews]
        : [];
      if (comment && comment.trim()) {
        recentReviews.unshift({
          rating: normalizedRating,
          comment: comment.trim(),
          buyerName: buyer.name,
          createdAt: new Date(),
        });
      }

      farmer.trustSignals = {
        ...trust,
        ratingCount: nextRatingCount,
        ratingAverage: Number(ratingAverage.toFixed(2)),
        qualityAverage: Number(qualityAverage.toFixed(2)),
        recentQualityScores: recentQualityScores.slice(0, 5),
        recentReviews: recentReviews.slice(0, 3),
      };
      await farmer.save();
    }

    res.status(201).json({ review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- MARK RECEIVED (FARMER) ---------------- */

exports.markOrderReceivedByFarmer = async (req, res) => {
  try {
    const farmer = await User.findById(req.user.id);
    if (!farmer || farmer.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can update delivery status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const hasFarmerItem = order.items.some(
      (item) => String(item.farmerId) === req.user.id
    );
    if (!hasFarmerItem) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    if (order.status === "Rejected") {
      return res.status(400).json({ message: "Rejected orders cannot be marked as received" });
    }

    order.status = "Completed";
    if (order.deliveryOption === "pickup") {
      order.deliveryStatus = "Picked Up";
    } else {
      order.deliveryStatus = "Delivered";
    }
    await order.save();
    await addSystemMessage(order._id, "Farmer marked order as received");
    await addSystemMessage(order._id, `Delivery update: ${order.deliveryStatus}`);

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  placeOrder,
  getBuyerOrders,
  getFarmerOrders,
  acceptOrder,
  rejectOrder,
  markOrderReceived,
  submitFarmerReview,
  markOrderReceivedByFarmer
} = require("../controllers/orderController");

const router = express.Router();

router.post("/", authMiddleware, placeOrder);
router.get("/buyer", authMiddleware, getBuyerOrders);
router.get("/farmer", authMiddleware, getFarmerOrders);
router.patch("/:id/accept", authMiddleware, acceptOrder);
router.patch("/:id/reject", authMiddleware, rejectOrder);
router.patch("/:id/received", authMiddleware, markOrderReceived);
router.patch("/:id/received-by-farmer", authMiddleware, markOrderReceivedByFarmer);
router.post("/:id/review", authMiddleware, submitFarmerReview);

module.exports = router;

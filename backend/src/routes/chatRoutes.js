const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { getOrderChat, reportMessage } = require("../controllers/chatController");

const router = express.Router();

router.get("/order/:orderId", authMiddleware, getOrderChat);
router.post("/report", authMiddleware, reportMessage);

module.exports = router;

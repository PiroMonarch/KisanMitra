const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getOpenRequests,
  acceptRequest,
} = require("../controllers/subscriptionRequestController");

const router = express.Router();

router.get("/", authMiddleware, getOpenRequests);
router.patch("/:id/accept", authMiddleware, acceptRequest);

module.exports = router;

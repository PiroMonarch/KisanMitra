const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getRequestsForFarmer,
  contribute,
  finalize
} = require("../controllers/groupFulfillmentController");

const router = express.Router();

router.get("/requests", authMiddleware, getRequestsForFarmer);
router.post("/contribute", authMiddleware, contribute);
router.post("/finalize", authMiddleware, finalize);

module.exports = router;

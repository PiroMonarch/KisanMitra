const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  createSubscription,
  getBuyerSubscriptions,
  cancelSubscription,
  runSubscriptionsNow,
  runScheduledSubscriptions,
} = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/cron/run-due", runScheduledSubscriptions);
router.post("/", authMiddleware, createSubscription);
router.get("/", authMiddleware, getBuyerSubscriptions);
router.patch("/:id/cancel", authMiddleware, cancelSubscription);
router.post("/run-now", authMiddleware, runSubscriptionsNow);

module.exports = router;

const Subscription = require("../models/Subscription");
const SubscriptionRequest = require("../models/SubscriptionRequest");

const computeNextRunAt = (dayOfWeek, now = new Date()) => {
  const next = new Date(now);
  next.setHours(0, 0, 0, 0);
  const currentDay = next.getDay();
  let delta = (dayOfWeek - currentDay + 7) % 7;
  if (delta === 0 && next <= now) {
    delta = 7;
  }
  next.setDate(next.getDate() + delta);
  return next;
};

const startOfDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfDay = (date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

const runDueSubscriptions = async (now = new Date()) => {
  const due = await Subscription.find({
    status: "active",
    nextRunAt: { $lte: now },
  });

  if (due.length === 0) return { processed: 0, created: 0 };

  let created = 0;

  for (const sub of due) {
    const already = await SubscriptionRequest.findOne({
      subscription: sub._id,
      createdAt: { $gte: startOfDay(now) },
    });

    if (already) {
      sub.lastRunAt = now;
      sub.lastResult = "skipped";
      sub.nextRunAt = computeNextRunAt(sub.dayOfWeek, new Date(now.getTime() + 24 * 60 * 60 * 1000));
      await sub.save();
      continue;
    }

    await SubscriptionRequest.create({
      subscription: sub._id,
      buyer: sub.buyer,
      buyerDetails: sub.buyerDetails,
      itemName: sub.itemName,
      qty: sub.qty,
      unit: sub.unit,
      dayOfWeek: sub.dayOfWeek,
      deliveryOption: sub.deliveryOption || "platform",
      paymentMethod: sub.paymentMethod || "cod",
      status: "open",
      expiresAt: endOfDay(now),
    });

    sub.lastRunAt = now;
    sub.lastResult = "created";
    sub.nextRunAt = computeNextRunAt(sub.dayOfWeek, new Date(now.getTime() + 24 * 60 * 60 * 1000));
    await sub.save();
    created += 1;
  }

  return { processed: due.length, created };
};

module.exports = { runDueSubscriptions, computeNextRunAt };

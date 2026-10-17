const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  connectDB().then(() => next(), next);
});

// auth routes
app.use("/api/auth", require("./routes/authRoutes"));
// scheme routes
app.use("/api/schemes", require("./routes/schemeRoutes"));
// product routes
app.use("/api/products", require("./routes/productRoutes"));
// order routes
app.use("/api/orders", require("./routes/orderRoutes"));
// subscription routes
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
// subscription request routes
app.use("/api/subscription-requests", require("./routes/subscriptionRequestRoutes"));
// weather routes
app.use("/api/weather", require("./routes/weatherRoutes"));
// assistant routes
app.use("/api/assistant", require("./routes/assistantRoutes"));
// user routes
app.use("/api/users", require("./routes/userRoutes"));
// group fulfillment routes
app.use("/api/group-fulfillment", require("./routes/groupFulfillmentRoutes"));
// resource routes
app.use("/api/resources", require("./routes/resourceRoutes"));
// news routes
app.use("/api/news", require("./routes/newsRoutes"));
// chat routes
app.use("/api/chats", require("./routes/chatRoutes"));
app.get("/", (req, res) => {
  res.send("Backend with Auth running 🚀");
});

module.exports = app;

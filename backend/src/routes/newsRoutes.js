const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { getAgricultureNews } = require("../controllers/newsController");

const router = express.Router();

router.get("/agriculture", authMiddleware, getAgricultureNews);

module.exports = router;

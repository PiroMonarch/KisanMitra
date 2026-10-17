const express = require("express");
const { createResource, getNearbyResources } = require("../controllers/resourceController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/nearby", authMiddleware, getNearbyResources);
router.post("/", authMiddleware, createResource);

module.exports = router;

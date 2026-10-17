const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { createProduct, getProducts, getFarmerProducts, deleteProduct, updateProduct } = require("../controllers/productController");

const router = express.Router();

router.get("/", getProducts);
router.post("/", authMiddleware, createProduct);
router.get("/farmer", authMiddleware, getFarmerProducts);
router.delete("/:id", authMiddleware, deleteProduct);
router.put("/:id", authMiddleware, updateProduct);

module.exports = router;

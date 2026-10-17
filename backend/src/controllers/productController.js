const Product = require("../models/Product");
const User = require("../models/User");

exports.createProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can create products" });
    }

    const { name, price, unit, quantity, image, description, shelfLifeDays } = req.body;

    if (!name || !price || !unit || !quantity || !shelfLifeDays) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const product = await Product.create({
      name,
      price,
      unit,
      quantity,
      image,
      description,
      shelfLifeDays,
      owner: user._id,
    });

    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("owner", "name location");
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFarmerProducts = async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user.id })
      .sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (String(product.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }

    await product.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (String(product.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }

    const { name, price, unit, quantity, image, description, shelfLifeDays } = req.body;

    product.name = name ?? product.name;
    product.price = price ?? product.price;
    product.unit = unit ?? product.unit;
    product.quantity = quantity ?? product.quantity;
    product.image = image ?? product.image;
    product.description = description ?? product.description;
    product.shelfLifeDays = shelfLifeDays ?? product.shelfLifeDays;

    await product.save();
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

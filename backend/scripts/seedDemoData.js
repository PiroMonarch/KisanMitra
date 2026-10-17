require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
const GroupFulfillment = require("../src/models/GroupFulfillment");

const DEMO_PASSWORD = "KisanDemo2026!";
const demoUsers = [
  {
    name: "Demo Farmer Asha",
    email: "farmer.asha@demo.kisanmitr.local",
    phone: "+919900000101",
    role: "farmer",
    location: { lat: 28.4089, lng: 77.3178, accuracy: 50, city: "Faridabad", district: "Faridabad", state: "Haryana" }
  },
  {
    name: "Demo Farmer Ravi",
    email: "farmer.ravi@demo.kisanmitr.local",
    phone: "+919900000102",
    role: "farmer",
    location: { lat: 28.4595, lng: 77.0266, accuracy: 50, city: "Gurugram", district: "Gurugram", state: "Haryana" }
  },
  {
    name: "Demo Farmer Meena",
    email: "farmer.meena@demo.kisanmitr.local",
    phone: "+919900000103",
    role: "farmer",
    location: { lat: 28.5355, lng: 77.391, accuracy: 50, city: "Noida", district: "Gautam Buddha Nagar", state: "Uttar Pradesh" }
  },
  {
    name: "Demo Buyer Green Basket",
    email: "buyer.greenbasket@demo.kisanmitr.local",
    phone: "+919900000104",
    role: "buyer",
    location: { lat: 28.4595, lng: 77.0266, accuracy: 50, city: "Gurugram", district: "Gurugram", state: "Haryana" },
    address: {
      name: "Green Basket Cafe",
      phone: "+919900000104",
      addressLine1: "12 Market Road",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122001"
    }
  }
];

const createProduct = (owner, product) => ({
  ...product,
  owner: owner._id,
  description: `[DEMO] ${product.description}`,
  shelfLifeDays: product.shelfLifeDays || 5,
  deliveryOptions: { farmerDelivery: true, platformDelivery: true, buyerPickup: true }
});

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Set it in backend/.env before seeding.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = {};
  for (const userData of demoUsers) {
    users[userData.email] = await User.findOneAndUpdate(
      { email: userData.email },
      { $set: { ...userData, password, language: "en" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  const farmers = [
    users["farmer.asha@demo.kisanmitr.local"],
    users["farmer.ravi@demo.kisanmitr.local"],
    users["farmer.meena@demo.kisanmitr.local"]
  ];
  const buyer = users["buyer.greenbasket@demo.kisanmitr.local"];
  const oldProducts = await Product.find({ owner: { $in: farmers.map((farmer) => farmer._id) } }).select("_id");
  const oldOrders = await Order.find({ buyer: buyer._id }).select("_id");
  const oldOrderIds = oldOrders.map((order) => order._id);

  await GroupFulfillment.deleteMany({ orderId: { $in: oldOrderIds } });
  await Order.deleteMany({ buyer: buyer._id });
  await Product.deleteMany({ owner: { $in: farmers.map((farmer) => farmer._id) } });

  const products = await Product.create([
    createProduct(farmers[0], {
      name: "Wheat",
      grade: "A",
      price: 28,
      unit: "kg",
      quantity: 20,
      minOrderQty: 1,
      bulkPricing: [{ minQty: 25, pricePerUnit: 26 }],
      description: "Freshly harvested local wheat, clean and ready for delivery.",
      shelfLifeDays: 180
    }),
    createProduct(farmers[1], {
      name: "Wheat",
      grade: "A",
      price: 29,
      unit: "kg",
      quantity: 25,
      minOrderQty: 1,
      description: "Demo group contribution stock: Grade A wheat.",
      shelfLifeDays: 180
    }),
    createProduct(farmers[2], {
      name: "Wheat",
      grade: "A",
      price: 27,
      unit: "kg",
      quantity: 30,
      minOrderQty: 1,
      description: "Demo group contribution stock: Grade A wheat.",
      shelfLifeDays: 180
    }),
    createProduct(farmers[0], {
      name: "Tomatoes",
      grade: "Standard",
      price: 32,
      unit: "kg",
      quantity: 45,
      minOrderQty: 1,
      description: "Fresh red tomatoes from a nearby farm.",
      shelfLifeDays: 5
    }),
    createProduct(farmers[1], {
      name: "Spinach",
      grade: "Standard",
      price: 24,
      unit: "bunch",
      quantity: 35,
      minOrderQty: 1,
      description: "Fresh leafy spinach, harvested this morning.",
      shelfLifeDays: 3
    })
  ]);

  const wheatForGroup = products.find((product) => product.name === "Wheat" && String(product.owner) === String(farmers[0]._id));
  const tomatoes = products.find((product) => product.name === "Tomatoes");

  const groupOrder = await Order.create({
    buyer: buyer._id,
    buyerDetails: buyer.address,
    deliveryOption: "platform",
    paymentMethod: "cod",
    deliveryStatus: "Pending Group Fulfillment",
    items: [{
      product: wheatForGroup._id,
      name: wheatForGroup.name,
      grade: wheatForGroup.grade,
      price: 28,
      unitPrice: 28,
      lineTotal: 1680,
      unit: "kg",
      qty: 60,
      farmerId: farmers[0]._id,
      farmerName: farmers[0].name,
      status: "Group Pending"
    }],
    total: 1680,
    status: "Pending Group Fulfillment"
  });

  await GroupFulfillment.create({
    orderId: groupOrder._id,
    productName: "Wheat",
    grade: "A",
    unit: "kg",
    requestedQty: 60,
    unitPrice: 28,
    priceMin: 25.2,
    priceMax: 30.8,
    deliveryArea: "Gurugram, Haryana",
    status: "Open",
    contributions: []
  });

  await Order.create({
    buyer: buyer._id,
    buyerDetails: buyer.address,
    deliveryOption: "platform",
    paymentMethod: "cod",
    deliveryStatus: "Pending Farmer Approval",
    items: [{
      product: tomatoes._id,
      name: tomatoes.name,
      grade: tomatoes.grade,
      price: tomatoes.price,
      unitPrice: tomatoes.price,
      lineTotal: tomatoes.price * 10,
      unit: tomatoes.unit,
      qty: 10,
      farmerId: farmers[0]._id,
      farmerName: farmers[0].name,
      status: "Pending"
    }],
    total: tomatoes.price * 10,
    status: "Pending"
  });

  console.log("Demo data is ready.");
  console.log("Demo login password:", DEMO_PASSWORD);
  console.log("Farmer accounts:");
  console.log("  farmer.asha@demo.kisanmitr.local");
  console.log("  farmer.ravi@demo.kisanmitr.local");
  console.log("  farmer.meena@demo.kisanmitr.local");
  console.log("Buyer account:");
  console.log("  buyer.greenbasket@demo.kisanmitr.local");
  console.log("Created 5 listings, 2 buyer orders, and 1 open wheat group fulfillment request.");
  console.log("Only records belonging to these dedicated demo accounts were replaced.");
};

run()
  .catch((error) => {
    console.error("Demo seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
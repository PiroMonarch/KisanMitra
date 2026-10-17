const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { updateLanguage, updateProfile } = require("../controllers/userController");

const router = express.Router();

router.patch("/language", authMiddleware, updateLanguage);
router.patch("/profile", authMiddleware, updateProfile);

module.exports = router;

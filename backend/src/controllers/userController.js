const User = require("../models/User");

exports.updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    if (!language || !["en", "hi", "pa"].includes(language)) {
      return res.status(400).json({ message: "Invalid language" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.language = language;
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        language: user.language,
        location: user.location,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { address } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (address) {
      user.address = {
        name: address.name || user.address?.name,
        phone: address.phone || user.address?.phone,
        addressLine1: address.addressLine1 || user.address?.addressLine1,
        addressLine2: address.addressLine2 || user.address?.addressLine2,
        city: address.city || user.address?.city,
        state: address.state || user.address?.state,
        pincode: address.pincode || user.address?.pincode,
      };
    }

    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        language: user.language,
        location: user.location,
        address: user.address,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

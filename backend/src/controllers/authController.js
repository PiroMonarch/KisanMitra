const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendSms } = require("../services/smsService");

const OTP_TTL_MINUTES = 5;

const createToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const normalizePhone = (phone) => (phone ? phone.trim() : "");

const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, location, language } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPhone = phone?.trim();
    const cleanName = name?.trim();
    const cleanPassword = typeof password === "string" ? password.trim() : password;

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanPassword || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!["farmer", "buyer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role selection" });
    }

    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or phone already registered" });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role,
      language: ["en", "hi", "pa"].includes(language) ? language : "en",
      location: location
        ? { ...location, capturedAt: new Date() }
        : undefined,
    });

    const token = createToken(user);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        language: user.language,
        location: user.location,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password, role, location, language } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPhone = email?.trim();
    const rawPassword = password;
    const cleanPassword = typeof password === "string" ? password.trim() : password;

    if (!email || !cleanPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (role && !["farmer", "buyer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role selection" });
    }
    if (!user.role && role) {
      user.role = role;
      await user.save();
    }
    if (language && ["en", "hi", "pa"].includes(language)) {
      user.language = language;
      await user.save();
    }

    if (role && user.role !== role) {
      return res.status(400).json({ message: "Role mismatch for this account" });
    }

    let isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch && typeof rawPassword === "string" && rawPassword !== cleanPassword) {
      isMatch = await bcrypt.compare(rawPassword, user.password);
    }
    if (!isMatch) {
      return res.status(400).json({ message: "Password mismatch" });
    }

    if (location) {
      user.location = { ...location, capturedAt: new Date() };
      await user.save();
    }

    const token = createToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        language: user.language,
        location: user.location,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// REQUEST OTP
exports.requestOtp = async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ message: "Phone is required" });
    }
    if (!["login", "register"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid OTP purpose" });
    }

    if (purpose === "register") {
      const existing = await User.findOne({ phone: cleanPhone });
      if (existing) {
        return res.status(400).json({ message: "Email or phone already registered" });
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await Otp.findOneAndUpdate(
      { phone: cleanPhone, purpose },
      { otpHash, expiresAt, attempts: 0 },
      { upsert: true }
    );

    try {
      await sendSms({
        to: cleanPhone,
        message: `Your Kisanmitr OTP is ${otp}. It is valid for ${OTP_TTL_MINUTES} minutes.`
      });
      return res.json({ message: "OTP sent" });
    } catch (smsError) {
      const allowFallback = process.env.SMS_ALLOW_FALLBACK === "true" || process.env.NODE_ENV !== "production";
      if (!allowFallback) {
        throw smsError;
      }
      return res.json({
        message: "OTP generated, SMS unavailable. Use the code provided.",
        otp: otp
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp, purpose, name, email, password, role, location, language } = req.body;
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }
    if (!["login", "register"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid OTP purpose" });
    }

    const record = await Otp.findOne({ phone: cleanPhone, purpose });
    if (!record) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }
    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    const isMatch = await bcrypt.compare(otp.toString(), record.otpHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await record.deleteOne();

    if (purpose === "register") {
      if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ $or: [{ email: cleanEmail }, { phone: cleanPhone }] });
      if (existing) {
        return res.status(400).json({ message: "Email or phone already registered" });
      }
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      const user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password: hashedPassword,
        role,
        language: ["en", "hi", "pa"].includes(language) ? language : "en",
        location: location ? { ...location, capturedAt: new Date() } : undefined
      });

      const token = createToken(user);
      return res.status(201).json({
        message: "User registered successfully",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          language: user.language,
          location: user.location
        }
      });
    }

    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (role && user.role !== role) {
      return res.status(400).json({ message: "Role mismatch for this account" });
    }
    if (language && ["en", "hi", "pa"].includes(language)) {
      user.language = language;
    }
    if (location) {
      user.location = { ...location, capturedAt: new Date() };
    }
    await user.save();

    const token = createToken(user);
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        language: user.language,
        location: user.location
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

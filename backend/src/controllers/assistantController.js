const { generateContent } = require("../services/aiService");
const { getWeatherSummary } = require("../services/weatherService");
const User = require("../models/User");

exports.chat = async (req, res) => {
  try {
    const { prompt, context, language } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }
    const user = await User.findById(req.user.id);
    let weather = null;
    if (user?.location?.lat && user?.location?.lng) {
      try {
        weather = await getWeatherSummary({ lat: user.location.lat, lng: user.location.lng });
      } catch (error) {
        weather = null;
      }
    }

    const preferredLanguage = user?.language || language || "en";
    const answer = await generateContent({ prompt, context, weather, language: preferredLanguage });
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

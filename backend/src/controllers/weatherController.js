const { getWeatherSummary } = require("../services/weatherService");

exports.getWeather = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const summary = await getWeatherSummary({ lat, lng });
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5";

const getWeatherSummary = async ({ lat, lng }) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY not configured");
  }

  const currentRes = await fetch(
    `${OPENWEATHER_BASE}/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
  );
  const current = await currentRes.json();
  if (!currentRes.ok) {
    throw new Error(current?.message || "Failed to fetch current weather");
  }

  const forecastRes = await fetch(
    `${OPENWEATHER_BASE}/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
  );
  const forecast = await forecastRes.json();
  if (!forecastRes.ok) {
    throw new Error(forecast?.message || "Failed to fetch forecast weather");
  }

  const nowTemp = current.main?.temp;
  const nowHumidity = current.main?.humidity;
  const nowRain = current.rain?.["1h"] || current.rain?.["3h"] || 0;
  const description = current.weather?.[0]?.description || "";

  const next24 = (forecast.list || []).slice(0, 8);
  const upcomingRain = next24.reduce((sum, entry) => sum + (entry.rain?.["3h"] || 0), 0);
  const hasStorm = next24.some((entry) =>
    ["thunderstorm", "tornado", "squall"].includes(entry.weather?.[0]?.main?.toLowerCase())
  );
  const heavyRain = next24.some((entry) => (entry.rain?.["3h"] || 0) >= 10);

  const alerts = [];
  if (hasStorm) alerts.push("Storm risk in next 24 hours");
  if (heavyRain) alerts.push("Heavy rain expected in next 24 hours");
  if (!alerts.length && upcomingRain > 0) alerts.push("Light rain possible in next 24 hours");

  return {
    temperatureC: nowTemp,
    humidity: nowHumidity,
    rainfallMm: Number(nowRain.toFixed(2)),
    rainfallNext24hMm: Number(upcomingRain.toFixed(2)),
    description,
    alerts
  };
};

module.exports = { getWeatherSummary };

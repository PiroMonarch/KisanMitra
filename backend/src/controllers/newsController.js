const Product = require("../models/Product");
const User = require("../models/User");
const { fetchAgricultureNews } = require("../services/newsService");
const { generateNewsImpact, translateNewsItem } = require("../services/aiService");

const IMPACT_TTL_MS = 6 * 60 * 60 * 1000;
const impactCache = new Map();
const translationCache = new Map();

const getCachedImpact = (key) => {
  const entry = impactCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > IMPACT_TTL_MS) {
    impactCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCachedImpact = (key, value) => {
  impactCache.set(key, { value, cachedAt: Date.now() });
};

const getCachedTranslation = (key) => {
  const entry = translationCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > IMPACT_TTL_MS) {
    translationCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCachedTranslation = (key, value) => {
  translationCache.set(key, { value, cachedAt: Date.now() });
};

exports.getAgricultureNews = async (req, res) => {
  try {
    const language = req.query.language || "en";
    const { items, stale, cachedAt, error } = await fetchAgricultureNews({ language });
    const limit = Number(req.query.limit) || 6;
    const newsItems = items.slice(0, limit);

    const user = await User.findById(req.user?.id).lean();
    const listings = await Product.find({ owner: req.user?.id }).lean();

    const profile = {
      role: user?.role,
      location: user?.location,
      crops: listings.map((item) => item.name),
      inventory: listings.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        grade: item.grade
      }))
    };

    const enriched = [];
    for (const item of newsItems) {
      let localizedItem = item;
      if (language !== "en") {
        const translationKey = `${item.id}:${language}`;
        let translation = getCachedTranslation(translationKey);
        if (!translation) {
          try {
            translation = await translateNewsItem({
              title: item.title,
              summary: item.summary,
              language
            });
            setCachedTranslation(translationKey, translation);
          } catch (translateError) {
            translation = null;
          }
        }
        if (translation) {
          localizedItem = {
            ...item,
            title: translation.title || item.title,
            summary: translation.summary || item.summary
          };
        }
      }

      const cacheKey = `${req.user?.id || "anon"}:${item.id}:${language}`;
      let impact = getCachedImpact(cacheKey);
      if (!impact) {
        try {
          impact = await generateNewsImpact({ item: localizedItem, userProfile: profile, language });
          setCachedImpact(cacheKey, impact);
        } catch (aiError) {
          impact = null;
        }
      }
      enriched.push({ ...localizedItem, impact });
    }

    res.json({
      items: enriched,
      stale,
      cachedAt,
      error: error || null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

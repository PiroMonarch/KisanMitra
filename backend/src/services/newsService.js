const DEFAULT_TTL_MS = 10 * 60 * 1000;

const cachedNewsByLanguage = new Map();

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const buildId = (title, url, publishedAt) =>
  Buffer.from(`${title || ""}|${url || ""}|${publishedAt || ""}`).toString("base64");

const fetchFromProvider = async ({ provider, apiKey, query, language }) => {
  if (!apiKey) {
    throw new Error("NEWS_API_KEY not configured");
  }

  const q = encodeURIComponent(query);
  if (provider === "newsapi") {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${q}&language=${language || "en"}&sortBy=publishedAt&pageSize=12&apiKey=${apiKey}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "News API error");
    }
    return (data.articles || []).map((item) => ({
      title: item.title,
      source: item.source?.name || "News",
      url: item.url,
      publishedAt: normalizeDate(item.publishedAt),
      summary: item.description
    }));
  }

  if (provider === "newsdata") {
    const response = await fetch(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${q}&language=${language || "en"}&category=business,environment`
    );
    const data = await response.json();
    if (!response.ok || data?.status === "error") {
      throw new Error(data?.results?.message || data?.message || "NewsData API error");
    }
    return (data.results || []).map((item) => ({
      title: item.title,
      source: item.source_id || "News",
      url: item.link,
      publishedAt: normalizeDate(item.pubDate),
      summary: item.description
    }));
  }

  const response = await fetch(
    `https://gnews.io/api/v4/search?q=${q}&lang=${language || "en"}&max=12&token=${apiKey}`
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.errors?.[0] || "GNews API error");
  }
  return (data.articles || []).map((item) => ({
    title: item.title,
    source: item.source?.name || "News",
    url: item.url,
    publishedAt: normalizeDate(item.publishedAt),
    summary: item.description
  }));
};

const fetchFallbackHeadlines = async ({ provider, apiKey, language }) => {
  if (!apiKey) return [];
  if (provider === "newsapi") {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=in&category=business&pageSize=12&apiKey=${apiKey}`
    );
    const data = await response.json();
    if (!response.ok) return [];
    return (data.articles || []).map((item) => ({
      title: item.title,
      source: item.source?.name || "News",
      url: item.url,
      publishedAt: normalizeDate(item.publishedAt),
      summary: item.description
    }));
  }
  if (provider === "newsdata") {
    const response = await fetch(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&country=in&language=${language || "en"}&category=business,environment`
    );
    const data = await response.json();
    if (!response.ok || data?.status === "error") return [];
    return (data.results || []).map((item) => ({
      title: item.title,
      source: item.source_id || "News",
      url: item.link,
      publishedAt: normalizeDate(item.pubDate),
      summary: item.description
    }));
  }
  const response = await fetch(
    `https://gnews.io/api/v4/top-headlines?topic=business&lang=${language || "en"}&token=${apiKey}&max=12`
  );
  const data = await response.json();
  if (!response.ok) return [];
  return (data.articles || []).map((item) => ({
    title: item.title,
    source: item.source?.name || "News",
    url: item.url,
    publishedAt: normalizeDate(item.publishedAt),
    summary: item.description
  }));
};

const fetchAgricultureNews = async ({ language = "en" } = {}) => {
  const now = Date.now();
  const cached = cachedNewsByLanguage.get(language);
  if (cached?.items?.length && now - cached.cachedAt < DEFAULT_TTL_MS) {
    return { items: cached.items, stale: false, cachedAt: cached.cachedAt };
  }

  const apiKey = process.env.NEWS_API_KEY;
  const provider = (process.env.NEWS_API_PROVIDER || "gnews").toLowerCase();
  const query =
    process.env.NEWS_API_QUERY ||
    "agriculture OR farming OR mandi OR crop OR fertilizer OR subsidy OR trade OR dairy OR poultry";

  try {
    let items = await fetchFromProvider({ provider, apiKey, query, language });
    if (!items.length) {
      const broaderQuery = "agriculture India OR crop price OR mandi OR weather alert OR subsidy";
      items = await fetchFromProvider({ provider, apiKey, query: broaderQuery, language });
    }
    if (!items.length) {
      items = await fetchFallbackHeadlines({ provider, apiKey, language });
    }
    const normalized = items
      .filter((item) => item.title && item.url)
      .map((item) => ({
        ...item,
        id: buildId(item.title, item.url, item.publishedAt)
      }));
    cachedNewsByLanguage.set(language, { items: normalized, cachedAt: now });
    return { items: normalized, stale: false, cachedAt };
  } catch (error) {
    if (cached?.items?.length) {
      return { items: cached.items, stale: true, cachedAt: cached.cachedAt, error: error.message };
    }
    return { items: [], stale: true, cachedAt: null, error: error.message };
  }
};

module.exports = { fetchAgricultureNews };

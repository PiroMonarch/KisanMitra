const DEFAULT_API_VERSION = process.env.GEMINI_API_VERSION || "v1";
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

let cachedModel = null;
let cachedAt = 0;

const listAvailableModels = async (apiKey) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${DEFAULT_API_VERSION}/models?key=${apiKey}`
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to list Gemini models");
  }
  return data.models || [];
};

const pickModel = async (apiKey) => {
  const now = Date.now();
  if (cachedModel && now - cachedAt < MODEL_CACHE_TTL_MS) {
    return cachedModel;
  }

  try {
    const models = await listAvailableModels(apiKey);
    const supported = models.filter((model) =>
      model.supportedGenerationMethods?.includes("generateContent")
    );

    const envModel = process.env.GEMINI_MODEL;
    if (envModel) {
      const normalized = envModel.replace(/^models\//, "");
      const match = supported.find((model) => model.name?.endsWith(normalized));
      if (match) {
        cachedModel = normalized;
        cachedAt = now;
        return normalized;
      }
    }

    const fallback = supported.find((model) =>
      model.name?.includes("gemini")
    );
    const selected = fallback?.name?.replace(/^models\//, "");
    cachedModel = selected;
    cachedAt = now;
    return selected;
  } catch (error) {
    const envModel = process.env.GEMINI_MODEL;
    cachedModel = envModel ? envModel.replace(/^models\//, "") : null;
    cachedAt = now;
    return cachedModel;
  }
};

const languageLabel = (code) => {
  if (code === "hi") return "Hindi";
  if (code === "pa") return "Punjabi";
  return "English";
};

const buildPrompt = (prompt, context, weather, language) => {
  const systemPrompt =
    `You are Kisanmitr, a helpful farming assistant. Answer farming questions. Give crop, input, and scheme recommendations when relevant. Explicitly factor the provided weather and location context into your answer (crop suitability, irrigation advice, fertilizer usage, pest/disease risk) and tailor advice to the farmer's area. Keep responses concise and practical. If advice is weather-sensitive or safety-critical, provide precautions. Respond strictly in ${languageLabel(language)} using simple, farmer-friendly wording.` +
    ` If the user's question is NOT related to agriculture, farming, markets, or rural livelihoods, do NOT attempt to answer it. Instead, reply briefly (one or two sentences) in ${languageLabel(language)} with a polite instruction asking the user to ask something related to agriculture. Provide one short example of an acceptable agriculture question (for example: crops, irrigation, pests, fertilizer, mandi prices). Do not add any other content.`;
  const userPrompt = context
    ? `Context: ${JSON.stringify(context)}\n\nQuestion: ${prompt}`
    : prompt;

  const weatherBlock = weather ? `Weather: ${JSON.stringify(weather)}` : "Weather: not available";
  const locationBlock = context?.location ? `Location: ${JSON.stringify(context.location)}` : "Location: not available";
  return `${systemPrompt}\n\n${locationBlock}\n\n${weatherBlock}\n\n${userPrompt}`;
};

const callGemini = async ({ apiKey, model, requestBody }) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${DEFAULT_API_VERSION}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    }
  );
  const data = await response.json();
  return { response, data };
};

const generateContent = async ({ prompt, context, weather, language }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const model = await pickModel(apiKey);
  if (!model) {
    throw new Error("No Gemini model available for generateContent");
  }
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: buildPrompt(prompt, context, weather, language) }]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1500
    }
  };

  let { response, data } = await callGemini({ apiKey, model, requestBody });

  if (!response.ok) {
    const message = data?.error?.message || "";
    if (message.includes("not found") || message.includes("not supported")) {
      cachedModel = null;
      const altModel = await pickModel(apiKey);
      if (altModel && altModel !== model) {
        const retry = await callGemini({ apiKey, model: altModel, requestBody });
        response = retry.response;
        data = retry.data;
      }
    }
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed");
  }

  // Some Gemini responses may return multiple parts; join all text parts to avoid accidental truncation.
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const answer = parts.map((p) => (p?.text || '')).join(' ').trim();
  if (!answer) {
    throw new Error('Gemini response was empty');
  }
  return answer;
};

const buildNewsImpactPrompt = ({ item, userProfile, language }) => {
  const baseProfile = {
    role: userProfile?.role,
    location: userProfile?.location,
    crops: userProfile?.crops || [],
    inventory: userProfile?.inventory || []
  };
  const systemPrompt =
    `You are Kisanmitr's agriculture news assistant. Given a news item and a farmer profile, return ONLY valid JSON with keys: impact (string), access (array of strings), positive (array of strings), negative (array of strings). ` +
    `Impact should be a concise summary (max 35 words). Access should explain what the farmer will have access to or can do because of the news (1-3 items). ` +
    `Positive and negative should list likely effects for farmers (1-3 items each). Use simple farmer-friendly wording in ${languageLabel(language)}. If unsure, use empty arrays.`;
  const userPrompt = `News: ${item.title}\nSource: ${item.source}\nDate: ${item.publishedAt}\nSummary: ${item.summary || ""}\nProfile: ${JSON.stringify(baseProfile)}`;
  return `${systemPrompt}\n\n${userPrompt}`;
};

const generateNewsImpact = async ({ item, userProfile, language }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  const model = await pickModel(apiKey);
  if (!model) {
    throw new Error("No Gemini model available for generateContent");
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: buildNewsImpactPrompt({ item, userProfile, language }) }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 260
    }
  };

  let { response, data } = await callGemini({ apiKey, model, requestBody });
  if (!response.ok) {
    const message = data?.error?.message || "";
    if (message.includes("not found") || message.includes("not supported")) {
      cachedModel = null;
      const altModel = await pickModel(apiKey);
      if (altModel && altModel !== model) {
        const retry = await callGemini({ apiKey, model: altModel, requestBody });
        response = retry.response;
        data = retry.data;
      }
    }
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed");
  }

  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!answer) {
    throw new Error("Gemini response was empty");
  }

  const firstBrace = answer.indexOf("{");
  const lastBrace = answer.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = answer.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(slice);
      return {
        impact: typeof parsed.impact === "string" ? parsed.impact : "",
        access: Array.isArray(parsed.access) ? parsed.access : [],
        positive: Array.isArray(parsed.positive) ? parsed.positive : [],
        negative: Array.isArray(parsed.negative) ? parsed.negative : [],
      };
    } catch (error) {
      // fall through to string fallback
    }
  }
  return { impact: answer, access: [], positive: [], negative: [] };
};

const buildNewsTranslationPrompt = ({ title, summary, language }) => {
  const systemPrompt =
    `Translate the following agriculture news fields into ${languageLabel(language)}. ` +
    `Return ONLY valid JSON with keys: title, summary. Keep it concise and farmer-friendly. ` +
    `If a field is empty, return an empty string. Do not add extra commentary.`;
  const userPrompt = `Title: ${title || ""}\nSummary: ${summary || ""}`;
  return `${systemPrompt}\n\n${userPrompt}`;
};

const translateNewsItem = async ({ title, summary, language }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  const model = await pickModel(apiKey);
  if (!model) {
    throw new Error("No Gemini model available for generateContent");
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: buildNewsTranslationPrompt({ title, summary, language }) }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 220
    }
  };

  let { response, data } = await callGemini({ apiKey, model, requestBody });
  if (!response.ok) {
    const message = data?.error?.message || "";
    if (message.includes("not found") || message.includes("not supported")) {
      cachedModel = null;
      const altModel = await pickModel(apiKey);
      if (altModel && altModel !== model) {
        const retry = await callGemini({ apiKey, model: altModel, requestBody });
        response = retry.response;
        data = retry.data;
      }
    }
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed");
  }

  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!answer) {
    throw new Error("Gemini response was empty");
  }

  const firstBrace = answer.indexOf("{");
  const lastBrace = answer.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = answer.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(slice);
      return {
        title: typeof parsed.title === "string" ? parsed.title : "",
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
      };
    } catch (error) {
      // fall through to string fallback
    }
  }

  return { title, summary };
};

module.exports = { generateContent, generateNewsImpact, translateNewsItem };

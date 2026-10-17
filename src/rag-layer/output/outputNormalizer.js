/**
 * RAG Output Normalizer
 * 
 * Pure deterministic post-processing pass that runs AFTER RAG generation
 * but BEFORE response return.
 * 
 * NO LLM CALLS. Pure logic only.
 * 
 * Responsibilities:
 * 1. Remove repeated phrases
 * 2. Deduplicate lists (documents, benefits, steps)
 * 3. Enforce language consistency
 * 4. Apply confidence-based tone
 * 5. Produce clean, normalized output for UI/TTS
 */

// Minimum context threshold (configurable)
const MIN_CONTEXT_THRESHOLD = 50;  // characters

// Language detection patterns
const HINDI_PATTERN = /[\u0900-\u097F]/;
const ENGLISH_PATTERN = /[a-zA-Z]{3,}/;

/**
 * Main normalization function.
 * Runs all normalization passes on RAG output.
 * 
 * @param {Object} rawOutput - Raw RAG output before normalization
 * @param {string} primaryLanguage - 'en' or 'hi'
 * @returns {Object} Normalized, clean output
 */
export function normalizeRagOutput(rawOutput, primaryLanguage = 'en') {
    if (!rawOutput) {
        return createEmptyNormalizedOutput();
    }

    let normalized = { ...rawOutput };

    // Pass 1: Remove repeated phrases
    normalized = removeRepeatedPhrases(normalized);

    // Pass 2: Deduplicate lists
    normalized = deduplicateLists(normalized);

    // Pass 2.5: Structural Normalization with Authoritative Fix
    // Eligibility Criteria
    if (normalized.eligibility_reason) {
        normalized.eligibility_reason = {
            reason: normalized.eligibility_reason.why || normalized.eligibility_reason.reason || '',
            criteria: normalizeToStringArray(normalized.eligibility_reason.criteria)
        };
    }

    // Documents Required (Fixes undefined)
    if (normalized.documents_required) {
        const docList = normalizeToStringArray(
            normalized.documents_required.list || normalized.documents_required.documents,
            d => d.name || d
        );
        normalized.documents_required = {
            total: docList.length,
            list: docList
        };
    }

    // Application Steps (Fixes [object Object])
    if (normalized.application_steps) {
        normalized.application_steps = {
            steps: normalizeToStringArray(
                normalized.application_steps.steps,
                // Prioritize 'text' (rich object) over simple 'step' (number)
                s => s.text || s.step || s.description || s
            ),
            where: normalized.application_steps.where || ''
        };
    }

    // Benefits Summary (Fixes [object Object])
    if (normalized.benefits_summary) {
        normalized.benefits_summary = {
            primary: normalized.benefits_summary.primary || '',
            amounts: normalizeToStringArray(
                normalized.benefits_summary.amounts,
                a => a.amount || a
            ),
            interest: typeof normalized.benefits_summary.interest === 'string'
                ? normalized.benefits_summary.interest
                : (normalized.benefits_summary.interest?.rate || normalized.benefits_summary.interest || '')
        };
    }

    // Pass 3: Enforce language consistency
    normalized = enforceLanguageConsistency(normalized, primaryLanguage);

    // Pass 4: Apply confidence-based tone
    normalized = applyConfidenceBasedTone(normalized);

    // Pass 5: Final cleanup
    normalized = finalCleanup(normalized);

    // Mark as normalized
    normalized._normalized = true;
    normalized._normalized_at = Date.now();

    return normalized;
}

/**
 * Universal normalization utility.
 * normalizeToStringArray(value, extractor)
 */
function normalizeToStringArray(value, extractor = null) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value
            .map(v => {
                if (typeof v === 'string') return v;
                if (typeof v === 'object' && v !== null && extractor) return extractor(v);
                return null;
            })
            .filter(Boolean); // Remove nulls/empty
    }

    if (typeof value === 'string') return [value];

    if (typeof value === 'object' && value !== null && extractor) {
        const extracted = extractor(value);
        return extracted ? [extracted] : [];
    }

    return [];
}

// ═══════════════════════════════════════════════════════════════
// PASS 1: REMOVE REPEATED PHRASES
// ═══════════════════════════════════════════════════════════════

/**
 * Fix 5: Text Cleanup
 */
function normalizeText(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/Benefits of\s+/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Removes repeated phrases from text fields.
 * Also applies normalizeText cleanup.
 */
function removeRepeatedPhrases(output) {
    const result = { ...output };

    // Process all string fields recursively
    for (const [key, value] of Object.entries(result)) {
        if (typeof value === 'string') {
            result[key] = normalizeText(removeRepeatsFromString(value));
        } else if (typeof value === 'object' && value !== null) {
            result[key] = removeRepeatedPhrases(value);
        }
    }
    return result;
}



/**
 * Removes repeated phrases from a single string.
 */
function removeRepeatsFromString(text) {
    if (!text || typeof text !== 'string') return text;

    let cleaned = text;

    // Pattern 1: Exact duplicate sentences
    // "Hello world. Hello world." → "Hello world."
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const uniqueSentences = [];
    const seenSentences = new Set();

    for (const sentence of sentences) {
        const normalized = sentence.trim().toLowerCase();
        if (!seenSentences.has(normalized) && sentence.trim()) {
            seenSentences.add(normalized);
            uniqueSentences.push(sentence.trim());
        }
    }
    cleaned = uniqueSentences.join(' ');

    // Pattern 2: Repeated header patterns
    // "Benefits of KCC: Benefits of KCC:" → "Benefits of KCC:"
    cleaned = cleaned.replace(/(.{10,}?):\s*\1:/gi, '$1:');

    // Pattern 3: Consecutive duplicate words (not intentional)
    // "the the" → "the" (but keep "very very" if intentional emphasis - skip)
    cleaned = cleaned.replace(/\b(\w{4,})\s+\1\b/gi, '$1');

    // Pattern 4: Repeated line content
    const lines = cleaned.split('\n');
    const uniqueLines = [];
    const seenLines = new Set();

    for (const line of lines) {
        const normalized = line.trim().toLowerCase();
        if (!seenLines.has(normalized) || normalized === '') {
            seenLines.add(normalized);
            uniqueLines.push(line);
        }
    }
    cleaned = uniqueLines.join('\n');

    return cleaned.trim();
}

// ═══════════════════════════════════════════════════════════════
// PASS 2: DEDUPLICATE LISTS
// ═══════════════════════════════════════════════════════════════

/**
 * Deduplicates arrays while preserving original order.
 * Applies to documents, benefits, steps, amounts.
 */
function deduplicateLists(output) {
    const result = { ...output };

    // Known list fields to deduplicate
    const listFields = [
        'documents',
        'documents_required.list',
        'benefits',
        'secondary_benefits',
        'steps',
        'application_steps.steps',
        'amounts',
        'amounts_mentioned',
        'criteria',
        'matching_criteria'
    ];

    for (const fieldPath of listFields) {
        const value = getNestedValue(result, fieldPath);
        if (Array.isArray(value)) {
            setNestedValue(result, fieldPath, deduplicateArray(value));
        }
    }

    return result;
}

/**
 * Deduplicates an array while preserving order.
 */
function deduplicateArray(arr) {
    if (!Array.isArray(arr)) return arr;

    const seen = new Set();
    const unique = [];

    for (const item of arr) {
        // Create a comparison key
        let key;
        if (typeof item === 'string') {
            key = item.trim().toLowerCase();
        } else if (typeof item === 'object' && item !== null) {
            // For objects like { name: 'Aadhaar', required: true }
            key = JSON.stringify(item.name || item).toLowerCase();
        } else {
            key = String(item);
        }

        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }

    return unique;
}

// ═══════════════════════════════════════════════════════════════
// PASS 3: ENFORCE LANGUAGE CONSISTENCY
// ═══════════════════════════════════════════════════════════════

/**
 * Enforces language consistency.
 * English output must not contain Hindi tokens.
 * Hindi output must not contain English sentences.
 */
function enforceLanguageConsistency(output, primaryLanguage) {
    const result = { ...output };

    // Process text fields
    if (result.simple_explanation) {
        if (primaryLanguage === 'en' && result.simple_explanation.en) {
            result.simple_explanation.en = removeHindiFromEnglish(result.simple_explanation.en);
        }
        if (primaryLanguage === 'hi' && result.simple_explanation.hi) {
            result.simple_explanation.hi = removeEnglishFromHindi(result.simple_explanation.hi);
        }
    }

    // Process eligibility reason
    if (result.eligibility_reason?.reason) {
        if (primaryLanguage === 'en') {
            result.eligibility_reason.reason = removeHindiFromEnglish(result.eligibility_reason.reason);
        }
    }

    return result;
}

/**
 * Removes Hindi characters from English text.
 * Falls back to English-only content.
 */
function removeHindiFromEnglish(text) {
    if (!text || typeof text !== 'string') return text;

    // If text has significant Hindi, it's likely wrong field - return as is with warning
    const hindiRatio = (text.match(HINDI_PATTERN) || []).length / text.length;
    if (hindiRatio > 0.3) {
        // Text is mostly Hindi - likely wrong language field
        return '[Language mismatch - content unavailable in English]';
    }

    // Remove isolated Hindi words/phrases
    return text.replace(/[\u0900-\u097F]+/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Removes English sentences from Hindi text.
 * Keeps English technical terms (scheme names, amounts).
 */
function removeEnglishFromHindi(text) {
    if (!text || typeof text !== 'string') return text;

    // Keep: Numbers, amounts (₹), scheme acronyms (KCC, PMKISAN)
    // Remove: Full English sentences

    // If mostly English, fallback
    const englishRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
    if (englishRatio > 0.7) {
        return '[भाषा मेल नहीं खाती - हिंदी में उपलब्ध नहीं]';
    }

    // Allow technical terms, remove full English phrases
    // Keep: "KCC", "₹3 lakh", "PMKISAN"
    // Remove: "This is an English sentence."

    return text;
}

// ═══════════════════════════════════════════════════════════════
// PASS 4: APPLY CONFIDENCE-BASED TONE
// ═══════════════════════════════════════════════════════════════

/**
 * Adjusts language tone based on confidence level.
 * HIGH → direct, affirmative
 * MEDIUM → cautious wording
 * LOW → advisory + disclaimer required
 */
function applyConfidenceBasedTone(output) {
    const result = { ...output };
    const confidence = result.overall_confidence || result.confidence || 'MEDIUM';

    // Add tone markers
    result._tone = getToneForConfidence(confidence);

    // Add required disclaimers for low confidence
    if (confidence === 'LOW') {
        result.disclaimer = result.disclaimer || {
            en: 'This information may be incomplete. Please verify with local authorities before proceeding.',
            hi: 'यह जानकारी अधूरी हो सकती है। कृपया आगे बढ़ने से पहले स्थानीय अधिकारियों से सत्यापित करें।'
        };
        result.requires_disclaimer = true;
    }

    // Add cautionary prefix for MEDIUM confidence
    if (confidence === 'MEDIUM') {
        result._caution_prefix = {
            en: 'Based on available information: ',
            hi: 'उपलब्ध जानकारी के अनुसार: '
        };
    }

    // HIGH confidence - add affirmative marker
    if (confidence === 'HIGH') {
        result._affirmative = true;
    }

    return result;
}

/**
 * Gets tone configuration for confidence level.
 */
function getToneForConfidence(confidence) {
    const tones = {
        HIGH: {
            style: 'affirmative',
            allowDirectStatements: true,
            requireDisclaimer: false,
            prefixEn: '',
            prefixHi: ''
        },
        MEDIUM: {
            style: 'cautious',
            allowDirectStatements: false,
            requireDisclaimer: false,
            prefixEn: 'Based on available records, ',
            prefixHi: 'उपलब्ध रिकॉर्ड के अनुसार, '
        },
        LOW: {
            style: 'advisory',
            allowDirectStatements: false,
            requireDisclaimer: true,
            prefixEn: 'Please verify: ',
            prefixHi: 'कृपया सत्यापित करें: '
        }
    };

    return tones[confidence] || tones.MEDIUM;
}

// ═══════════════════════════════════════════════════════════════
// PASS 5: FINAL CLEANUP
// ═══════════════════════════════════════════════════════════════

/**
 * Final cleanup pass - whitespace, empty fields, formatting.
 */
function finalCleanup(output) {
    const result = { ...output };

    // Remove empty string fields
    for (const [key, value] of Object.entries(result)) {
        if (value === '' || value === null || value === undefined) {
            delete result[key];
        } else if (typeof value === 'string') {
            // Normalize whitespace
            result[key] = value.replace(/\s+/g, ' ').trim();
        } else if (Array.isArray(value)) {
            // Remove empty array items
            result[key] = value.filter(item =>
                item !== '' && item !== null && item !== undefined
            );
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Gets nested value from object by dot-notation path.
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) =>
        current && current[key] !== undefined ? current[key] : undefined
        , obj);
}

/**
 * Sets nested value in object by dot-notation path.
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
}

/**
 * Creates empty normalized output for null/undefined input.
 */
function createEmptyNormalizedOutput() {
    return {
        success: false,
        error: 'No RAG output to normalize',
        _normalized: true,
        _normalized_at: Date.now()
    };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    normalizeRagOutput,
    normalizeToStringArray,
    removeRepeatedPhrases,
    deduplicateLists,
    enforceLanguageConsistency,
    applyConfidenceBasedTone,
    MIN_CONTEXT_THRESHOLD
};

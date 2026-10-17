/**
 * Intent Detector Module
 * 
 * Handles intent entry for the loan assistant.
 * Supports both button clicks and simple keyword matching.
 * 
 * 100% deterministic - no AI, no embeddings, no inference.
 * 
 * Supported intents:
 * - AGRI_LOAN: Agricultural loan queries
 * - GOV_SCHEME: Government scheme queries
 */

import { INTENTS } from '../constants/eligibilityOptions.js';

// Keyword mappings for intent detection (case-insensitive)
// These are simple, explicit keyword matches
const INTENT_KEYWORDS = Object.freeze({
    [INTENTS.AGRI_LOAN]: [
        'loan',
        'credit',
        'ऋण',      // Hindi: loan
        'कर्ज',     // Hindi: debt/loan
        'kcc',
        'kisan credit',
        'borrow',
        'money',
        'पैसा',     // Hindi: money
        'उधार'      // Hindi: borrow
    ],
    [INTENTS.GOV_SCHEME]: [
        'scheme',
        'yojana',
        'योजना',    // Hindi: scheme
        'subsidy',
        'सब्सिडी',  // Hindi: subsidy
        'government',
        'sarkar',
        'सरकार',    // Hindi: government
        'pm',
        'pradhan mantri',
        'प्रधानमंत्री'  // Hindi: Prime Minister
    ]
});

/**
 * Detects intent from a button click.
 * This is the primary method - explicit user action.
 * 
 * @param {string} intentType - The intent type from button (AGRI_LOAN or GOV_SCHEME)
 * @returns {Object} Intent result with type and confidence
 */
export function detectIntentFromButton(intentType) {
    // Validate input
    if (!intentType || typeof intentType !== 'string') {
        return createIntentResult(null, 'INVALID_INPUT');
    }

    const normalizedIntent = intentType.toUpperCase().trim();

    // Check if it's a valid intent
    if (Object.values(INTENTS).includes(normalizedIntent)) {
        return createIntentResult(normalizedIntent, 'BUTTON_CLICK');
    }

    return createIntentResult(null, 'UNKNOWN_INTENT');
}

/**
 * Detects intent from simple text input using keyword matching.
 * This is a fallback method for text input.
 * Only matches against known keywords - no inference.
 * 
 * @param {string} text - The user's input text
 * @returns {Object} Intent result with type and confidence
 */
export function detectIntentFromText(text) {
    // Validate input
    if (!text || typeof text !== 'string') {
        return createIntentResult(null, 'INVALID_INPUT');
    }

    const normalizedText = text.toLowerCase().trim();

    // Check each intent's keywords
    const matches = [];

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
        for (const keyword of keywords) {
            if (normalizedText.includes(keyword.toLowerCase())) {
                matches.push({
                    intent,
                    keyword,
                    position: normalizedText.indexOf(keyword.toLowerCase())
                });
            }
        }
    }

    // No matches found
    if (matches.length === 0) {
        return createIntentResult(null, 'NO_MATCH');
    }

    // If we have matches for only one intent, use it
    const uniqueIntents = [...new Set(matches.map(m => m.intent))];

    if (uniqueIntents.length === 1) {
        return createIntentResult(uniqueIntents[0], 'KEYWORD_MATCH', {
            matched_keywords: matches.map(m => m.keyword)
        });
    }

    // Multiple intents matched - ambiguous
    // Return null with details so UI can ask for clarification
    return createIntentResult(null, 'AMBIGUOUS', {
        possible_intents: uniqueIntents,
        matched_keywords: matches.map(m => ({ intent: m.intent, keyword: m.keyword }))
    });
}

/**
 * Creates a standardized intent result object.
 * 
 * @param {string|null} intent - The detected intent or null
 * @param {string} source - How the intent was detected
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Standardized intent result
 */
function createIntentResult(intent, source, metadata = {}) {
    return {
        intent,
        source,
        valid: intent !== null,
        timestamp: Date.now(),
        ...metadata
    };
}

/**
 * Validates if a given intent is supported.
 * 
 * @param {string} intent - Intent to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidIntent(intent) {
    if (!intent || typeof intent !== 'string') {
        return false;
    }
    return Object.values(INTENTS).includes(intent.toUpperCase().trim());
}

/**
 * Gets all supported intents.
 * Useful for UI to display intent selection buttons.
 * 
 * @returns {Object} Object with intent values as keys and labels
 */
export function getSupportedIntents() {
    return { ...INTENTS };
}

export default {
    detectIntentFromButton,
    detectIntentFromText,
    isValidIntent,
    getSupportedIntents
};

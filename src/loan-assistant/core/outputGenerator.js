/**
 * Output Generator Module
 * 
 * Generates concise, action-oriented output from scored schemes.
 * No long paragraphs. No legal language. No jargon.
 * 
 * Output is optimized for:
 * - Clear, concise reading
 * - Offline display
 * - API consumption
 */

import { CONFIDENCE_LEVELS } from '../constants/eligibilityOptions.js';

/**
 * Generates the final output for eligible schemes.
 * 
 * @param {Array} scoredSchemes - Schemes with confidence scores
 * @param {Object} profile - The farmer's eligibility profile
 * @returns {Object} Structured output ready for display/API
 */
export function generateOutput(scoredSchemes, profile) {
    // Sort by confidence (HIGH first) then by score
    const sortedSchemes = [...scoredSchemes].sort((a, b) => {
        const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const confDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
        if (confDiff !== 0) return confDiff;
        return b.score - a.score;
    });

    const eligibleSchemes = sortedSchemes.map(scheme => formatSchemeOutput(scheme));

    return {
        success: true,
        profile_summary: formatProfileSummary(profile),
        total_matches: eligibleSchemes.length,
        eligible_schemes: eligibleSchemes,
        high_confidence_count: eligibleSchemes.filter(s => s.confidence === CONFIDENCE_LEVELS.HIGH).length,
        medium_confidence_count: eligibleSchemes.filter(s => s.confidence === CONFIDENCE_LEVELS.MEDIUM).length,
        low_confidence_count: eligibleSchemes.filter(s => s.confidence === CONFIDENCE_LEVELS.LOW).length,
        generated_at: Date.now(),
        offline_ready: true
    };
}

/**
 * Formats a single scheme for output.
 * Minimal, actionable information only.
 * 
 * @param {Object} scheme - Scored scheme object
 * @returns {Object} Formatted scheme output
 */
function formatSchemeOutput(scheme) {
    return {
        scheme_id: scheme.scheme_id,
        name: scheme.name,
        name_hi: scheme.name_hi,
        type: scheme.type,
        confidence: scheme.confidence,
        score: scheme.score,

        // Key benefits - concise
        highlights: generateHighlights(scheme),

        // Documents needed - actionable
        documents: scheme.documents,

        // Interest/amount info if applicable
        ...(scheme.interest_rate && { interest_rate: scheme.interest_rate }),
        ...(scheme.max_amount && { max_amount: formatAmount(scheme.max_amount) }),

        // Short description
        description: scheme.description,
        description_hi: scheme.description_hi,

        // Why this matched (for explainability)
        match_reason: generateMatchReason(scheme)
    };
}

/**
 * Generates short highlight points for a scheme.
 */
function generateHighlights(scheme) {
    const highlights = [];

    if (scheme.type === 'AGRI_LOAN') {
        if (scheme.interest_rate) {
            highlights.push(`${scheme.interest_rate} interest`);
        }
        if (scheme.max_amount) {
            highlights.push(`Up to ₹${formatAmount(scheme.max_amount)}`);
        }
    } else {
        // Government scheme
        if (scheme.max_amount) {
            highlights.push(`Benefits up to ₹${formatAmount(scheme.max_amount)}`);
        } else {
            highlights.push('Subsidy available');
        }
    }

    return highlights;
}

/**
 * Generates a short, human-readable match reason.
 */
function generateMatchReason(scheme) {
    if (scheme.scoreExplanation) {
        // Use first two explanation points
        const parts = scheme.scoreExplanation.split('.').filter(p => p.trim()).slice(0, 2);
        return parts.join('. ') + '.';
    }
    return `Matches your ${scheme.purposes?.join(', ')} needs.`;
}

/**
 * Formats profile for summary display.
 */
function formatProfileSummary(profile) {
    return {
        state: profile.state,
        landholding: profile.landholding,
        crop: profile.crop,
        purpose: profile.purpose,
        farmer_type: profile.farmer_type,
        repayment: profile.repayment
    };
}

/**
 * Formats amount for display (e.g., 300000 -> "3 Lakh")
 */
function formatAmount(amount) {
    if (amount >= 10000000) {
        return `${(amount / 10000000).toFixed(1)} Crore`.replace('.0', '');
    } else if (amount >= 100000) {
        return `${(amount / 100000).toFixed(1)} Lakh`.replace('.0', '');
    } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K`.replace('.0', '');
    }
    return amount.toString();
}

/**
 * Generates output when no schemes match.
 * 
 * @param {Object} profile - The farmer's eligibility profile
 * @param {Array} filterLog - Log of why schemes were rejected
 * @returns {Object} No-match output with explanation
 */
export function generateNoMatchOutput(profile, filterLog = []) {
    // Find most common rejection reasons
    const rejectionReasons = {};
    for (const log of filterLog) {
        if (!log.isEligible && log.failures) {
            for (const failure of log.failures) {
                const check = failure.check;
                rejectionReasons[check] = (rejectionReasons[check] || 0) + 1;
            }
        }
    }

    // Sort by frequency
    const sortedReasons = Object.entries(rejectionReasons)
        .sort((a, b) => b[1] - a[1])
        .map(([reason]) => reason);

    return {
        success: true,
        profile_summary: formatProfileSummary(profile),
        total_matches: 0,
        eligible_schemes: [],
        high_confidence_count: 0,
        medium_confidence_count: 0,
        low_confidence_count: 0,
        no_match_reason: generateNoMatchReason(sortedReasons, profile),
        suggestions: generateSuggestions(sortedReasons, profile),
        generated_at: Date.now(),
        offline_ready: true
    };
}

/**
 * Generates a human-readable reason for no matches.
 */
function generateNoMatchReason(topReasons, profile) {
    if (topReasons.length === 0) {
        return 'No schemes found for your criteria.';
    }

    const reasonMessages = {
        state: `Limited schemes available in ${profile.state}.`,
        landholding: `Few schemes for ${profile.landholding} landholding.`,
        purpose: `Limited options for ${profile.purpose}.`,
        farmer_type: `Fewer schemes for ${profile.farmer_type} farmers.`,
        repayment: `${profile.repayment} repayment option not widely available.`
    };

    return reasonMessages[topReasons[0]] || 'No matching schemes found.';
}

/**
 * Generates actionable suggestions when no schemes match.
 */
function generateSuggestions(topReasons, profile) {
    const suggestions = [];

    if (topReasons.includes('purpose')) {
        suggestions.push('Try selecting a different purpose like seeds or fertilizer.');
    }
    if (topReasons.includes('repayment')) {
        suggestions.push('Consider post-harvest repayment option.');
    }
    if (profile.farmer_type === 'tenant') {
        suggestions.push('Some schemes require land ownership documents.');
    }

    if (suggestions.length === 0) {
        suggestions.push('Contact your local agriculture office for more options.');
    }

    return suggestions;
}

export default {
    generateOutput,
    generateNoMatchOutput
};

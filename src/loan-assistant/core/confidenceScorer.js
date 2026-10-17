/**
 * Confidence Scorer Module
 * 
 * Generates explainable confidence scores for eligible schemes.
 * Simple, deterministic scoring based on match quality.
 * 
 * Scoring factors:
 * - Purpose match (primary intent)
 * - Farmer type match
 * - State match (specific vs ALL)
 * - Repayment preference match
 * 
 * Confidence buckets:
 * - HIGH: Perfect or near-perfect match
 * - MEDIUM: Good match with some generalization
 * - LOW: Basic eligibility, may not be optimal
 */

import { CONFIDENCE_LEVELS } from '../constants/eligibilityOptions.js';

// Scoring weights (total = 100 points)
const SCORE_WEIGHTS = Object.freeze({
    PURPOSE_MATCH: 30,        // Purpose is the primary matching factor
    FARMER_TYPE_MATCH: 25,    // Farmer type is critical
    STATE_SPECIFIC: 20,       // Specific state match over "ALL"
    REPAYMENT_MATCH: 15,      // Repayment preference alignment
    LANDHOLDING_FIT: 10       // How well landholding fits the scheme
});

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = Object.freeze({
    HIGH: 80,      // Score >= 80 = HIGH confidence
    MEDIUM: 50     // Score >= 50 = MEDIUM confidence
    // Below 50 = LOW confidence
});

/**
 * Calculates confidence scores for a list of eligible schemes.
 * 
 * @param {Array} eligibleSchemes - List of schemes that passed filtering
 * @param {Object} profile - The farmer's eligibility profile
 * @returns {Array} Schemes enriched with confidence scores and explanations
 */
export function scoreSchemes(eligibleSchemes, profile) {
    return eligibleSchemes.map(scheme => {
        const scoreResult = calculateSchemeScore(scheme, profile);
        return {
            ...scheme,
            confidence: scoreResult.confidenceLevel,
            score: scoreResult.totalScore,
            scoreBreakdown: scoreResult.breakdown,
            scoreExplanation: scoreResult.explanation
        };
    }).sort((a, b) => b.score - a.score); // Sort by score descending
}

/**
 * Calculates the confidence score for a single scheme.
 * 
 * @param {Object} scheme - The scheme to score
 * @param {Object} profile - The farmer's eligibility profile
 * @returns {Object} Score result with breakdown and explanation
 */
function calculateSchemeScore(scheme, profile) {
    const breakdown = {};
    const explanations = [];
    let totalScore = 0;

    // 1. Purpose match score
    const purposeScore = scorePurposeMatch(scheme, profile);
    breakdown.purpose = purposeScore;
    totalScore += purposeScore.points;
    explanations.push(purposeScore.explanation);

    // 2. Farmer type match score
    const farmerTypeScore = scoreFarmerTypeMatch(scheme, profile);
    breakdown.farmer_type = farmerTypeScore;
    totalScore += farmerTypeScore.points;
    explanations.push(farmerTypeScore.explanation);

    // 3. State specificity score
    const stateScore = scoreStateSpecificity(scheme, profile);
    breakdown.state = stateScore;
    totalScore += stateScore.points;
    explanations.push(stateScore.explanation);

    // 4. Repayment match score
    const repaymentScore = scoreRepaymentMatch(scheme, profile);
    breakdown.repayment = repaymentScore;
    totalScore += repaymentScore.points;
    explanations.push(repaymentScore.explanation);

    // 5. Landholding fit score
    const landholdingScore = scoreLandholdingFit(scheme, profile);
    breakdown.landholding = landholdingScore;
    totalScore += landholdingScore.points;
    explanations.push(landholdingScore.explanation);

    // Determine confidence level
    let confidenceLevel;
    if (totalScore >= CONFIDENCE_THRESHOLDS.HIGH) {
        confidenceLevel = CONFIDENCE_LEVELS.HIGH;
    } else if (totalScore >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        confidenceLevel = CONFIDENCE_LEVELS.MEDIUM;
    } else {
        confidenceLevel = CONFIDENCE_LEVELS.LOW;
    }

    return {
        totalScore,
        maxPossibleScore: 100,
        confidenceLevel,
        breakdown,
        explanation: explanations.filter(e => e).join(' ')
    };
}

/**
 * Scores how well the purpose matches.
 */
function scorePurposeMatch(scheme, profile) {
    const maxPoints = SCORE_WEIGHTS.PURPOSE_MATCH;

    // Purpose is already validated as matching in filter
    // But we check if it's the primary purpose of the scheme
    const purposeIndex = scheme.purposes.indexOf(profile.purpose);

    if (purposeIndex === 0) {
        // Primary purpose - full points
        return {
            points: maxPoints,
            explanation: `Primary purpose match for ${profile.purpose}.`
        };
    } else if (purposeIndex > 0 && purposeIndex < 3) {
        // Secondary purpose - good points
        return {
            points: Math.round(maxPoints * 0.8),
            explanation: `Purpose ${profile.purpose} supported.`
        };
    } else {
        // Listed but not prominent
        return {
            points: Math.round(maxPoints * 0.6),
            explanation: `Purpose ${profile.purpose} is covered but not primary.`
        };
    }
}

/**
 * Scores farmer type match.
 */
function scoreFarmerTypeMatch(scheme, profile) {
    const maxPoints = SCORE_WEIGHTS.FARMER_TYPE_MATCH;

    // If scheme only allows this farmer type, it's very targeted
    if (scheme.farmer_types.length === 1 && scheme.farmer_types[0] === profile.farmer_type) {
        return {
            points: maxPoints,
            explanation: `Exclusively for ${profile.farmer_type} farmers.`
        };
    }

    // Both farmer types allowed - still good
    if (scheme.farmer_types.includes(profile.farmer_type)) {
        return {
            points: Math.round(maxPoints * 0.9),
            explanation: `Open to ${profile.farmer_type} farmers.`
        };
    }

    // Shouldn't reach here if filtering worked correctly
    return {
        points: 0,
        explanation: `Farmer type mismatch.`
    };
}

/**
 * Scores state specificity.
 * Schemes specific to farmer's state score higher than "ALL" schemes.
 */
function scoreStateSpecificity(scheme, profile) {
    const maxPoints = SCORE_WEIGHTS.STATE_SPECIFIC;

    // Specific state match is prioritized over ALL
    if (!scheme.states.includes('ALL') && scheme.states.includes(profile.state)) {
        return {
            points: maxPoints,
            explanation: `Specifically available in ${profile.state}.`
        };
    }

    // ALL states - still good, but less targeted
    if (scheme.states.includes('ALL')) {
        return {
            points: Math.round(maxPoints * 0.7),
            explanation: 'Available nationwide.'
        };
    }

    // Shouldn't reach here if filtering worked correctly
    return {
        points: 0,
        explanation: 'State not covered.'
    };
}

/**
 * Scores repayment preference match.
 */
function scoreRepaymentMatch(scheme, profile) {
    const maxPoints = SCORE_WEIGHTS.REPAYMENT_MATCH;

    // No repayment constraint (grant/subsidy) - neutral
    if (!scheme.repayment || scheme.repayment.length === 0) {
        return {
            points: maxPoints,
            explanation: 'No repayment required (grant/subsidy).'
        };
    }

    // Exact match on preferred repayment
    if (scheme.repayment.includes(profile.repayment)) {
        if (scheme.repayment.length === 1) {
            // Only this repayment option - perfect match
            return {
                points: maxPoints,
                explanation: `${profile.repayment} repayment matches scheme.`
            };
        } else {
            // Multiple options available
            return {
                points: Math.round(maxPoints * 0.9),
                explanation: `${profile.repayment} repayment available.`
            };
        }
    }

    // Shouldn't reach here if filtering worked correctly
    return {
        points: 0,
        explanation: 'Repayment preference not supported.'
    };
}

/**
 * Scores how well landholding fits the scheme's target range.
 */
function scoreLandholdingFit(scheme, profile) {
    const maxPoints = SCORE_WEIGHTS.LANDHOLDING_FIT;

    // Wide range schemes are less targeted
    const schemeRange = scheme.max_land - scheme.min_land;

    if (schemeRange < 5) {
        // Narrow range - highly targeted
        return {
            points: maxPoints,
            explanation: `Scheme specifically targets ${profile.landholding} farmers.`
        };
    } else if (schemeRange < 50) {
        // Moderate range
        return {
            points: Math.round(maxPoints * 0.8),
            explanation: `Good fit for ${profile.landholding} landholding.`
        };
    } else {
        // Very wide range (open to all)
        return {
            points: Math.round(maxPoints * 0.6),
            explanation: `Open to all landholding sizes.`
        };
    }
}

/**
 * Gets the confidence level for a given score.
 * 
 * @param {number} score - The total score
 * @returns {string} Confidence level (HIGH, MEDIUM, LOW)
 */
export function getConfidenceLevel(score) {
    if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
        return CONFIDENCE_LEVELS.HIGH;
    } else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        return CONFIDENCE_LEVELS.MEDIUM;
    }
    return CONFIDENCE_LEVELS.LOW;
}

/**
 * Gets scoring weights for transparency.
 */
export function getScoringWeights() {
    return { ...SCORE_WEIGHTS };
}

/**
 * Gets confidence thresholds for transparency.
 */
export function getConfidenceThresholds() {
    return { ...CONFIDENCE_THRESHOLDS };
}

export default {
    scoreSchemes,
    getConfidenceLevel,
    getScoringWeights,
    getConfidenceThresholds
};

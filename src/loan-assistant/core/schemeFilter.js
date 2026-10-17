/**
 * Scheme Filter Engine
 * 
 * Core filtering logic for matching eligibility profiles to schemes.
 * 100% deterministic - strict constraint checking.
 * 
 * Filter criteria:
 * 1. State match (exact or ALL)
 * 2. Landholding range
 * 3. Farmer type match
 * 4. Purpose match
 * 5. Repayment compatibility (if applicable)
 * 
 * Returns ONLY schemes that FULLY satisfy ALL constraints.
 * No partial matches. No fuzzy logic. No hallucination.
 */

import schemesData from '../data/schemes.json';
import { getLocalSchemes } from '../storage/syncManager.js';
import { checkEligibility } from './engine.js';
import { translateFailure } from './translator.js';
import { LANDHOLDING_RANGES, LANDHOLDING } from '../constants/eligibilityOptions.js';

/**
 * Filters schemes based on eligibility profile.
 * Only returns schemes that satisfy ALL constraints.
 * 
 * @param {Object} profile - Eligibility profile
 * @param {string|null} intentType - Optional intent filter (AGRI_LOAN or GOV_SCHEME)
 * @returns {Object} Filter result with eligible schemes and metadata
 */
export function filterSchemes(profile, intentType = null) {
    const startTime = Date.now();

    // Use dynamic schemes from sync, fallback to static defaults
    const dynamicSchemes = getLocalSchemes();
    const allSchemes = dynamicSchemes.length > 0 ? dynamicSchemes : schemesData.schemes;

    const filterLog = [];
    const eligibleSchemes = [];
    const rejectedSchemes = [];

    for (const scheme of allSchemes) {
        // Use generic engine for dynamic rules, or legacy check for static ones
        let checkResult;
        if (scheme.eligibility_rules) {
            const engineResult = checkEligibility(profile, scheme);
            checkResult = {
                isEligible: engineResult.eligible,
                matches: [], // Optional: collect matches from engine if needed
                failures: engineResult.failed_rules.map(r => ({
                    check: r.field,
                    reason: translateFailure(r)
                })),
                confidence: engineResult.confidence
            };

            // Filter by intent if provided
            if (intentType && scheme.category !== intentType && scheme.type !== intentType) {
                checkResult.isEligible = false;
                checkResult.failures.push({ check: 'intent', reason: 'Category mismatch' });
            }
        } else {
            // Legacy support for static JSON with hardcoded checks
            checkResult = checkSchemeEligibility(scheme, profile, intentType);
        }

        filterLog.push({
            scheme_id: scheme.scheme_id,
            ...checkResult
        });

        if (checkResult.isEligible) {
            eligibleSchemes.push({
                ...scheme,
                matchDetails: checkResult.matches
            });
        } else {
            rejectedSchemes.push({
                scheme_id: scheme.scheme_id,
                name: scheme.name,
                failedChecks: checkResult.failures
            });
        }
    }

    return {
        profile,
        intentType,
        eligibleSchemes,
        rejectedSchemes,
        totalChecked: allSchemes.length,
        totalEligible: eligibleSchemes.length,
        filterLog,
        processingTimeMs: Date.now() - startTime,
        timestamp: Date.now()
    };
}

/**
 * Checks if a single scheme matches the eligibility profile.
 * All checks must pass for eligibility.
 * 
 * @param {Object} scheme - Scheme to check
 * @param {Object} profile - Eligibility profile
 * @param {string|null} intentType - Optional intent filter
 * @returns {Object} Check result with pass/fail details
 */
function checkSchemeEligibility(scheme, profile, intentType) {
    const matches = [];
    const failures = [];

    // 1. Intent type check (if provided)
    if (intentType) {
        const intentMatch = scheme.type === intentType;
        if (intentMatch) {
            matches.push({ check: 'intent', reason: `Type matches: ${intentType}` });
        } else {
            failures.push({ check: 'intent', reason: `Type mismatch: requires ${intentType}, scheme is ${scheme.type}` });
        }
    }

    // 2. State match check
    const stateCheck = checkStateMatch(scheme.states, profile.state);
    if (stateCheck.passed) {
        matches.push({ check: 'state', reason: stateCheck.reason });
    } else {
        failures.push({ check: 'state', reason: stateCheck.reason });
    }

    // 3. Landholding range check
    const landCheck = checkLandholdingMatch(scheme.min_land, scheme.max_land, profile.landholding);
    if (landCheck.passed) {
        matches.push({ check: 'landholding', reason: landCheck.reason });
    } else {
        failures.push({ check: 'landholding', reason: landCheck.reason });
    }

    // 4. Farmer type check
    const farmerCheck = checkFarmerTypeMatch(scheme.farmer_types, profile.farmer_type);
    if (farmerCheck.passed) {
        matches.push({ check: 'farmer_type', reason: farmerCheck.reason });
    } else {
        failures.push({ check: 'farmer_type', reason: farmerCheck.reason });
    }

    // 5. Purpose match check
    const purposeCheck = checkPurposeMatch(scheme.purposes, profile.purpose);
    if (purposeCheck.passed) {
        matches.push({ check: 'purpose', reason: purposeCheck.reason });
    } else {
        failures.push({ check: 'purpose', reason: purposeCheck.reason });
    }

    // 6. Repayment compatibility check (only for loans)
    if (scheme.repayment && scheme.repayment.length > 0) {
        const repaymentCheck = checkRepaymentMatch(scheme.repayment, profile.repayment);
        if (repaymentCheck.passed) {
            matches.push({ check: 'repayment', reason: repaymentCheck.reason });
        } else {
            failures.push({ check: 'repayment', reason: repaymentCheck.reason });
        }
    } else {
        matches.push({ check: 'repayment', reason: 'No repayment constraint (scheme/grant)' });
    }

    return {
        isEligible: failures.length === 0,
        matches,
        failures,
        totalChecks: matches.length + failures.length,
        passedChecks: matches.length
    };
}

/**
 * Checks if farmer's state matches scheme's applicable states.
 */
function checkStateMatch(schemeStates, farmerState) {
    // ALL means applicable to all states
    if (schemeStates.includes('ALL')) {
        return {
            passed: true,
            reason: 'Scheme available in all states'
        };
    }

    if (schemeStates.includes(farmerState)) {
        return {
            passed: true,
            reason: `State ${farmerState} is in eligible list`
        };
    }

    return {
        passed: false,
        reason: `State ${farmerState} not in eligible list: [${schemeStates.join(', ')}]`
    };
}

/**
 * Checks if farmer's landholding is within scheme's range.
 */
function checkLandholdingMatch(minLand, maxLand, landholdingCategory) {
    const range = LANDHOLDING_RANGES[landholdingCategory];

    if (!range) {
        return {
            passed: false,
            reason: `Unknown landholding category: ${landholdingCategory}`
        };
    }

    // Special case: landless farmers
    if (landholdingCategory === LANDHOLDING.LANDLESS) {
        if (minLand === 0) {
            return {
                passed: true,
                reason: 'Scheme accepts landless farmers (min_land = 0)'
            };
        }
        return {
            passed: false,
            reason: `Scheme requires minimum ${minLand} acres, farmer is landless`
        };
    }

    // Check if farmer's landholding range overlaps with scheme's range
    // Farmer is eligible if their range has any overlap with scheme's range
    const farmerMin = range.min;
    const farmerMax = range.max;

    const hasOverlap = farmerMax >= minLand && farmerMin <= maxLand;

    if (hasOverlap) {
        return {
            passed: true,
            reason: `Landholding ${landholdingCategory} (${farmerMin}-${farmerMax} acres) within scheme range (${minLand}-${maxLand} acres)`
        };
    }

    return {
        passed: false,
        reason: `Landholding ${landholdingCategory} (${farmerMin}-${farmerMax} acres) outside scheme range (${minLand}-${maxLand} acres)`
    };
}

/**
 * Checks if farmer type is allowed by scheme.
 */
function checkFarmerTypeMatch(schemeFarmerTypes, farmerType) {
    if (schemeFarmerTypes.includes(farmerType)) {
        return {
            passed: true,
            reason: `Farmer type '${farmerType}' is allowed`
        };
    }

    return {
        passed: false,
        reason: `Farmer type '${farmerType}' not allowed. Requires: [${schemeFarmerTypes.join(', ')}]`
    };
}

/**
 * Checks if farmer's purpose matches scheme's allowed purposes.
 */
function checkPurposeMatch(schemePurposes, farmerPurpose) {
    if (schemePurposes.includes(farmerPurpose)) {
        return {
            passed: true,
            reason: `Purpose '${farmerPurpose}' is covered by scheme`
        };
    }

    return {
        passed: false,
        reason: `Purpose '${farmerPurpose}' not covered. Available: [${schemePurposes.join(', ')}]`
    };
}

/**
 * Checks if farmer's repayment preference matches scheme options.
 */
function checkRepaymentMatch(schemeRepaymentOptions, farmerRepayment) {
    if (schemeRepaymentOptions.includes(farmerRepayment)) {
        return {
            passed: true,
            reason: `Repayment preference '${farmerRepayment}' is supported`
        };
    }

    return {
        passed: false,
        reason: `Repayment '${farmerRepayment}' not supported. Options: [${schemeRepaymentOptions.join(', ')}]`
    };
}

/**
 * Gets all schemes from the local store (for debugging/admin).
 */
export function getAllSchemes() {
    return schemesData.schemes;
}

/**
 * Gets a specific scheme by ID.
 */
export function getSchemeById(schemeId) {
    return schemesData.schemes.find(s => s.scheme_id === schemeId) || null;
}

/**
 * Gets scheme store metadata.
 */
export function getSchemeStoreInfo() {
    return {
        version: schemesData.version,
        lastUpdated: schemesData.last_updated,
        totalSchemes: schemesData.schemes.length
    };
}

export default {
    filterSchemes,
    getAllSchemes,
    getSchemeById,
    getSchemeStoreInfo
};

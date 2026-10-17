/**
 * Deterministic Eligibility Engine
 * Pure JS engine for evaluating scheme rules against farmer profiles.
 */

const OPERATORS = {
    EQUALS: (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
    IN: (a, b) => Array.isArray(b) && b.some(val => String(val).toLowerCase() === String(a).toLowerCase()),
    LTE: (a, b) => Number(a) <= Number(b),
    GTE: (a, b) => Number(a) >= Number(b),
    CONTAINS: (a, b) => Array.isArray(a) && a.some(val => String(val).toLowerCase() === String(b).toLowerCase())
};

/**
 * Validates a single rule.
 */
function evaluateRule(rule, profile) {
    const { field, operator, value } = rule;
    const profileValue = profile[field];

    if (profileValue === undefined || profileValue === null) {
        return false;
    }

    const opFunc = OPERATORS[operator];
    if (!opFunc) {
        console.error(`Unknown operator: ${operator}`);
        return false;
    }

    return opFunc(profileValue, value);
}

/**
 * Checks eligibility for a scheme based on generic rules.
 */
export function checkEligibility(profile, scheme) {
    const failedRules = [];
    const passedRules = [];

    // Special case: State match (if not in generic rules)
    if (scheme.states && !scheme.states.includes('ALL') && !scheme.states.includes(profile.state)) {
        failedRules.push({ field: 'state', reason: `Not available in ${profile.state}` });
    }

    // Evaluate all rules in the eligibility_rules array
    if (scheme.eligibility_rules && Array.isArray(scheme.eligibility_rules)) {
        for (const rule of scheme.eligibility_rules) {
            const passed = evaluateRule(rule, profile);
            if (!passed) {
                failedRules.push(rule);
            } else {
                passedRules.push(rule);
            }
        }
    }

    const isEligible = failedRules.length === 0;

    // Confidence calculation (simplified match quality)
    let confidence = 'LOW';
    if (isEligible) {
        const totalRules = (scheme.eligibility_rules?.length || 0);
        if (totalRules === 0) confidence = 'MEDIUM';
        else confidence = 'HIGH'; // For now, if all pass, it's HIGH
    }

    return {
        eligible: isEligible,
        confidence,
        failed_rules: failedRules,
        passed_count: passedRules.length,
        total_rules: scheme.eligibility_rules?.length || 0
    };
}

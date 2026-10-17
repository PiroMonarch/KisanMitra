/**
 * Explainability Mapping
 * Converts technical rule failures into farmer-friendly explanations.
 */

const EXPLANATIONS = {
    landholding: {
        GTE: "Zameen ki seema se kam kheti", // Less land than required
        LTE: "Zameen ki seema se zyada kheti"  // More land than allowed
    },
    farmer_type: {
        EQUALS: "Is yojana ke liye aapka kisaan prakar sahi nahi hai",
        IN: "Aapka kisaan prakar is yojana mein shaamil nahi hai"
    },
    state: {
        IN: "Yeh yojana aapke rajya mein uplabdth nahi hai"
    },
    purpose: {
        IN: "Yeh yojana aapke maqsad (purpose) ke liye nahi hai"
    }
};

const DEFAULT_EXPLANATIONS = {
    GTE: "Zaroorat se kam",
    LTE: "Limit se zyada",
    EQUALS: "Sahi nahi hai",
    IN: "Is list mein nahi hai"
};

/**
 * Translates a failed rule into a simple sentence.
 */
export function translateFailure(rule) {
    const { field, operator } = rule;

    // Check for specific mapping
    if (EXPLANATIONS[field] && EXPLANATIONS[field][operator]) {
        return EXPLANATIONS[field][operator];
    }

    // Fallback to generic mapping
    const fieldName = field.replace('_', ' ');
    const opText = DEFAULT_EXPLANATIONS[operator] || "Aapke liye nahi hai";

    return `${fieldName} ${opText}`;
}

/**
 * Generates summary for multiple failures.
 */
export function getFailureSummary(failedRules) {
    if (!failedRules || failedRules.length === 0) return null;
    return failedRules.map(rule => translateFailure(rule)).join('. ');
}

/**
 * Output Formatter
 * 
 * Formats RAG output into structured, action-oriented responses.
 * Combines results from multiple tasks into a cohesive explanation.
 * 
 * HARDENING UPDATE: Implements Fixes 3, 4, 6, 7.
 */

import { SCHEME_KNOWLEDGE } from '../data/schemeKnowledge.js';

/**
 * Safe utility to handle undefined/null.
 */
function safe(val, fallback = "") {
    return val === undefined || val === null ? fallback : val;
}

/**
 * Formats a complete scheme explanation combining all tasks.
 */
export function formatSchemeExplanation(schemeId, schemeMeta, taskResults, contextParams = {}) {
    // 1. Get raw KB for direct lookup (Stability)
    const kb = SCHEME_KNOWLEDGE[schemeId];

    const {
        explanation,
        eligibility,
        documents,
        guidance,
        benefits
    } = taskResults;

    const formattedOutput = {
        scheme_id: schemeId,
        scheme_name: kb?.name?.en || schemeMeta.name || schemeId,
        scheme_name_hi: kb?.name?.hi || schemeMeta.name_hi,

        // Simple explanation
        simple_explanation: formatExplanation(explanation, kb),

        // Why eligible (Fix 7 Type Safety)
        eligibility_reason: formatEligibility(eligibility, kb),

        // Documents needed (Fix 3 Routing)
        documents_required: formatDocuments(documents, kb, contextParams.farmer_type),

        // How to apply
        application_steps: formatGuidance(guidance, kb),

        // Benefits summary
        benefits_summary: formatBenefits(benefits, kb),

        // Helplines
        contacts: { helpline: kb?.helpline || null }
    };

    // Metadata & Confidence (Fix 4)
    formattedOutput.overall_confidence = calculateOverallConfidence(formattedOutput, taskResults);
    formattedOutput.requires_disclaimer = formattedOutput.overall_confidence !== 'HIGH';
    formattedOutput.generated_at = Date.now();

    return formattedOutput;
}

function formatExplanation(result, kb) {
    if (kb?.description?.simple) {
        return kb.description.simple;
    }
    return {
        en: 'Information not available',
        hi: 'जानकारी उपलब्ध नहीं है'
    };
}

function formatEligibility(result, kb) {
    // Fix 7: Safe Checks
    const why = kb.eligibility?.why || { en: "", hi: "" };
    const criteria = kb.eligibility?.criteria;

    return {
        why: why,
        criteria: Array.isArray(criteria) ? criteria : []
    };
}

function formatDocuments(result, kb, farmerType) {
    // Fix 3: Document Checklist Routing
    if (!kb?.documents) return { list: [], total: 0 };

    // Resolve docs based on farmer type
    const profileType = (farmerType || 'default').toLowerCase();

    // Check specific list FIRST, then default
    let docs = kb.documents[profileType];

    // Fallback if specific list is empty or undefined
    if (!docs || docs.length === 0) {
        docs = kb.documents.default;
    }

    // Final safe check
    const safeDocs = Array.isArray(docs) ? docs : [];

    // Map to simple strings for UI if they are objects {name, required}
    const list = safeDocs.map(d => d.name || d);

    return {
        list: list,
        total: list.length
    };
}

function formatGuidance(result, kb) {
    // Return the steps array directly from KB (it's normalized in KB now)
    const steps = kb?.application_steps?.steps || [];
    return {
        steps: steps,
        where: 'Online or Bank' // Generic
    };
}

function formatBenefits(result, kb) {
    const ben = kb?.benefits || {};
    return {
        primary: ben.primary || { en: "", hi: "" },
        amounts: ben.amounts ? [ben.amounts] : [], // Wrap in array to match UI expectation
        interest: ben.interest || { en: "N/A", hi: "N/A" }
    };
}

/**
 * Fix 4: Robust Confidence Scoring
 * Critical vs Minor fields.
 */
function calculateOverallConfidence(output, taskResults) {
    // Check Critical Fields
    const hasExplanation = output.simple_explanation?.en && output.simple_explanation?.en.length > 10;
    const hasEligibility = output.eligibility_reason?.why?.en && output.eligibility_reason?.why?.en.length > 5;

    if (!hasExplanation || !hasEligibility) {
        return 'NONE'; // Critical Missing
    }

    // Check Minor Fields
    const hasBenefits = output.benefits_summary?.primary?.en;
    const hasSteps = output.application_steps?.steps?.length > 0;
    const hasDocs = output.documents_required?.total > 0;

    let missingCount = 0;
    if (!hasBenefits) missingCount++;
    if (!hasSteps) missingCount++;
    if (!hasDocs) missingCount++;

    if (missingCount >= 2) {
        return 'MEDIUM';
    }

    return 'HIGH';
}

export function formatForCard(formattedExplanation) {
    return {
        title: safe(formattedExplanation.scheme_name),
        titleHi: safe(formattedExplanation.scheme_name_hi),
        summary: safe(formattedExplanation.simple_explanation?.en?.substring(0, 150) + '...'),
        keyBenefit: safe((formattedExplanation.benefits_summary?.primary?.en), 'Details unavailable'),
        docCount: formattedExplanation.documents_required?.total || 0,
        confidence: safe(formattedExplanation.overall_confidence, 'LOW'),
        helpline: safe(formattedExplanation.contacts?.helpline)
    };
}

// Fix 5 Helper
function normalizeText(text) {
    if (!text) return "";
    return text
        .replace(/Benefits of\s+/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

export default {
    formatSchemeExplanation,
    formatForCard
};

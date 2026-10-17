/**
 * Explicit Knowledge Guardrail
 * 
 * HARD STOP before returning any explanation.
 * If knowledge is insufficient, refuse to proceed.
 * 
 * CORE PRINCIPLE:
 * Even if the system "thinks" it knows — it MUST refuse without documents.
 * No implicit behavior. No guessing.
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURABLE THRESHOLDS
// ═══════════════════════════════════════════════════════════════

export const GUARDRAIL_CONFIG = Object.freeze({
    // Minimum content length to proceed
    MIN_CONTEXT_CHARS: 100,

    // Minimum number of chunks required
    MIN_CHUNKS_REQUIRED: 1,

    // Minimum confidence score (0-100)
    MIN_CONFIDENCE_SCORE: 50,

    // Minimum chunk relevance
    MIN_CHUNK_RELEVANCE: 0.3,

    // Required doc types for certain tasks
    REQUIRED_DOC_TYPES: {
        'eligibility_reasoning': ['eligibility'],
        'document_checklist': ['documents'],
        'application_guidance': ['process'],
        'benefit_summary': ['benefits'],
        'simple_explanation': []  // Any doc type acceptable
    }
});

// ═══════════════════════════════════════════════════════════════
// FALLBACK RESPONSES
// ═══════════════════════════════════════════════════════════════

const FALLBACK_RESPONSES = Object.freeze({
    // Insufficient context
    INSUFFICIENT_CONTEXT: {
        en: 'We do not have sufficient verified information about this scheme in our records. Please contact your local bank or agriculture office for accurate details.',
        hi: 'इस योजना के बारे में हमारे रिकॉर्ड में पर्याप्त सत्यापित जानकारी नहीं है। कृपया सटीक जानकारी के लिए अपने स्थानीय बैंक या कृषि कार्यालय से संपर्क करें।'
    },

    // Low confidence
    LOW_CONFIDENCE: {
        en: 'The available information may not be complete or current. Please verify with official sources before taking any action.',
        hi: 'उपलब्ध जानकारी पूर्ण या वर्तमान नहीं हो सकती है। कृपया कोई भी कार्रवाई करने से पहले आधिकारिक स्रोतों से सत्यापित करें।'
    },

    // Missing required doc type
    MISSING_DOC_TYPE: {
        en: 'Specific documentation for this query is not available. Please consult local authorities.',
        hi: 'इस प्रश्न के लिए विशिष्ट दस्तावेज़ीकरण उपलब्ध नहीं है। कृपया स्थानीय अधिकारियों से परामर्श करें।'
    },

    // Source conflict detected
    SOURCE_CONFLICT: {
        en: 'We found conflicting information from different sources. Please verify the exact details with your local office.',
        hi: 'हमें विभिन्न स्रोतों से परस्पर विरोधी जानकारी मिली। कृपया अपने स्थानीय कार्यालय से सटीक विवरण सत्यापित करें।'
    },

    // Scheme not in knowledge base
    UNKNOWN_SCHEME: {
        en: 'This scheme is not in our verified knowledge base. Please contact official channels for information.',
        hi: 'यह योजना हमारे सत्यापित ज्ञान आधार में नहीं है। कृपया जानकारी के लिए आधिकारिक चैनलों से संपर्क करें।'
    }
});

// ═══════════════════════════════════════════════════════════════
// GUARDRAIL CHECKS
// ═══════════════════════════════════════════════════════════════

/**
 * Main guardrail function.
 * Returns either PROCEED or FALLBACK decision.
 * 
 * @param {Object} retrievalResult - Result from retrieval
 * @param {string} taskType - Type of RAG task
 * @param {Object} options - Additional options
 * @returns {Object} Guardrail decision
 */
export function enforceKnowledgeGuardrail(retrievalResult, taskType, options = {}) {
    const config = { ...GUARDRAIL_CONFIG, ...options.thresholds };
    const checks = [];
    let shouldProceed = true;
    let fallbackReason = null;

    // ─────────────────────────────────────────────────────────
    // CHECK 1: Context exists
    // ─────────────────────────────────────────────────────────
    const contextCheck = checkContextExists(retrievalResult);
    checks.push(contextCheck);

    if (!contextCheck.passed) {
        shouldProceed = false;
        fallbackReason = 'INSUFFICIENT_CONTEXT';
    }

    // ─────────────────────────────────────────────────────────
    // CHECK 2: Minimum content length
    // ─────────────────────────────────────────────────────────
    if (shouldProceed) {
        const lengthCheck = checkMinimumContentLength(retrievalResult, config.MIN_CONTEXT_CHARS);
        checks.push(lengthCheck);

        if (!lengthCheck.passed) {
            shouldProceed = false;
            fallbackReason = 'INSUFFICIENT_CONTEXT';
        }
    }

    // ─────────────────────────────────────────────────────────
    // CHECK 3: Minimum chunks
    // ─────────────────────────────────────────────────────────
    if (shouldProceed) {
        const chunkCheck = checkMinimumChunks(retrievalResult, config.MIN_CHUNKS_REQUIRED);
        checks.push(chunkCheck);

        if (!chunkCheck.passed) {
            shouldProceed = false;
            fallbackReason = 'INSUFFICIENT_CONTEXT';
        }
    }

    // ─────────────────────────────────────────────────────────
    // CHECK 4: Confidence threshold
    // ─────────────────────────────────────────────────────────
    if (shouldProceed) {
        const confidenceCheck = checkConfidenceThreshold(retrievalResult, config.MIN_CONFIDENCE_SCORE);
        checks.push(confidenceCheck);

        if (!confidenceCheck.passed) {
            shouldProceed = false;
            fallbackReason = 'LOW_CONFIDENCE';
        }
    }

    // ─────────────────────────────────────────────────────────
    // CHECK 5: Required doc types for task
    // ─────────────────────────────────────────────────────────
    if (shouldProceed) {
        const docTypeCheck = checkRequiredDocTypes(retrievalResult, taskType, config.REQUIRED_DOC_TYPES);
        checks.push(docTypeCheck);

        if (!docTypeCheck.passed) {
            shouldProceed = false;
            fallbackReason = 'MISSING_DOC_TYPE';
        }
    }

    // ─────────────────────────────────────────────────────────
    // CHECK 6: Source agreement (if source-aware)
    // ─────────────────────────────────────────────────────────
    if (shouldProceed && retrievalResult._source_analysis) {
        const sourceCheck = checkSourceAgreement(retrievalResult);
        checks.push(sourceCheck);

        // Conflicts don't block, but trigger warning
        if (!sourceCheck.passed) {
            // Don't block, but add warning
            checks[checks.length - 1].warning = true;
        }
    }

    // ─────────────────────────────────────────────────────────
    // BUILD RESULT
    // ─────────────────────────────────────────────────────────
    if (shouldProceed) {
        return createProceedResult(checks, retrievalResult);
    } else {
        return createFallbackResult(fallbackReason, checks, retrievalResult);
    }
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL CHECKS
// ═══════════════════════════════════════════════════════════════

function checkContextExists(result) {
    const passed = !!(result && result.success && result.chunks && result.chunks.length > 0);
    return {
        name: 'CONTEXT_EXISTS',
        passed,
        details: passed ? 'Context retrieved successfully' : 'No context available'
    };
}

function checkMinimumContentLength(result, minChars) {
    const totalLength = result.chunks?.reduce((sum, c) => sum + (c.content?.length || 0), 0) || 0;
    const passed = totalLength >= minChars;
    return {
        name: 'MIN_CONTENT_LENGTH',
        passed,
        threshold: minChars,
        actual: totalLength,
        details: passed ? `Content length ${totalLength} >= ${minChars}` : `Content too short: ${totalLength} < ${minChars}`
    };
}

function checkMinimumChunks(result, minChunks) {
    const chunkCount = result.chunks?.length || 0;
    const passed = chunkCount >= minChunks;
    return {
        name: 'MIN_CHUNKS',
        passed,
        threshold: minChunks,
        actual: chunkCount,
        details: passed ? `Chunk count ${chunkCount} >= ${minChunks}` : `Not enough chunks: ${chunkCount} < ${minChunks}`
    };
}

function checkConfidenceThreshold(result, minScore) {
    const score = result.confidence_score || 0;
    const level = result.confidence || 'NONE';
    const passed = score >= minScore || level === 'HIGH';
    return {
        name: 'CONFIDENCE_THRESHOLD',
        passed,
        threshold: minScore,
        actual: score,
        level,
        details: passed ? `Confidence ${score}% >= ${minScore}%` : `Confidence too low: ${score}% < ${minScore}%`
    };
}

function checkRequiredDocTypes(result, taskType, requirements) {
    const requiredTypes = requirements[taskType] || [];
    if (requiredTypes.length === 0) {
        return {
            name: 'REQUIRED_DOC_TYPES',
            passed: true,
            details: 'No specific doc types required for this task'
        };
    }

    const foundTypes = result.metadata?.doc_types_found || result.chunks?.map(c => c.doc_type) || [];
    const missingTypes = requiredTypes.filter(t => !foundTypes.includes(t));
    const passed = missingTypes.length === 0;

    return {
        name: 'REQUIRED_DOC_TYPES',
        passed,
        required: requiredTypes,
        found: foundTypes,
        missing: missingTypes,
        details: passed ? 'All required doc types present' : `Missing doc types: ${missingTypes.join(', ')}`
    };
}

function checkSourceAgreement(result) {
    const agreement = result._source_analysis?.sourceAgreement ?? true;
    const conflicts = result._source_analysis?.conflicts?.length || 0;
    return {
        name: 'SOURCE_AGREEMENT',
        passed: agreement,
        conflicts,
        details: agreement ? 'All sources agree' : `${conflicts} source conflict(s) detected`
    };
}

// ═══════════════════════════════════════════════════════════════
// RESULT BUILDERS
// ═══════════════════════════════════════════════════────────────

function createProceedResult(checks, retrievalResult) {
    const hasWarnings = checks.some(c => c.warning);
    return {
        decision: 'PROCEED',
        proceed: true,
        checks,
        hasWarnings,
        warnings: checks.filter(c => c.warning).map(c => c.details),
        context: retrievalResult
    };
}

function createFallbackResult(reason, checks, retrievalResult) {
    const fallbackMessage = FALLBACK_RESPONSES[reason] || FALLBACK_RESPONSES.INSUFFICIENT_CONTEXT;

    return {
        decision: 'FALLBACK',
        proceed: false,
        fallback_reason: reason,
        checks,
        fallback_response: {
            success: false,
            scheme_id: retrievalResult?.scheme_id,
            confidence: 'NONE',
            requires_disclaimer: true,
            simple_explanation: fallbackMessage,
            eligibility_reason: {
                reason: fallbackMessage.en,
                criteria: []
            },
            documents_required: {
                list: [
                    { name: 'Contact local office for document list', required: true }
                ],
                note: fallbackMessage.en
            },
            application_steps: {
                steps: ['Contact your local bank or agriculture office for guidance'],
                where: 'Local authorities'
            },
            _guardrail_triggered: true,
            _fallback_reason: reason
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Quick check - returns boolean only.
 */
export function shouldProceedWithRAG(retrievalResult, taskType, options = {}) {
    const result = enforceKnowledgeGuardrail(retrievalResult, taskType, options);
    return result.proceed;
}

/**
 * Gets fallback response for a scheme.
 */
export function getFallbackResponse(schemeId, reason = 'INSUFFICIENT_CONTEXT') {
    const fallbackMessage = FALLBACK_RESPONSES[reason] || FALLBACK_RESPONSES.INSUFFICIENT_CONTEXT;
    return {
        success: false,
        scheme_id: schemeId,
        confidence: 'NONE',
        simple_explanation: fallbackMessage,
        _guardrail_triggered: true
    };
}

/**
 * Updates thresholds dynamically.
 */
export function updateGuardrailThresholds(newThresholds) {
    // Only allow updating specific fields
    const allowedFields = ['MIN_CONTEXT_CHARS', 'MIN_CHUNKS_REQUIRED', 'MIN_CONFIDENCE_SCORE'];
    const updates = {};

    for (const field of allowedFields) {
        if (newThresholds[field] !== undefined) {
            updates[field] = newThresholds[field];
        }
    }

    return { ...GUARDRAIL_CONFIG, ...updates };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    enforceKnowledgeGuardrail,
    shouldProceedWithRAG,
    getFallbackResponse,
    updateGuardrailThresholds,
    GUARDRAIL_CONFIG,
    FALLBACK_RESPONSES
};

/**
 * EXACT CONDITION:
 * 
 * if (!retrievedContext || 
 *     retrievedContext.chunks.length < MIN_CHUNKS_REQUIRED ||
 *     totalContentLength < MIN_CONTEXT_CHARS ||
 *     confidenceScore < MIN_CONFIDENCE_SCORE) {
 *   return fallbackResponse;
 * }
 * 
 * FALLBACK BEHAVIOR:
 * 1. Lower confidence to NONE
 * 2. Add mandatory disclaimer
 * 3. Return safe, partial response
 * 4. Direct user to local authorities
 * 5. NEVER provide partial explanations that could mislead
 * 
 * Even if the system "thinks" it knows — it REFUSES without documents.
 */

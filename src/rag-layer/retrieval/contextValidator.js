/**
 * Context Validator
 * 
 * Validates retrieved context before sending to LLM.
 * Implements FAIL-SAFE logic - if context is insufficient, don't hallucinate.
 */

import { RAG_CONFIG } from '../config/ragConfig.js';

const { confidence: THRESHOLDS, failureMessages } = RAG_CONFIG;

/**
 * Validates retrieved context for a query.
 * 
 * @param {Object} retrievalResult - Result from retriever
 * @param {string} taskType - Type of RAG task
 * @returns {Object} Validation result with proceed/fail decision
 */
export function validateContext(retrievalResult, taskType) {
    const issues = [];
    const warnings = [];

    // Check if retrieval succeeded
    if (!retrievalResult.success) {
        return createFailResult(
            'RETRIEVAL_FAILED',
            retrievalResult.error || 'Context retrieval failed',
            failureMessages.schemeNotFound
        );
    }

    // Check if we have any chunks
    if (!retrievalResult.chunks || retrievalResult.chunks.length === 0) {
        return createFailResult(
            'NO_CONTEXT',
            'No relevant context found',
            failureMessages.noContext
        );
    }

    // Check minimum chunks requirement
    if (retrievalResult.chunks.length < THRESHOLDS.minimumChunks) {
        warnings.push(`Only ${retrievalResult.chunks.length} chunks found (minimum: ${THRESHOLDS.minimumChunks})`);
    }

    // Check confidence level
    if (retrievalResult.confidence === 'LOW' || retrievalResult.confidence_score < THRESHOLDS.low * 100) {
        return createFailResult(
            'LOW_CONFIDENCE',
            `Confidence too low: ${retrievalResult.confidence_score}%`,
            failureMessages.lowConfidence
        );
    }

    // Check if required doc types are present for task
    const requiredDocTypes = getRequiredDocTypes(taskType);
    const foundDocTypes = retrievalResult.metadata?.doc_types_found || [];

    const missingRequired = requiredDocTypes.filter(dt => !foundDocTypes.includes(dt));
    if (missingRequired.length > 0) {
        warnings.push(`Missing doc types for task: ${missingRequired.join(', ')}`);
    }

    // Check total content length
    const totalLength = retrievalResult.metadata?.total_length || 0;
    if (totalLength < 50) {
        return createFailResult(
            'INSUFFICIENT_CONTENT',
            'Retrieved content is too short to be useful',
            failureMessages.noContext
        );
    }

    // Medium confidence - proceed with warning
    if (retrievalResult.confidence === 'MEDIUM') {
        warnings.push('Context confidence is MEDIUM - results should be verified');
    }

    // Validation passed
    return {
        valid: true,
        proceed: true,
        confidence: retrievalResult.confidence,
        confidence_score: retrievalResult.confidence_score,
        warnings: warnings.length > 0 ? warnings : null,
        context: retrievalResult,
        require_disclaimer: retrievalResult.confidence !== 'HIGH'
    };
}

/**
 * Gets required doc types for a task.
 */
function getRequiredDocTypes(taskType) {
    const requirements = {
        'simple_explanation': ['eligibility', 'benefits'],
        'eligibility_reasoning': ['eligibility'],
        'document_checklist': ['documents'],
        'application_guidance': ['process'],
        'benefit_summary': ['benefits']
    };

    return requirements[taskType] || ['eligibility'];
}

/**
 * Creates a failure result with safe fallback message.
 */
function createFailResult(code, reason, fallbackMessage) {
    return {
        valid: false,
        proceed: false,
        failure_code: code,
        failure_reason: reason,
        fallback_message: fallbackMessage,
        safe_response: {
            en: fallbackMessage.en,
            hi: fallbackMessage.hi
        }
    };
}

/**
 * Validates content for specific issues.
 */
export function validateContentQuality(chunks) {
    const issues = [];

    for (const chunk of chunks) {
        // Check for placeholder content
        if (chunk.content.includes('[TO BE UPDATED]') ||
            chunk.content.includes('lorem ipsum') ||
            chunk.content.includes('[DRAFT]')) {
            issues.push({
                chunk_id: chunk.id,
                issue: 'Contains placeholder content'
            });
        }

        // Check for outdated markers
        if (chunk.content.includes('2020') || chunk.content.includes('2019')) {
            issues.push({
                chunk_id: chunk.id,
                issue: 'May contain outdated information',
                severity: 'warning'
            });
        }
    }

    return {
        hasIssues: issues.length > 0,
        issues
    };
}

/**
 * Checks if context is sufficient to answer a specific question.
 */
export function isContextSufficient(context, questionType) {
    // Map question types to required keywords
    const keywordRequirements = {
        'amount': ['₹', 'lakh', 'crore', 'amount', 'limit'],
        'interest': ['%', 'interest', 'rate'],
        'documents': ['document', 'required', 'proof', 'aadhaar'],
        'process': ['step', 'apply', 'process', 'how to'],
        'eligibility': ['eligible', 'criteria', 'who can', 'farmer']
    };

    const requiredKeywords = keywordRequirements[questionType] || [];

    if (requiredKeywords.length === 0) {
        return { sufficient: true };
    }

    const allContent = context.chunks.map(c => c.content.toLowerCase()).join(' ');
    const foundKeywords = requiredKeywords.filter(kw => allContent.includes(kw.toLowerCase()));

    const ratio = foundKeywords.length / requiredKeywords.length;

    return {
        sufficient: ratio >= 0.5,
        found_keywords: foundKeywords,
        missing_keywords: requiredKeywords.filter(kw => !foundKeywords.includes(kw)),
        coverage_ratio: ratio
    };
}

export default {
    validateContext,
    validateContentQuality,
    isContextSufficient
};

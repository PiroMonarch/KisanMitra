/**
 * Query Builder
 * 
 * Builds controlled, scoped queries for RAG retrieval.
 * CRITICAL: Queries are always filtered by scheme_id.
 * No global "search all schemes" allowed.
 */

import { RAG_CONFIG, RAG_TASKS } from '../config/ragConfig.js';

/**
 * Builds a retrieval query for a specific scheme and task.
 * 
 * @param {string} schemeId - Scheme to query
 * @param {string} taskType - Type of RAG task
 * @param {Object} context - Additional context (farmer profile)
 * @returns {Object} Structured query object
 */
export function buildQuery(schemeId, taskType, context = {}) {
    if (!schemeId) {
        throw new Error('scheme_id is required for query building');
    }

    if (!Object.values(RAG_TASKS).includes(taskType)) {
        throw new Error(`Invalid task type: ${taskType}`);
    }

    const baseQuery = {
        scheme_id: schemeId.toUpperCase(),
        task: taskType,
        filters: {
            scheme_id: schemeId.toUpperCase()
        },
        context
    };

    // Add task-specific query parameters
    switch (taskType) {
        case RAG_TASKS.SIMPLE_EXPLANATION:
            return buildExplanationQuery(baseQuery, context);

        case RAG_TASKS.ELIGIBILITY_REASONING:
            return buildEligibilityQuery(baseQuery, context);

        case RAG_TASKS.DOCUMENT_CHECKLIST:
            return buildDocumentQuery(baseQuery, context);

        case RAG_TASKS.APPLICATION_GUIDANCE:
            return buildApplicationQuery(baseQuery, context);

        case RAG_TASKS.BENEFIT_SUMMARY:
            return buildBenefitQuery(baseQuery, context);

        default:
            return baseQuery;
    }
}

/**
 * Builds query for simple scheme explanation.
 */
function buildExplanationQuery(baseQuery, context) {
    const { farmer_type, landholding, language } = context;

    return {
        ...baseQuery,
        doc_types: ['eligibility', 'benefits', 'faq'],
        semantic_query: `What is this scheme and its main benefits for ${farmer_type || ''} farmers with ${landholding || ''} land`,
        priority_sections: ['benefits', 'eligibility'],
        output_language: language || 'en'
    };
}

/**
 * Builds query for eligibility reasoning.
 */
function buildEligibilityQuery(baseQuery, context) {
    const { state, landholding, farmer_type, purpose } = context;

    return {
        ...baseQuery,
        doc_types: ['eligibility', 'faq'],
        semantic_query: `Eligibility criteria for ${farmer_type} farmers in ${state} with ${landholding} land for ${purpose}`,
        priority_sections: ['eligibility'],
        farmer_context: {
            state,
            landholding,
            farmer_type,
            purpose
        }
    };
}

/**
 * Builds query for document checklist.
 */
function buildDocumentQuery(baseQuery, context) {
    const { farmer_type, landholding } = context;

    return {
        ...baseQuery,
        doc_types: ['documents', 'process'],
        semantic_query: `Documents required for ${farmer_type} farmer with ${landholding} land`,
        priority_sections: ['documents'],
        extract_lists: true  // Flag to extract bulleted lists
    };
}

/**
 * Builds query for application guidance.
 */
function buildApplicationQuery(baseQuery, context) {
    const { state } = context;

    return {
        ...baseQuery,
        doc_types: ['process', 'faq', 'contact'],
        semantic_query: `How to apply step by step process helpline contact`,
        priority_sections: ['process'],
        include_contacts: true,
        state_filter: state
    };
}

/**
 * Builds query for benefit summary.
 */
function buildBenefitQuery(baseQuery, context) {
    const { purpose, landholding } = context;

    return {
        ...baseQuery,
        doc_types: ['benefits', 'faq'],
        semantic_query: `Benefits amount interest rate subsidy for ${purpose} ${landholding} farmers`,
        priority_sections: ['benefits'],
        extract_amounts: true  // Flag to extract monetary figures
    };
}

/**
 * Builds a batch query for multiple schemes.
 * Used when Phase 1 returns multiple eligible schemes.
 * 
 * @param {Array} schemeIds - List of scheme IDs
 * @param {string} taskType - Type of RAG task
 * @param {Object} context - Farmer context
 * @returns {Array} Array of query objects
 */
export function buildBatchQuery(schemeIds, taskType, context = {}) {
    return schemeIds.map(schemeId => buildQuery(schemeId, taskType, context));
}

/**
 * Builds a comparative query (for showing differences between schemes).
 */
export function buildComparisonQuery(schemeIds, context = {}) {
    return {
        type: 'comparison',
        schemes: schemeIds.map(id => id.toUpperCase()),
        doc_types: ['benefits', 'eligibility'],
        semantic_query: 'Compare interest rate amount eligibility requirements',
        context,
        compare_fields: ['interest_rate', 'max_amount', 'documents', 'process']
    };
}

/**
 * Validates a query object before execution.
 */
export function validateQuery(query) {
    const errors = [];

    if (!query.scheme_id) {
        errors.push('scheme_id is required');
    }

    if (!query.task && !query.type) {
        errors.push('task type is required');
    }

    if (!query.doc_types || query.doc_types.length === 0) {
        errors.push('At least one doc_type filter is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export default {
    buildQuery,
    buildBatchQuery,
    buildComparisonQuery,
    validateQuery
};

/**
 * Context Retriever
 * 
 * Retrieves relevant context from the knowledge base.
 * Uses direct lookup for seeded knowledge (offline-first).
 */

import { RAG_CONFIG, RAG_TASKS } from '../config/ragConfig.js';
import { SCHEME_KNOWLEDGE, getSchemeKnowledge, getSchemeDocType } from '../data/schemeKnowledge.js';

const { confidence: CONFIDENCE_THRESHOLDS, retrieval: RETRIEVAL_CONFIG } = RAG_CONFIG;

/**
 * Normalizes content to string, handling strict type safety.
 * Converts objects/arrays to JSON string for retrieval context.
 */
function normalizeContent(content) {
    if (!content) return "";
    if (typeof content === "string") return content.trim();
    return JSON.stringify(content);
}

/**
 * Retrieves context for a query.
 * 
 * @param {Object} query - Query object from queryBuilder
 * @returns {Object} Retrieved context with confidence
 */
export function retrieveContext(query) {
    const { scheme_id, doc_types, task } = query;

    console.log("[RAG][Retriever] Called with query:", {
    scheme_id: query.scheme_id,
    task: query.task,
    doc_types: query.doc_types
});

    // Validate scheme exists
    const schemeKnowledge = getSchemeKnowledge(scheme_id);

    console.log(
    "[RAG][Retriever] Scheme lookup:",
    scheme_id,
    schemeKnowledge ? "FOUND" : "NOT FOUND"
);

    if (!schemeKnowledge) {
        return createNoContextResult(scheme_id, 'Scheme not found in knowledge base');
    }

    // Retrieve relevant sections
    const retrievedChunks = [];
    let totalRelevance = 0;

    for (const docType of doc_types || ['eligibility', 'benefits', 'documents']) {

        console.log(
    "[RAG][Retriever] Processing docType:",
    docType,
    "Raw exists:",
    Boolean(schemeKnowledge[docType])
);

        const rawContent = schemeKnowledge[docType];

        // Fix 2: Strict String Normalization using JSON.stringify
        const content = normalizeContent(rawContent);

        console.log(
    "[RAG][Retriever] Normalized content length:",
    content.length,
    "for docType:",
    docType
);

        if (content && content.length > 0) {
            const chunk = {
                scheme_id,
                doc_type: docType,
                content: content,
                relevance: calculateRelevance(content, query),
                source: 'official_knowledge_base'
            };

            retrievedChunks.push(chunk);
            totalRelevance += chunk.relevance;

            console.log("[RAG][Retriever] Chunk added:", {
    doc_type: docType,
    length: content.length,
    relevance: chunk.relevance.toFixed(2)
});

        }
    }

    if (retrievedChunks.length === 0) {

        console.warn(
    "[RAG][Retriever] No chunks retrieved for scheme:",
    scheme_id
);

        return createNoContextResult(scheme_id, 'No relevant sections found');
    }

    // Sort by relevance
    retrievedChunks.sort((a, b) => b.relevance - a.relevance);

    // Calculate overall confidence
    const avgRelevance = totalRelevance / retrievedChunks.length;
    const confidence = calculateConfidence(retrievedChunks, avgRelevance);

    console.log("[RAG][Retriever] Confidence computed:", {
    avgRelevance: avgRelevance.toFixed(2),
    confidence_score: confidence.score,
    confidence_level: confidence.level
});

    // Truncate to max context length
    const truncatedChunks = truncateToMaxLength(retrievedChunks);

    console.log("[RAG][Retriever] Truncation result:", {
    before: retrievedChunks.length,
    after: truncatedChunks.length,
    total_length: truncatedChunks.reduce((s, c) => s + c.content.length, 0)
});

console.log("[RAG][Retriever] SUCCESS:", {
    scheme_id,
    chunks: truncatedChunks.map(c => c.doc_type),
    confidence: confidence.level,
    total_length: truncatedChunks.reduce((s, c) => s + c.content.length, 0)
});

    return {
        success: true,
        scheme_id,
        chunks: truncatedChunks,
        total_chunks: truncatedChunks.length,
        confidence: confidence.level,
        confidence_score: confidence.score,
        metadata: {
            source: 'knowledge_base',
            doc_types_found: truncatedChunks.map(c => c.doc_type),
            total_length: truncatedChunks.reduce((sum, c) => sum + c.content.length, 0)
        }
    };
}

/**
 * Retrieves context for multiple schemes.
 */
export function retrieveBatchContext(queries) {
    return queries.map(query => retrieveContext(query));
}

/**
 * Calculates relevance score for a chunk.
 * Simple keyword-based scoring for offline operation.
 */
function calculateRelevance(content, query) {
    const { semantic_query, farmer_context } = query;
    let score = 0.5;  // Base relevance

    // Check for context keywords
    if (farmer_context) {
        const { state, landholding, farmer_type, purpose } = farmer_context;

        const lowerContent = content.toLowerCase();

        if (farmer_type && lowerContent.includes(farmer_type.toLowerCase())) {
            score += 0.15;
        }

        if (landholding) {
            if (lowerContent.includes(landholding) ||
                lowerContent.includes('all farmers') ||
                lowerContent.includes('any farmer')) {
                score += 0.1;
            }
        }

        if (purpose && lowerContent.includes(purpose.toLowerCase())) {
            score += 0.1;
        }
    }

    // Check for semantic query keywords
    if (semantic_query) {
        const queryWords = semantic_query.toLowerCase().split(' ');
        const lowerContent = content.toLowerCase();

        let matches = 0;
        for (const word of queryWords) {
            if (word.length > 3 && lowerContent.includes(word)) {
                matches++;
            }
        }

        score += Math.min(0.2, matches * 0.03);
    }

    return Math.min(1.0, score);
}

/**
 * Calculates overall confidence level.
 */
function calculateConfidence(chunks, avgRelevance) {
    let score = avgRelevance * 100;

    // Boost for having multiple relevant chunks
    if (chunks.length >= RETRIEVAL_CONFIG.minimumChunks) {
        score += 5;
    }

    // Boost for official source
    if (chunks.every(c => c.source === 'official_knowledge_base')) {
        score += 10;
    }

    // Cap at 100
    score = Math.min(100, score);

    // Determine level
    let level;
    if (score >= CONFIDENCE_THRESHOLDS.high * 100) {
        level = 'HIGH';
    } else if (score >= CONFIDENCE_THRESHOLDS.medium * 100) {
        level = 'MEDIUM';
    } else {
        level = 'LOW';
    }

    return { score: Math.round(score), level };
}

/**
 * Truncates chunks to fit max context length.
 */
function truncateToMaxLength(chunks) {
    const maxLength = RETRIEVAL_CONFIG.maxContextLength;
    const result = [];
    let currentLength = 0;

    for (const chunk of chunks) {
        if (currentLength + chunk.content.length <= maxLength) {
            result.push(chunk);
            currentLength += chunk.content.length;
        } else {
            // Truncate last chunk if needed
            const remaining = maxLength - currentLength;
            if (remaining > 100) {  // Only include if meaningful
                result.push({
                    ...chunk,
                    content: chunk.content.substring(0, remaining) + '...',
                    truncated: true
                });
            }
            break;
        }
    }

    return result;
}

/**
 * Creates a no-context result for failed retrieval.
 */
function createNoContextResult(schemeId, reason) {
    return {
        success: false,
        scheme_id: schemeId,
        chunks: [],
        total_chunks: 0,
        confidence: 'NONE',
        confidence_score: 0,
        error: reason,
        fallback_message: RAG_CONFIG.failureMessages.schemeNotFound
    };
}

/**
 * Gets raw scheme knowledge without query processing.
 * Used for direct lookups.
 */
export function getDirectKnowledge(schemeId, docType = null) {
    const knowledge = getSchemeKnowledge(schemeId);

    if (!knowledge) {
        return null;
    }

    if (docType) {
        return knowledge[docType] || null;
    }

    return knowledge;
}

/**
 * Checks if knowledge is available for a scheme.
 */
export function hasKnowledge(schemeId) {
    return !!getSchemeKnowledge(schemeId);
}

/**
 * Gets available doc types for a scheme.
 */
export function getAvailableDocTypes(schemeId) {
    const knowledge = getSchemeKnowledge(schemeId);

    if (!knowledge) {
        return [];
    }

    return Object.keys(knowledge).filter(key =>
        ['eligibility', 'benefits', 'documents', 'process', 'faq'].includes(key)
    );
}

export default {
    retrieveContext,
    retrieveBatchContext,
    getDirectKnowledge,
    hasKnowledge,
    getAvailableDocTypes
};

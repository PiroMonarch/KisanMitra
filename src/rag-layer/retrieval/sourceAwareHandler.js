/**
 * Source-Aware RAG Handler
 * 
 * Enhances retrieval with source metadata tracking and conflict detection.
 * Every retrieved chunk carries source information for auditability.
 * 
 * KEY PRINCIPLE: Disagreement = Uncertainty
 * If multiple chunks disagree on a fact → automatically downgrade confidence.
 * Never hallucinate reconciliation.
 */

// Source type hierarchy (for conflict resolution priority)
const SOURCE_PRIORITY = Object.freeze({
    'central_government': 1,    // Highest priority (Ministry, RBI, NABARD)
    'central_pdf': 1,
    'rbi_circular': 1,
    'nabard_guideline': 1,
    'state_government': 2,      // State-level
    'state_pdf': 2,
    'bank_guideline': 3,        // Bank implementation
    'official_faq': 4,          // FAQs (may be simplified)
    'portal': 5,                // Web portals
    'unknown': 10               // Lowest priority
});

// Source confidence levels
const SOURCE_CONFIDENCE = Object.freeze({
    HIGH: 'HIGH',       // Verified official source
    MEDIUM: 'MEDIUM',   // Official but may be outdated
    LOW: 'LOW'          // Uncertain provenance
});

/**
 * Chunk metadata schema for source-aware retrieval.
 * @typedef {Object} SourceAwareChunk
 * @property {string} content - Chunk content
 * @property {string} scheme_id - Scheme identifier
 * @property {string} doc_type - Document type
 * @property {Object} source - Source metadata
 * @property {string} source.name - Source name (e.g., "PMFBY PDF 2024")
 * @property {string} source.type - Source type (central/state/bank)
 * @property {string} source.confidence - Source confidence level
 * @property {string} source.last_verified - ISO date of last verification
 */

/**
 * Enhances chunks with full source metadata.
 * 
 * @param {Array} chunks - Retrieved chunks
 * @param {Object} sourceRegistry - Registry of known sources
 * @returns {Array} Chunks with enhanced source metadata
 */
export function enhanceChunksWithSourceMetadata(chunks, sourceRegistry = {}) {
    return chunks.map(chunk => ({
        ...chunk,
        source: {
            name: chunk.source_name || chunk.metadata?.source_name || 'Official Knowledge Base',
            type: determineSourceType(chunk),
            confidence: determineSourceConfidence(chunk),
            priority: getSourcePriority(chunk),
            last_verified: chunk.metadata?.last_updated || null
        }
    }));
}

/**
 * Determines source type from chunk metadata.
 */
function determineSourceType(chunk) {
    const sourceName = (chunk.source_name || chunk.metadata?.source_name || '').toLowerCase();
    const sourceType = chunk.source_type || chunk.metadata?.source_type || '';

    if (sourceName.includes('rbi') || sourceName.includes('nabard') || sourceName.includes('ministry')) {
        return 'central_government';
    }
    if (sourceName.includes('state') || sourceType === 'state_government') {
        return 'state_government';
    }
    if (sourceName.includes('bank') || sourceType === 'bank_guideline') {
        return 'bank_guideline';
    }
    if (sourceName.includes('faq') || sourceType === 'official_faq') {
        return 'official_faq';
    }
    if (chunk.source === 'official_knowledge_base') {
        return 'central_government';  // Our curated knowledge base
    }

    return 'unknown';
}

/**
 * Determines source confidence from metadata.
 */
function determineSourceConfidence(chunk) {
    const isOfficial = chunk.is_official !== false && chunk.metadata?.is_official !== false;
    const sourceType = determineSourceType(chunk);

    if (isOfficial && ['central_government', 'rbi_circular', 'nabard_guideline'].includes(sourceType)) {
        return SOURCE_CONFIDENCE.HIGH;
    }
    if (isOfficial) {
        return SOURCE_CONFIDENCE.MEDIUM;
    }
    return SOURCE_CONFIDENCE.LOW;
}

/**
 * Gets source priority for conflict resolution.
 */
function getSourcePriority(chunk) {
    const sourceType = determineSourceType(chunk);
    return SOURCE_PRIORITY[sourceType] || SOURCE_PRIORITY.unknown;
}

// ═══════════════════════════════════════════════════════════════
// CONFLICT DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detects conflicts between retrieved chunks.
 * 
 * @param {Array} chunks - Source-aware chunks
 * @param {string} factType - Type of fact to check (amount, rate, eligibility)
 * @returns {Object} Conflict detection result
 */
export function detectConflicts(chunks, factType = 'general') {
    const conflicts = [];
    const factExtractors = {
        amount: extractAmounts,
        rate: extractRates,
        eligibility: extractEligibilityCriteria,
        general: extractKeyFacts
    };

    const extractor = factExtractors[factType] || factExtractors.general;

    // Extract facts from each chunk
    const chunkFacts = chunks.map(chunk => ({
        chunk_id: chunk.id,
        source: chunk.source,
        facts: extractor(chunk.content)
    }));

    // Compare facts across chunks
    for (let i = 0; i < chunkFacts.length; i++) {
        for (let j = i + 1; j < chunkFacts.length; j++) {
            const conflictingFacts = findConflictingFacts(
                chunkFacts[i].facts,
                chunkFacts[j].facts
            );

            if (conflictingFacts.length > 0) {
                conflicts.push({
                    chunk1: chunkFacts[i].chunk_id,
                    chunk2: chunkFacts[j].chunk_id,
                    source1: chunkFacts[i].source,
                    source2: chunkFacts[j].source,
                    conflicting_facts: conflictingFacts
                });
            }
        }
    }

    return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        sourceAgreement: conflicts.length === 0,
        conflictCount: conflicts.length
    };
}

/**
 * Extracts monetary amounts from text.
 */
function extractAmounts(text) {
    const amounts = [];
    const patterns = [
        /₹\s*([\d,]+)\s*(lakh|crore)?/gi,
        /Rs\.?\s*([\d,]+)\s*(lakh|crore)?/gi,
        /([\d,]+)\s*rupees/gi
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            amounts.push({
                type: 'amount',
                value: match[0],
                normalized: normalizeAmount(match[0])
            });
        }
    }

    return amounts;
}

/**
 * Extracts interest rates from text.
 */
function extractRates(text) {
    const rates = [];
    const pattern = /(\d+(?:\.\d+)?)\s*%/g;

    let match;
    while ((match = pattern.exec(text)) !== null) {
        rates.push({
            type: 'rate',
            value: match[0],
            normalized: parseFloat(match[1])
        });
    }

    return rates;
}

/**
 * Extracts eligibility criteria from text.
 */
function extractEligibilityCriteria(text) {
    const criteria = [];
    const patterns = [
        /eligible|not eligible|ineligible/gi,
        /minimum|maximum|at least|up to/gi,
        /required|mandatory|optional/gi
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            // Get surrounding context
            const start = Math.max(0, match.index - 50);
            const end = Math.min(text.length, match.index + match[0].length + 50);
            criteria.push({
                type: 'eligibility',
                value: text.substring(start, end).trim(),
                keyword: match[0]
            });
        }
    }

    return criteria;
}

/**
 * Extracts key facts from text (general).
 */
function extractKeyFacts(text) {
    const facts = [];

    // Extract amounts
    facts.push(...extractAmounts(text));

    // Extract rates
    facts.push(...extractRates(text));

    return facts;
}

/**
 * Finds conflicting facts between two fact sets.
 */
function findConflictingFacts(facts1, facts2) {
    const conflicts = [];

    for (const fact1 of facts1) {
        for (const fact2 of facts2) {
            if (fact1.type === fact2.type && fact1.type === 'amount') {
                // Check if amounts conflict (differ by more than 10%)
                if (fact1.normalized && fact2.normalized) {
                    const diff = Math.abs(fact1.normalized - fact2.normalized) / Math.max(fact1.normalized, fact2.normalized);
                    if (diff > 0.1) {
                        conflicts.push({
                            type: 'amount_mismatch',
                            value1: fact1.value,
                            value2: fact2.value
                        });
                    }
                }
            }

            if (fact1.type === fact2.type && fact1.type === 'rate') {
                // Check if rates conflict
                if (fact1.normalized !== fact2.normalized) {
                    conflicts.push({
                        type: 'rate_mismatch',
                        value1: fact1.value,
                        value2: fact2.value
                    });
                }
            }
        }
    }

    return conflicts;
}

/**
 * Normalizes amount string to number.
 */
function normalizeAmount(amountStr) {
    let value = amountStr.replace(/[₹Rs.,\s]/gi, '');

    if (/crore/i.test(amountStr)) {
        value = parseFloat(value) * 10000000;
    } else if (/lakh/i.test(amountStr)) {
        value = parseFloat(value) * 100000;
    } else {
        value = parseFloat(value);
    }

    return isNaN(value) ? null : value;
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE ADJUSTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Adjusts confidence based on source analysis and conflicts.
 * 
 * @param {string} originalConfidence - Original confidence level
 * @param {Object} conflictResult - Result from detectConflicts
 * @param {Array} chunks - Source-aware chunks
 * @returns {Object} Adjusted confidence with metadata
 */
export function adjustConfidenceForSources(originalConfidence, conflictResult, chunks) {
    let adjustedConfidence = originalConfidence;
    let confidenceAdjusted = false;
    const reasons = [];

    // RULE 1: Conflicts always downgrade confidence
    if (conflictResult.hasConflicts) {
        if (originalConfidence === 'HIGH') {
            adjustedConfidence = 'MEDIUM';
            confidenceAdjusted = true;
            reasons.push(`Downgraded from HIGH due to ${conflictResult.conflictCount} source conflict(s)`);
        } else if (originalConfidence === 'MEDIUM') {
            adjustedConfidence = 'LOW';
            confidenceAdjusted = true;
            reasons.push(`Downgraded from MEDIUM due to ${conflictResult.conflictCount} source conflict(s)`);
        }
    }

    // RULE 2: Low-confidence sources downgrade
    const lowConfidenceSources = chunks.filter(c => c.source?.confidence === 'LOW');
    if (lowConfidenceSources.length > 0 && lowConfidenceSources.length === chunks.length) {
        if (adjustedConfidence === 'HIGH') {
            adjustedConfidence = 'MEDIUM';
            confidenceAdjusted = true;
            reasons.push('All sources have LOW confidence');
        }
    }

    // RULE 3: Single source is less reliable
    if (chunks.length === 1 && adjustedConfidence === 'HIGH') {
        adjustedConfidence = 'MEDIUM';
        confidenceAdjusted = true;
        reasons.push('Only single source available');
    }

    return {
        originalConfidence,
        adjustedConfidence,
        confidenceAdjusted,
        sourceAgreement: conflictResult.sourceAgreement,
        adjustmentReasons: reasons,
        sourceAnalysis: {
            totalSources: chunks.length,
            highConfidenceSources: chunks.filter(c => c.source?.confidence === 'HIGH').length,
            conflictCount: conflictResult.conflictCount
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN SOURCE-AWARE RETRIEVAL
// ═══════════════════════════════════════════════════════════════

/**
 * Performs source-aware retrieval with conflict detection.
 * 
 * @param {Object} retrievalResult - Original retrieval result
 * @returns {Object} Enhanced result with source metadata
 */
export function performSourceAwareRetrieval(retrievalResult) {
    if (!retrievalResult.success || !retrievalResult.chunks) {
        return retrievalResult;
    }

    // Step 1: Enhance chunks with source metadata
    const enhancedChunks = enhanceChunksWithSourceMetadata(retrievalResult.chunks);

    // Step 2: Detect conflicts
    const conflictResult = detectConflicts(enhancedChunks);

    // Step 3: Adjust confidence
    const confidenceResult = adjustConfidenceForSources(
        retrievalResult.confidence,
        conflictResult,
        enhancedChunks
    );

    return {
        ...retrievalResult,
        chunks: enhancedChunks,
        confidence: confidenceResult.adjustedConfidence,
        original_confidence: confidenceResult.originalConfidence,

        // Source-aware metadata (internal, no UI change)
        _source_analysis: {
            sourceAgreement: conflictResult.sourceAgreement,
            confidenceAdjusted: confidenceResult.confidenceAdjusted,
            conflicts: conflictResult.conflicts,
            adjustmentReasons: confidenceResult.adjustmentReasons,
            sourceBreakdown: confidenceResult.sourceAnalysis
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    enhanceChunksWithSourceMetadata,
    detectConflicts,
    adjustConfidenceForSources,
    performSourceAwareRetrieval,
    SOURCE_PRIORITY,
    SOURCE_CONFIDENCE
};

/**
 * METADATA SCHEMA for each chunk:
 * 
 * {
 *   content: "...",
 *   scheme_id: "KCC",
 *   doc_type: "eligibility",
 *   source: {
 *     name: "RBI Master Circular 2024",
 *     type: "central_government",
 *     confidence: "HIGH",
 *     priority: 1,
 *     last_verified: "2024-01-15"
 *   }
 * }
 * 
 * CONFLICT HANDLING LOGIC:
 * 
 * 1. Extract facts from each chunk (amounts, rates, criteria)
 * 2. Compare facts across chunks
 * 3. If facts conflict:
 *    - Record conflict details
 *    - Downgrade confidence (HIGH → MEDIUM, MEDIUM → LOW)
 *    - Set sourceAgreement = false
 * 4. If all chunks agree:
 *    - Maintain original confidence
 *    - Set sourceAgreement = true
 * 
 * NEVER hallucinate reconciliation.
 * Disagreement = Uncertainty.
 */

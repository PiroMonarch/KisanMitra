/**
 * Scheme-Aware Chunker
 * 
 * Chunks preprocessed documents into vector-store-ready segments.
 * CRITICAL: Every chunk MUST have scheme_id and doc_type metadata.
 * 
 * Strategy:
 * - Respect section boundaries (don't split mid-section if possible)
 * - Maintain semantic coherence
 * - Include overlap for context continuity
 */

import { RAG_CONFIG } from '../config/ragConfig.js';
import { createChunkMetadata } from '../vectorstore/metadataSchema.js';

const { maxChunkSize, chunkOverlap, minChunkSize, separators } = RAG_CONFIG.chunking;

/**
 * Chunks a preprocessed document into indexed segments.
 * Each chunk includes full metadata for controlled retrieval.
 * 
 * @param {Object} preprocessedDoc - Output from preprocessor
 * @param {Object} options - Chunking options
 * @returns {Array} Array of chunks with metadata
 */
export function chunkDocument(preprocessedDoc, options = {}) {
    const {
        scheme_id,
        source_type,
        source_name,
        sections,
        language
    } = preprocessedDoc;

    if (!scheme_id) {
        throw new Error('scheme_id is required for chunking');
    }

    const chunks = [];
    let globalIndex = 0;

    // Process each section
    for (const section of sections) {
        const sectionChunks = chunkSection(section.content, {
            ...options,
            sectionType: section.type,
            sectionTitle: section.title
        });

        // Add metadata to each chunk
        for (const chunkContent of sectionChunks) {
            const metadata = createChunkMetadata({
                scheme_id,
                doc_type: mapSectionToDocType(section.type),
                source_type,
                source_name,
                language,
                chunk_index: globalIndex,
                section_title: section.title,
                applicable_states: options.applicable_states || ['ALL'],
                applicable_farmer_types: options.applicable_farmer_types || ['owner', 'tenant'],
                is_official: options.is_official !== false
            });

            chunks.push({
                content: chunkContent,
                metadata,
                id: generateChunkId(scheme_id, globalIndex)
            });

            globalIndex++;
        }
    }

    // If no sections, chunk the whole text
    if (chunks.length === 0 && preprocessedDoc.cleanedText) {
        const textChunks = chunkText(preprocessedDoc.cleanedText);

        for (const chunkContent of textChunks) {
            const metadata = createChunkMetadata({
                scheme_id,
                doc_type: 'general',
                source_type,
                source_name,
                language,
                chunk_index: globalIndex,
                is_official: options.is_official !== false
            });

            chunks.push({
                content: chunkContent,
                metadata,
                id: generateChunkId(scheme_id, globalIndex)
            });

            globalIndex++;
        }
    }

    return chunks;
}

/**
 * Chunks a section respecting semantic boundaries.
 */
function chunkSection(text, options = {}) {
    if (!text || text.length === 0) {
        return [];
    }

    // If section is small enough, return as single chunk
    if (text.length <= maxChunkSize) {
        return [text.trim()];
    }

    return chunkText(text);
}

/**
 * Chunks text using recursive splitting with overlap.
 */
function chunkText(text, depth = 0) {
    if (text.length <= maxChunkSize) {
        return text.trim() ? [text.trim()] : [];
    }

    // Get separator for this depth
    const separator = separators[Math.min(depth, separators.length - 1)];
    const parts = text.split(separator).filter(p => p.trim());

    const chunks = [];
    let currentChunk = '';

    for (const part of parts) {
        const testChunk = currentChunk ? currentChunk + separator + part : part;

        if (testChunk.length <= maxChunkSize) {
            currentChunk = testChunk;
        } else {
            // Save current chunk if it meets minimum size
            if (currentChunk.length >= minChunkSize) {
                chunks.push(currentChunk.trim());
            }

            // Handle oversized part
            if (part.length > maxChunkSize && depth < separators.length - 1) {
                // Recursively split with next separator
                const subChunks = chunkText(part, depth + 1);
                chunks.push(...subChunks);
                currentChunk = '';
            } else if (part.length > maxChunkSize) {
                // Force split at max size (last resort)
                const forceSplit = forceChunk(part);
                chunks.push(...forceSplit);
                currentChunk = '';
            } else {
                currentChunk = part;
            }
        }
    }

    // Don't forget the last chunk
    if (currentChunk.length >= minChunkSize) {
        chunks.push(currentChunk.trim());
    } else if (currentChunk.length > 0 && chunks.length > 0) {
        // Append to previous chunk if too small
        chunks[chunks.length - 1] += separator + currentChunk;
    }

    // Add overlaps between chunks
    return addOverlaps(chunks);
}

/**
 * Forces chunking at fixed size (last resort).
 */
function forceChunk(text) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + maxChunkSize, text.length);
        chunks.push(text.substring(start, end).trim());
        start = end - chunkOverlap;  // Overlap
    }

    return chunks;
}

/**
 * Adds overlap context between chunks.
 */
function addOverlaps(chunks) {
    if (chunks.length <= 1 || chunkOverlap === 0) {
        return chunks;
    }

    const overlappedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i];

        // Add overlap from previous chunk (suffix)
        if (i > 0) {
            const prevChunk = chunks[i - 1];
            const overlapText = prevChunk.slice(-chunkOverlap);
            if (overlapText && (chunk + overlapText).length <= maxChunkSize + chunkOverlap) {
                chunk = '...' + overlapText + ' ' + chunk;
            }
        }

        overlappedChunks.push(chunk);
    }

    return overlappedChunks;
}

/**
 * Maps section type to document type.
 */
function mapSectionToDocType(sectionType) {
    const mapping = {
        'eligibility': 'eligibility',
        'benefits': 'benefits',
        'documents': 'documents',
        'process': 'process',
        'contact': 'contact',
        'faq': 'faq',
        'general': 'eligibility'  // Default to eligibility
    };

    return mapping[sectionType] || 'eligibility';
}

/**
 * Generates unique chunk ID.
 */
function generateChunkId(schemeId, index) {
    return `${schemeId.toLowerCase()}_chunk_${index.toString().padStart(4, '0')}`;
}

/**
 * Convenience function to chunk a raw document end-to-end.
 * 
 * @param {string} rawText - Raw document text
 * @param {string} schemeId - Scheme identifier
 * @param {Object} options - Options for preprocessing and chunking
 * @returns {Array} Array of chunks ready for vector store
 */
export async function processAndChunkDocument(rawText, schemeId, options = {}) {
    // Import preprocessor dynamically to avoid circular deps
    const { preprocessSchemeDocument } = await import('./preprocessor.js');

    // Preprocess
    const preprocessed = preprocessSchemeDocument(rawText, schemeId, options);

    // Chunk
    const chunks = chunkDocument(preprocessed, options);

    return {
        chunks,
        stats: {
            originalLength: preprocessed.originalLength,
            cleanedLength: preprocessed.cleanedLength,
            reductionPercent: preprocessed.reductionPercent,
            totalChunks: chunks.length,
            avgChunkSize: Math.round(chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length)
        }
    };
}

export default {
    chunkDocument,
    processAndChunkDocument
};

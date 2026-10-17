/**
 * Document Loader
 * 
 * Loads documents from various sources for ingestion.
 * Supports: PDF, text files, and structured data.
 * 
 * Note: For production, use proper PDF parsing libraries like pdf-parse.
 * This module provides the structure; actual PDF parsing requires backend.
 */

import { SOURCE_TYPES } from '../config/ragConfig.js';

/**
 * Document source definition
 * @typedef {Object} DocumentSource
 * @property {string} path - File path or URL
 * @property {string} scheme_id - Associated scheme
 * @property {string} source_type - Type of source
 * @property {string} source_name - Human-readable name
 */

/**
 * Known scheme documents registry.
 * In production, this would be populated from a database or file system scan.
 */
export const SCHEME_DOCUMENTS = {
    KCC: [
        {
            source_type: SOURCE_TYPES.GOVERNMENT_PDF,
            source_name: 'KCC Operational Guidelines',
            description: 'Official RBI/NABARD guidelines for Kisan Credit Card'
        },
        {
            source_type: SOURCE_TYPES.BANK_GUIDELINE,
            source_name: 'SBI KCC Scheme Details',
            description: 'State Bank of India KCC implementation'
        },
        {
            source_type: SOURCE_TYPES.OFFICIAL_FAQ,
            source_name: 'KCC FAQs - PIB',
            description: 'Press Information Bureau FAQ document'
        }
    ],
    PMKISAN: [
        {
            source_type: SOURCE_TYPES.GOVERNMENT_PDF,
            source_name: 'PM-KISAN Operational Guidelines',
            description: 'Official DAC&FW guidelines'
        },
        {
            source_type: SOURCE_TYPES.OFFICIAL_FAQ,
            source_name: 'PM-KISAN FAQs',
            description: 'Official FAQ from pmkisan.gov.in'
        }
    ],
    PMFBY: [
        {
            source_type: SOURCE_TYPES.GOVERNMENT_PDF,
            source_name: 'PMFBY Operational Guidelines 2024',
            description: 'Ministry of Agriculture guidelines'
        }
    ]
    // Add more schemes as needed
};

/**
 * Loads document content from a source.
 * 
 * @param {string} source - File path, URL, or raw content identifier
 * @param {string} type - Source type (file, url, raw)
 * @returns {Promise<Object>} Loaded document with content and metadata
 */
export async function loadDocument(source, type = 'raw') {
    switch (type) {
        case 'raw':
            return loadRawContent(source);
        case 'file':
            return loadFromFile(source);
        case 'url':
            return loadFromUrl(source);
        default:
            throw new Error(`Unknown source type: ${type}`);
    }
}

/**
 * Loads raw content (for direct text input).
 */
function loadRawContent(content) {
    return {
        content,
        source: 'raw_input',
        loadedAt: new Date().toISOString()
    };
}

/**
 * Loads content from a file.
 * Note: This is a stub for browser environment. 
 * Backend implementation would use fs or pdf-parse.
 */
async function loadFromFile(filePath) {
    // In browser, this would be handled differently
    // This is a placeholder for the structure
    console.warn('File loading requires backend implementation');

    return {
        content: '',
        source: filePath,
        loadedAt: new Date().toISOString(),
        error: 'File loading not implemented in browser'
    };
}

/**
 * Loads content from a URL.
 * For official government PDFs, this would fetch and parse.
 */
async function loadFromUrl(url) {
    try {
        const response = await fetch(url);
        const content = await response.text();

        return {
            content,
            source: url,
            loadedAt: new Date().toISOString()
        };
    } catch (error) {
        return {
            content: '',
            source: url,
            loadedAt: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Ingests pre-created scheme knowledge.
 * This is the primary method for adding official scheme information.
 * 
 * @param {string} schemeId - Scheme identifier
 * @param {Object} knowledge - Structured knowledge about the scheme
 * @returns {Object} Ingestion result
 */
export function ingestSchemeKnowledge(schemeId, knowledge) {
    const { eligibility, benefits, documents, process, faq } = knowledge;

    const loadedDocs = [];

    if (eligibility) {
        loadedDocs.push({
            scheme_id: schemeId,
            doc_type: 'eligibility',
            content: eligibility,
            source_type: SOURCE_TYPES.OFFICIAL_FAQ
        });
    }

    if (benefits) {
        loadedDocs.push({
            scheme_id: schemeId,
            doc_type: 'benefits',
            content: benefits,
            source_type: SOURCE_TYPES.OFFICIAL_FAQ
        });
    }

    if (documents) {
        loadedDocs.push({
            scheme_id: schemeId,
            doc_type: 'documents',
            content: documents,
            source_type: SOURCE_TYPES.OFFICIAL_FAQ
        });
    }

    if (process) {
        loadedDocs.push({
            scheme_id: schemeId,
            doc_type: 'process',
            content: process,
            source_type: SOURCE_TYPES.OFFICIAL_FAQ
        });
    }

    if (faq) {
        loadedDocs.push({
            scheme_id: schemeId,
            doc_type: 'faq',
            content: faq,
            source_type: SOURCE_TYPES.OFFICIAL_FAQ
        });
    }

    return {
        schemeId,
        documentsLoaded: loadedDocs.length,
        documents: loadedDocs
    };
}

/**
 * Batch ingests multiple schemes' knowledge.
 * 
 * @param {Object} schemeKnowledgeMap - Map of schemeId to knowledge objects
 * @returns {Object} Batch ingestion results
 */
export function batchIngestSchemeKnowledge(schemeKnowledgeMap) {
    const results = [];

    for (const [schemeId, knowledge] of Object.entries(schemeKnowledgeMap)) {
        const result = ingestSchemeKnowledge(schemeId, knowledge);
        results.push(result);
    }

    return {
        totalSchemes: results.length,
        totalDocuments: results.reduce((sum, r) => sum + r.documentsLoaded, 0),
        results
    };
}

export default {
    loadDocument,
    ingestSchemeKnowledge,
    batchIngestSchemeKnowledge,
    SCHEME_DOCUMENTS
};

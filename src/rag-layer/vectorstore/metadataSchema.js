/**
 * Metadata Schema for Vector Store
 * 
 * Every chunk MUST have this metadata for controlled retrieval.
 * This ensures RAG only retrieves scheme-specific, typed content.
 */

/**
 * Chunk metadata structure
 * @typedef {Object} ChunkMetadata
 * @property {string} scheme_id - Scheme identifier (e.g., "KCC", "PMKISAN")
 * @property {string} doc_type - Type of content (eligibility, benefits, documents, etc.)
 * @property {string} source_type - Origin of document (government_pdf, bank_guideline, etc.)
 * @property {string} source_name - Original document name
 * @property {string[]} applicable_states - States where applicable (["ALL"] for national)
 * @property {string[]} applicable_farmer_types - Farmer types (owner, tenant)
 * @property {string} language - Content language (en, hi)
 * @property {number} chunk_index - Position in original document
 * @property {string} last_updated - ISO date of last update
 * @property {boolean} is_official - Whether from official source
 */

export const METADATA_SCHEMA = {
    // Required fields - must be present on every chunk
    required: [
        'scheme_id',
        'doc_type',
        'source_type',
        'is_official'
    ],

    // Optional but recommended
    optional: [
        'source_name',
        'applicable_states',
        'applicable_farmer_types',
        'language',
        'chunk_index',
        'last_updated',
        'section_title'
    ],

    // Valid values for each field
    validValues: {
        doc_type: ['eligibility', 'benefits', 'documents', 'process', 'form', 'faq', 'contact'],
        source_type: ['government_pdf', 'bank_guideline', 'official_faq', 'application_form', 'circular'],
        language: ['en', 'hi'],
        is_official: [true, false]
    }
};

/**
 * Creates a validated metadata object for a chunk.
 * 
 * @param {Object} params - Metadata parameters
 * @returns {Object} Validated metadata object
 * @throws {Error} If required fields are missing
 */
export function createChunkMetadata({
    scheme_id,
    doc_type,
    source_type,
    source_name = null,
    applicable_states = ['ALL'],
    applicable_farmer_types = ['owner', 'tenant'],
    language = 'en',
    chunk_index = 0,
    last_updated = new Date().toISOString(),
    section_title = null,
    is_official = true
}) {
    // Validate required fields
    if (!scheme_id) throw new Error('scheme_id is required');
    if (!doc_type) throw new Error('doc_type is required');
    if (!source_type) throw new Error('source_type is required');

    // Validate doc_type
    if (!METADATA_SCHEMA.validValues.doc_type.includes(doc_type)) {
        throw new Error(`Invalid doc_type: ${doc_type}. Valid: ${METADATA_SCHEMA.validValues.doc_type.join(', ')}`);
    }

    // Validate source_type
    if (!METADATA_SCHEMA.validValues.source_type.includes(source_type)) {
        throw new Error(`Invalid source_type: ${source_type}. Valid: ${METADATA_SCHEMA.validValues.source_type.join(', ')}`);
    }

    return {
        scheme_id: scheme_id.toUpperCase(),
        doc_type,
        source_type,
        source_name,
        applicable_states,
        applicable_farmer_types,
        language,
        chunk_index,
        last_updated,
        section_title,
        is_official
    };
}

/**
 * Validates existing metadata object.
 * 
 * @param {Object} metadata - Metadata to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateMetadata(metadata) {
    const errors = [];

    // Check required fields
    for (const field of METADATA_SCHEMA.required) {
        if (metadata[field] === undefined || metadata[field] === null) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    // Validate enum fields
    if (metadata.doc_type && !METADATA_SCHEMA.validValues.doc_type.includes(metadata.doc_type)) {
        errors.push(`Invalid doc_type: ${metadata.doc_type}`);
    }

    if (metadata.source_type && !METADATA_SCHEMA.validValues.source_type.includes(metadata.source_type)) {
        errors.push(`Invalid source_type: ${metadata.source_type}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Creates a filter for vector store queries.
 * Ensures retrieval is always scoped to specific scheme and doc type.
 * 
 * @param {string} scheme_id - Scheme to filter by
 * @param {string[]} doc_types - Document types to include
 * @param {Object} options - Additional filter options
 * @returns {Object} Filter object for vector store
 */
export function createRetrievalFilter(scheme_id, doc_types = null, options = {}) {
    const filter = {
        scheme_id: scheme_id.toUpperCase()
    };

    if (doc_types && doc_types.length > 0) {
        filter.doc_type = { $in: doc_types };
    }

    if (options.state && options.state !== 'ALL') {
        filter.applicable_states = { $in: ['ALL', options.state] };
    }

    if (options.farmer_type) {
        filter.applicable_farmer_types = { $in: [options.farmer_type] };
    }

    if (options.officialOnly) {
        filter.is_official = true;
    }

    if (options.language) {
        filter.language = options.language;
    }

    return filter;
}

export default {
    METADATA_SCHEMA,
    createChunkMetadata,
    validateMetadata,
    createRetrievalFilter
};

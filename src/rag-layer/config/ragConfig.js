/**
 * RAG Layer Configuration
 * 
 * Centralized configuration for the RAG knowledge layer.
 * All thresholds and settings are explicit and auditable.
 */

export const RAG_CONFIG = Object.freeze({
    // Vector store settings
    vectorStore: {
        name: 'kisanmitr_schemes',
        embeddingModel: 'text-embedding-3-small', // OpenAI
        embeddingDimension: 1536,
        distanceMetric: 'cosine'
    },

    // Chunking settings
    chunking: {
        maxChunkSize: 500,          // Characters per chunk
        chunkOverlap: 50,           // Overlap between chunks
        minChunkSize: 100,          // Minimum viable chunk
        separators: ['\n\n', '\n', '. ', ' '] // Split priority
    },

    // Retrieval settings
    retrieval: {
        topK: 5,                    // Max chunks to retrieve per query
        minRelevanceScore: 0.7,     // Minimum similarity threshold
        maxContextLength: 2000,     // Max chars for LLM context
        requireMetadataMatch: true  // Must match scheme_id filter
    },

    // Confidence thresholds
    confidence: {
        high: 0.85,                 // High confidence retrieval
        medium: 0.70,               // Acceptable confidence
        low: 0.50,                  // Below this = fail safe
        minimumChunks: 2            // Need at least N chunks to proceed
    },

    // LLM settings
    llm: {
        model: 'gpt-4o-mini',       // Cost-effective for explanations
        temperature: 0.1,           // Low creativity, high accuracy
        maxTokens: 500,             // Keep responses concise
        timeoutMs: 10000            // Fail fast
    },

    // Supported document types for chunking
    documentTypes: Object.freeze({
        ELIGIBILITY: 'eligibility',
        BENEFITS: 'benefits',
        DOCUMENTS: 'documents',
        PROCESS: 'process',
        FORM: 'form',
        FAQ: 'faq'
    }),

    // Supported languages
    languages: Object.freeze({
        EN: 'english',
        HI: 'hindi'
    }),

    // Failure messages (bilingual)
    failureMessages: Object.freeze({
        noContext: {
            en: 'Complete information is not available right now. Please consult your local bank or agriculture office.',
            hi: 'पूरी जानकारी अभी उपलब्ध नहीं है। कृपया अपने स्थानीय बैंक या कृषि कार्यालय से संपर्क करें।'
        },
        lowConfidence: {
            en: 'We found some information but cannot guarantee accuracy. Please verify with official sources.',
            hi: 'हमें कुछ जानकारी मिली लेकिन सटीकता की गारंटी नहीं दे सकते। कृपया आधिकारिक स्रोतों से सत्यापित करें।'
        },
        schemeNotFound: {
            en: 'No official documentation found for this scheme. Please contact authorities.',
            hi: 'इस योजना के लिए कोई आधिकारिक दस्तावेज़ नहीं मिला। कृपया अधिकारियों से संपर्क करें।'
        }
    })
});

// Document source types
export const SOURCE_TYPES = Object.freeze({
    GOVERNMENT_PDF: 'government_pdf',
    BANK_GUIDELINE: 'bank_guideline',
    OFFICIAL_FAQ: 'official_faq',
    APPLICATION_FORM: 'application_form',
    CIRCULAR: 'circular'
});

// RAG task types (each has a specific prompt)
export const RAG_TASKS = Object.freeze({
    SIMPLE_EXPLANATION: 'simple_explanation',
    ELIGIBILITY_REASONING: 'eligibility_reasoning',
    DOCUMENT_CHECKLIST: 'document_checklist',
    APPLICATION_GUIDANCE: 'application_guidance',
    BENEFIT_SUMMARY: 'benefit_summary',
    VERIFICATION_QNA: 'verification_qna'
});

export default RAG_CONFIG;

/**
 * Document Preprocessor
 * 
 * Cleans and structures raw document content before chunking.
 * Removes legal boilerplate, normalizes formatting, extracts sections.
 */

import { SOURCE_TYPES, RAG_CONFIG } from '../config/ragConfig.js';

// Patterns to remove (legal boilerplate, headers, footers)
const REMOVAL_PATTERNS = [
    /page \d+ of \d+/gi,
    /confidential|draft|internal use only/gi,
    /copyright ©.*/gi,
    /all rights reserved/gi,
    /^\s*\d+\s*$/gm,  // Standalone page numbers
    /www\.\S+/gi,      // URLs (we keep scheme-specific ones)
    /printed on.*/gi,
    /document id:.*/gi
];

// Section headers to detect (for segmentation)
const SECTION_PATTERNS = {
    eligibility: [
        /eligibility\s*(criteria|conditions)?/i,
        /who (can|is eligible|may) apply/i,
        /पात्रता/i  // Hindi: eligibility
    ],
    benefits: [
        /benefits?|advantages?|features?/i,
        /what (you get|farmers get)/i,
        /लाभ/i  // Hindi: benefits
    ],
    documents: [
        /documents?\s*required/i,
        /documents?\s*needed/i,
        /supporting\s*documents?/i,
        /आवश्यक दस्तावेज/i  // Hindi: documents required
    ],
    process: [
        /how to apply/i,
        /application\s*process/i,
        /steps?\s*to\s*(apply|follow)/i,
        /आवेदन प्रक्रिया/i  // Hindi: application process
    ],
    contact: [
        /contact|helpline|toll.?free/i,
        /where to apply/i,
        /संपर्क/i  // Hindi: contact
    ]
};

/**
 * Preprocesses raw document text.
 * 
 * @param {string} rawText - Raw extracted text
 * @param {Object} options - Preprocessing options
 * @returns {Object} Preprocessed document with sections
 */
export function preprocessDocument(rawText, options = {}) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('Invalid input: rawText must be a non-empty string');
    }

    let text = rawText;

    // Step 1: Basic cleaning
    text = cleanText(text);

    // Step 2: Remove boilerplate
    text = removeBoilerplate(text);

    // Step 3: Normalize whitespace
    text = normalizeWhitespace(text);

    // Step 4: Detect language
    const language = detectLanguage(text);

    // Step 5: Segment into sections
    const sections = segmentIntoSections(text);

    // Step 6: Extract key information
    const extractedInfo = extractKeyInfo(text);

    return {
        cleanedText: text,
        language,
        sections,
        extractedInfo,
        originalLength: rawText.length,
        cleanedLength: text.length,
        reductionPercent: Math.round((1 - text.length / rawText.length) * 100)
    };
}

/**
 * Basic text cleaning.
 */
function cleanText(text) {
    return text
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove special characters but keep Hindi
        .replace(/[^\w\s\u0900-\u097F.,;:!?()₹%\-\/\n]/g, ' ')
        // Remove multiple spaces
        .replace(/  +/g, ' ')
        // Remove leading/trailing whitespace from lines
        .split('\n')
        .map(line => line.trim())
        .join('\n');
}

/**
 * Removes legal boilerplate and irrelevant content.
 */
function removeBoilerplate(text) {
    let cleaned = text;

    for (const pattern of REMOVAL_PATTERNS) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned;
}

/**
 * Normalizes whitespace for consistent formatting.
 */
function normalizeWhitespace(text) {
    return text
        // Collapse multiple newlines to max 2
        .replace(/\n{3,}/g, '\n\n')
        // Collapse multiple spaces
        .replace(/ {2,}/g, ' ')
        // Trim
        .trim();
}

/**
 * Detects primary language of text.
 */
function detectLanguage(text) {
    // Count Hindi characters (Devanagari script)
    const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

    if (hindiChars > englishChars * 0.5) {
        return 'hi';  // Primarily Hindi or mixed
    }
    return 'en';
}

/**
 * Segments text into typed sections.
 */
function segmentIntoSections(text) {
    const sections = [];
    const lines = text.split('\n');

    let currentSection = { type: 'general', title: null, content: [] };

    for (const line of lines) {
        // Check if this line is a section header
        const sectionType = detectSectionType(line);

        if (sectionType && sectionType !== currentSection.type) {
            // Save previous section if it has content
            if (currentSection.content.length > 0) {
                sections.push({
                    type: currentSection.type,
                    title: currentSection.title,
                    content: currentSection.content.join('\n').trim()
                });
            }

            // Start new section
            currentSection = {
                type: sectionType,
                title: line.trim(),
                content: []
            };
        } else {
            currentSection.content.push(line);
        }
    }

    // Add final section
    if (currentSection.content.length > 0) {
        sections.push({
            type: currentSection.type,
            title: currentSection.title,
            content: currentSection.content.join('\n').trim()
        });
    }

    return sections;
}

/**
 * Detects section type from a line.
 */
function detectSectionType(line) {
    const trimmedLine = line.trim().toLowerCase();

    for (const [sectionType, patterns] of Object.entries(SECTION_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(trimmedLine)) {
                return sectionType;
            }
        }
    }

    return null;
}

/**
 * Extracts key information from text.
 */
function extractKeyInfo(text) {
    const info = {};

    // Extract amounts (₹)
    const amounts = text.match(/₹[\d,]+(?:\s*(?:lakh|crore|lakhs|crores))?/gi);
    if (amounts) {
        info.amounts = [...new Set(amounts)];
    }

    // Extract percentages
    const percentages = text.match(/\d+(?:\.\d+)?%/g);
    if (percentages) {
        info.percentages = [...new Set(percentages)];
    }

    // Extract phone numbers
    const phones = text.match(/(?:1800|011|022|)\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/g);
    if (phones) {
        info.helplines = [...new Set(phones)];
    }

    return info;
}

/**
 * Preprocesses a scheme-specific document.
 * Adds scheme context to the preprocessing.
 * 
 * @param {string} rawText - Raw document text
 * @param {string} schemeId - Scheme identifier
 * @param {Object} options - Additional options
 * @returns {Object} Preprocessed document with scheme context
 */
export function preprocessSchemeDocument(rawText, schemeId, options = {}) {
    const preprocessed = preprocessDocument(rawText, options);

    return {
        ...preprocessed,
        scheme_id: schemeId.toUpperCase(),
        source_type: options.sourceType || SOURCE_TYPES.GOVERNMENT_PDF,
        source_name: options.sourceName || null,
        preprocessed_at: new Date().toISOString()
    };
}

export default {
    preprocessDocument,
    preprocessSchemeDocument,
    detectLanguage
};

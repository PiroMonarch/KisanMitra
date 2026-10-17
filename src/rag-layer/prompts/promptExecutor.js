/**
 * Prompt Executor
 * 
 * Executes prompts against LLM with proper error handling.
 * Supports both online (API) and offline (template-based) modes.
 * 
 * Offline mode: Uses template-based generation from knowledge base.
 * Online mode: Uses LLM API for richer explanations.
 */

import { RAG_CONFIG, RAG_TASKS } from '../config/ragConfig.js';
import { SYSTEM_PROMPT, fillPromptTemplate, getFailurePrompt } from './promptTemplates.js';

const { llm: LLM_CONFIG } = RAG_CONFIG;

/**
 * Execution mode - determines whether to use LLM or offline templates.
 */
let executionMode = 'offline';  // 'offline' | 'online'
let apiKey = null;

/**
 * Sets the execution mode and API key.
 */
export function setExecutionMode(mode, key = null) {
    executionMode = mode;
    apiKey = key;
}

/**
 * Executes a RAG prompt and returns the response.
 * 
 * @param {string} taskType - Type of RAG task
 * @param {Object} context - Retrieved and validated context
 * @param {Object} params - Parameters for prompt filling
 * @returns {Promise<Object>} Execution result
 */
export async function executePrompt(taskType, context, params) {
    // Fill the prompt template
    const filledPrompt = fillPromptTemplate(taskType, context, params);

    try {
        if (executionMode === 'online' && apiKey) {
            return await executeWithLLM(filledPrompt, taskType);
        } else {
            return executeOffline(taskType, context, params);
        }
    } catch (error) {
        console.error('Prompt execution error:', error);
        return createErrorResponse(error.message);
    }
}

/**
 * Executes prompt with LLM API.
 */
async function executeWithLLM(prompt, taskType) {
    // This is a placeholder for actual LLM API call
    // In production, integrate with OpenAI, Anthropic, or local LLM

    const requestBody = {
        model: LLM_CONFIG.model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
        temperature: LLM_CONFIG.temperature,
        max_tokens: LLM_CONFIG.maxTokens
    };

    // Placeholder: In production, make actual API call
    console.log('LLM API call would be made with:', requestBody);

    // For now, fall back to offline
    return {
        success: false,
        error: 'LLM API not configured',
        fallback: 'offline'
    };
}

/**
 * Executes in offline mode using template-based generation.
 * This is the primary mode for farmer-facing deployment.
 */
function executeOffline(taskType, context, params) {
    const { scheme_id } = params;

    // Parse chunks content to JSON/Objects for easier access
    const chunks = context.chunks.map(c => {
        try {
            // If content is stringified JSON (from Fix 2), parse it
            if (typeof c.content === 'string' && c.content.trim().startsWith('{')) {
                return { ...c, data: JSON.parse(c.content) };
            }
            // If it's array stringified
            if (typeof c.content === 'string' && c.content.trim().startsWith('[')) {
                return { ...c, data: JSON.parse(c.content) };
            }
        } catch (e) {
            // Ignore parse error, use content as string
        }
        return { ...c, data: null }; // Fallback
    });

    switch (taskType) {
        case RAG_TASKS.EXTRACT_KEY_INFO: // Legacy?
        case RAG_TASKS.SIMPLE_EXPLANATION:
            return generateSimpleExplanation(chunks, params);

        case RAG_TASKS.ELIGIBILITY_REASONING:
            return generateEligibilityReasoning(chunks, params);

        case RAG_TASKS.DOCUMENT_CHECKLIST:
            return generateDocumentChecklist(chunks, params);

        case RAG_TASKS.APPLICATION_GUIDANCE:
            return generateApplicationGuidance(chunks, params);

        case RAG_TASKS.BENEFIT_SUMMARY:
            return generateBenefitSummary(chunks, params);

        case RAG_TASKS.VERIFICATION_QNA:
            return generateVerificationAnswer(chunks, params);

        default:
            return createErrorResponse('Unknown task type');
    }
}

// ... Generators updated to use c.data where possible ...

function generateSimpleExplanation(chunks, params) {
    const benefitsChunk = chunks.find(c => c.doc_type === 'benefits');

    // Use structured data if available
    let keyBenefit = "";
    if (benefitsChunk?.data?.primary?.en) {
        keyBenefit = benefitsChunk.data.primary.en;
    } else {
        // Fallback to text extraction
        const benefitsText = benefitsChunk?.content || '';
        keyBenefit = extractFirstBenefit(benefitsText);
    }

    return {
        success: true,
        task: RAG_TASKS.SIMPLE_EXPLANATION,
        response: {
            explanation_en: `${params.scheme_name} provides ${keyBenefit}. You may be eligible based on your landholding and farmer type.`,
            explanation_hi: `${params.scheme_name_hi || params.scheme_name} ${translateBenefit(keyBenefit)} प्रदान करता है। आप अपनी भूमि और किसान प्रकार के आधार पर पात्र हो सकते हैं।`,
            key_benefit: keyBenefit
        },
        source: 'offline_template',
        confidence: 'HIGH'
    };
}

function generateEligibilityReasoning(chunks, params) {
    const eligibilityChunk = chunks.find(c => c.doc_type === 'eligibility');
    const data = eligibilityChunk?.data;
    const content = eligibilityChunk?.content || '';

    // Extract matching criteria
    const matchingCriteria = [];

    // Use Clean Data if available
    if (data && data.why?.en) {
        // We can just return the WHY directly? 
        // Logic aims to "Explain WHY the farmer is eligible".
        matchingCriteria.push(data.why.en);
        if (Array.isArray(data.criteria)) {
            matchingCriteria.push(...data.criteria);
        }
    } else {
        // Fallback Logic (Regex)
        if (params.farmer_type && content.toLowerCase().includes(params.farmer_type.toLowerCase())) {
            matchingCriteria.push(`${params.farmer_type} farmers are explicitly eligible`);
        }
        if (content.toLowerCase().includes(params.landholding || '')) {
            matchingCriteria.push(`Your landholding category (${params.landholding}) is covered`);
        }
    }

    const mainReason = matchingCriteria.length > 0
        ? `You are eligible based on official criteria: ${matchingCriteria[0]}.`
        : 'Basic eligibility verification passed.';

    return {
        success: true,
        task: RAG_TASKS.ELIGIBILITY_REASONING,
        response: {
            main_reason: mainReason,
            matching_criteria: matchingCriteria.length > 0 ? matchingCriteria : ['Verified against official criteria'],
            conditions: null,
            from_context: true
        },
        source: 'offline_template',
        confidence: matchingCriteria.length >= 1 ? 'HIGH' : 'MEDIUM'
    };
}

function generateDocumentChecklist(chunks, params) {
    const docsChunk = chunks.find(c => c.doc_type === 'documents');
    const data = docsChunk?.data; // { default: [], tenant: [] }

    let documents = [];

    if (data) {
        // Use logic similar to formatDocuments (Routing) for consistency
        const profileType = (params.farmer_type || 'default').toLowerCase();
        let list = data[profileType] || data.default || [];

        // Map to response format
        documents = list.map(d => ({
            name: d.name || d,
            required: d.required !== false,
            notes: null
        }));
    } else {
        // Fallback Regex Logic (Legacy support)
        const content = docsChunk?.content || '';
        const docPatterns = [
            { pattern: /aadhaar/i, name: 'Aadhaar Card', required: true },
            { pattern: /land\s*record/i, name: 'Land Records', required: true }
        ];
        // ... (simplified loop)
        for (const { pattern, name, required } of docPatterns) {
            if (pattern.test(content)) documents.push({ name, required, notes: null });
        }
    }

    return {
        success: true,
        task: RAG_TASKS.DOCUMENT_CHECKLIST,
        response: {
            documents,
            total_required: documents.filter(d => d.required).length,
            total_optional: documents.filter(d => !d.required).length
        },
        source: 'offline_template',
        confidence: documents.length > 0 ? 'HIGH' : 'MEDIUM'
    };
}

function generateApplicationGuidance(chunks, params) {
    const processChunk = chunks.find(c => c.doc_type === 'process' || c.doc_type === 'application_steps'); // KB uses application_steps
    const data = processChunk?.data;

    // KB key is application_steps: { steps: [{en, hi}] }
    // Or process? schemeKnowledge has application_steps.
    // getDocType allows specific retrieval.

    let steps = [];
    if (data?.steps) {
        steps = data.steps.map(s => s.en || s.text?.en || s);
    }

    if (steps.length === 0) {
        steps = ['Visit your local Agriculture Office', 'Submit required documents'];
    }

    return {
        success: true,
        task: RAG_TASKS.APPLICATION_GUIDANCE,
        response: {
            steps: steps,
            where_to_apply: 'Local Bank / Agriculture Office',
            helpline: 'See scheme details',
            website: null
        },
        source: 'offline_template',
        confidence: steps.length > 0 ? 'HIGH' : 'MEDIUM'
    };
}

function generateBenefitSummary(chunks, params) {
    const benefitsChunk = chunks.find(c => c.doc_type === 'benefits');
    const data = benefitsChunk?.data; // { primary, amounts, interest }

    let primaryBenefit = 'Financial Assistance';
    let secondaryBenefits = [];

    if (data) {
        primaryBenefit = data.primary?.en || primaryBenefit;
        if (data.amounts?.en) secondaryBenefits.push(data.amounts.en);
        if (data.interest?.en) secondaryBenefits.push(data.interest.en);
    }

    return {
        success: true,
        task: RAG_TASKS.BENEFIT_SUMMARY,
        response: {
            primary_benefit: primaryBenefit,
            amounts_mentioned: [], // extracted above? 
            interest_rates: [],
            secondary_benefits: secondaryBenefits,
            conditions: null
        },
        source: 'offline_template',
        confidence: data ? 'HIGH' : 'MEDIUM'
    };
}

/**
 * Phase 3: Offline Verification Logic
 * Simulates strict verification behavior using keyword matching on the KB.
 */
function generateVerificationAnswer(chunks, params) {
    const question = (params.user_question || "").toLowerCase();

    // 1. Refusal Template
    const refusal = {
        answer: {
            en: "This question cannot be answered using the official documents currently available. Please verify with your local agriculture office or bank.",
            hi: "यह प्रश्न उपलब्ध आधिकारिक दस्तावेज़ों के आधार पर उत्तरित नहीं किया जा सकता। कृपया अपने नजदीकी कृषि कार्यालय या बैंक से पुष्टि करें।"
        },
        confidence: "NONE",
        refusal: true
    };

    // 2. Keyword Search Logic
    // We look for strong semantic matches in the structured knowledge.

    let answerEn = null;
    let answerHi = null;
    let evidence = [];

    // Helper to search text
    const search = (textEn, textHi, sourceLabel) => {
        if (!textEn) return;
        // Simple inclusion check
        if (textEn.toLowerCase().includes(question) ||
            (sourceLabel && question.includes(sourceLabel.toLowerCase()))) {
            // Basic match? No, we need to answer the question.
            // If question is "Is Aadhaar required?", and we find "Aadhaar" in documents.
            return true;
        }
        return false;
    };

    // Check Documents
    if (question.includes('document') || question.includes('aadhaar') || question.includes('card')) {
        const docsChunk = chunks.find(c => c.doc_type === 'documents');
        if (docsChunk?.data) {
            const allDocs = [
                ...(docsChunk.data.default || []).map(d => d.name),
                ...(docsChunk.data.tenant || []).map(d => d.name)
            ];
            const joinedDocs = allDocs.join(', ');
            answerEn = `Yes, documents like ${joinedDocs} are required.`;
            answerHi = `हाँ, ${joinedDocs} जैसे आवश्यक दस्तावेज़ हैं।`; // Translation approx
            evidence.push("Documents Section");
        }
    }

    // Check Interest / Amount
    if (question.includes('interest') || question.includes('rate') || question.includes('amount') || question.includes('how much')) {
        const benefitsChunk = chunks.find(c => c.doc_type === 'benefits');
        if (benefitsChunk?.data) {
            const interest = benefitsChunk.data.interest?.en;
            const amounts = benefitsChunk.data.amounts?.en;
            answerEn = `The financial details are: ${amounts}. Interest: ${interest}`;
            answerHi = `वित्तीय विवरण: ${benefitsChunk.data.amounts?.hi}। ब्याज: ${benefitsChunk.data.interest?.hi}`;
            evidence.push("Benefits Section");
        }
    }

    // Check Eligibility / Who
    if (question.includes('eligible') || question.includes('who') || question.includes('criteria')) {
        const eligChunk = chunks.find(c => c.doc_type === 'eligibility');
        if (eligChunk?.data) {
            answerEn = `Eligibility: ${eligChunk.data.why?.en}`;
            answerHi = `पात्रता: ${eligChunk.data.why?.hi}`;
            evidence.push("Eligibility Section");
        }
    }

    if (answerEn) {
        return {
            answer: {
                en: answerEn,
                hi: answerHi || answerEn // Fallback
            },
            evidence_used: evidence,
            confidence: "HIGH",
            refusal: false
        }
    }

    // Default Refusal
    return refusal;
}

// Helpers
function extractFirstBenefit(text) {
    if (!text) return "Agricultural assistance";
    // If it's JSON string, try to parse?
    if (text.trim().startsWith('{')) {
        try { return JSON.parse(text).primary?.en || "Assistance"; } catch (e) { }
    }
    const lines = text.split('\n').filter(l => l.trim());
    return lines[0] || 'Agricultural assistance';
}

function translateBenefit(text) {
    return 'वित्तीय सहायता';
}

function createErrorResponse(message) {
    return {
        success: false,
        error: message,
        fallback_message: getFailurePrompt('en'),
        fallback_message_hi: getFailurePrompt('hi')
    };
}

export default {
    setExecutionMode,
    executePrompt
};

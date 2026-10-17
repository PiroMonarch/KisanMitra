/**
 * Prompt Templates
 * 
 * Task-specific prompts for RAG explanation generation.
 * Each prompt is designed for a specific task with strict grounding rules.
 * 
 * CRITICAL RULES (embedded in every prompt):
 * 1. Only use information from provided context
 * 2. Never invent or assume information
 * 3. If information is missing, say so explicitly
 * 4. Keep language simple (farmer-friendly)
 */

import { RAG_TASKS, RAG_CONFIG } from '../config/ragConfig.js';

/**
 * System prompt for all RAG tasks.
 * Establishes ground rules for the LLM.
 */
export const SYSTEM_PROMPT = `You are a helpful agricultural scheme assistant for Indian farmers.

STRICT RULES YOU MUST FOLLOW:
1. ONLY use information from the provided CONTEXT. Do not use any external knowledge.
2. If the CONTEXT does not contain the answer, say: "This information is not available in my records."
3. Use simple language. Avoid legal or technical jargon.
4. Be concise. Farmers prefer short, actionable answers.
5. When mentioning amounts, always include ₹ symbol.
6. Never provide legal advice. Suggest consulting officials for complex cases.
7. If you are uncertain, express uncertainty clearly.

You are explaining schemes, not deciding eligibility. Phase 1 has already determined eligibility.`;

/**
 * Task-specific prompt templates.
 */
export const PROMPT_TEMPLATES = {
    /**
     * Simple scheme explanation for farmers.
     */
    [RAG_TASKS.SIMPLE_EXPLANATION]: {
        template: `Based on the following CONTEXT, explain this scheme simply for a farmer.

CONTEXT:
{context}

FARMER PROFILE:
- Landholding: {landholding}
- Farmer Type: {farmer_type}
- State: {state}
- Purpose: {purpose}

TASK: Explain the scheme "{scheme_name}" in simple terms.

RULES:
- Use 3-4 short sentences maximum
- Mention the main benefit first
- Include any amounts or percentages
- If writing in Hindi, use simple conversational Hindi

Provide the explanation in both English and Hindi.`,

        outputFormat: {
            explanation_en: 'string',
            explanation_hi: 'string',
            key_benefit: 'string'
        }
    },

    /**
     * Eligibility reasoning - explains WHY the farmer is eligible.
     */
    [RAG_TASKS.ELIGIBILITY_REASONING]: {
        template: `Based on the following CONTEXT, explain why this farmer is eligible for the scheme.

CONTEXT:
{context}

FARMER PROFILE:
- State: {state}
- Landholding: {landholding}
- Farmer Type: {farmer_type}
- Purpose: {purpose}
- Crop: {crop}

SCHEME: {scheme_name}
PHASE 1 ELIGIBILITY RESULT: {eligibility_status} (This is already decided. Do not change it.)

TASK: Explain in simple terms why this farmer qualifies for the scheme.

RULES:
- Reference specific eligibility criteria from CONTEXT
- Match farmer's profile to the criteria
- If any criteria is unclear in CONTEXT, say so
- Do NOT invent eligibility rules

Format your response as:
1. Main reason for eligibility (1 sentence)
2. Matching criteria (bullet points)
3. Any conditions or notes`,

        outputFormat: {
            main_reason: 'string',
            matching_criteria: 'array',
            conditions: 'string|null'
        }
    },

    /**
     * Document checklist generation.
     */
    [RAG_TASKS.DOCUMENT_CHECKLIST]: {
        template: `Based on the following CONTEXT, create a document checklist for this farmer.

CONTEXT:
{context}

FARMER PROFILE:
- Farmer Type: {farmer_type}
- Landholding: {landholding}

SCHEME: {scheme_name}

TASK: List all documents the farmer needs to collect.

RULES:
- Only list documents mentioned in CONTEXT
- Mark each as "Required" or "If applicable"
- For tenant farmers, include additional tenant-specific documents
- Keep descriptions brief (2-3 words max)

Format as a numbered list with checkboxes.`,

        outputFormat: {
            documents: [
                {
                    name: 'string',
                    required: 'boolean',
                    notes: 'string|null'
                }
            ]
        }
    },

    /**
     * Application process guidance.
     */
    [RAG_TASKS.APPLICATION_GUIDANCE]: {
        template: `Based on the following CONTEXT, guide this farmer on how to apply.

CONTEXT:
{context}

FARMER PROFILE:
- State: {state}

SCHEME: {scheme_name}

TASK: Provide step-by-step application guidance.

RULES:
- Maximum 5 steps
- Each step should be one action
- Include WHERE to apply (bank, office, website)
- Include helpline numbers if mentioned in CONTEXT
- If online/offline options exist, mention both

Format as numbered steps, starting with the first action.`,

        outputFormat: {
            steps: ['string'],
            where_to_apply: 'string',
            helpline: 'string|null',
            website: 'string|null'
        }
    },

    /**
     * Benefit summary with amounts.
     */
    [RAG_TASKS.BENEFIT_SUMMARY]: {
        template: `Based on the following CONTEXT, summarize the benefits for this farmer.

CONTEXT:
{context}

FARMER PROFILE:
- Landholding: {landholding}
- Purpose: {purpose}

SCHEME: {scheme_name}

TASK: Summarize what the farmer will get from this scheme.

RULES:
- Lead with monetary benefits (amount, subsidy %)
- Mention any interest rate benefits
- Include non-monetary benefits briefly
- Be specific with numbers from CONTEXT only
- If amount varies, give the range

Format as:
- Primary benefit (with amount)
- Secondary benefits (bullet points)
- Any conditions`,

        outputFormat: {
            primary_benefit: 'string',
            secondary_benefits: ['string'],
            conditions: 'string|null'
        }
    },
    /**
     * Phase 3: Verification-Bound Q&A
     */
    [RAG_TASKS.VERIFICATION_QNA]: {
        template: `You are KisanMitr Phase 3, a read-only, verification-bound assistant.
Your job is to answer follow-up questions about the scheme "{scheme_name}" ONLY if the answer is explicitly supported by the provided CONTEXT.

CONTEXT (Verified Government Documents):
{context}

USER QUESTION: {user_question}

STRICT RULES:
1. Answerability Check: Can this be answered using ONLY the provided CONTEXT? If NO, refuse.
2. Scope Check: Do NOT make new eligibility decisions, predictions, or advice. If violated, refuse.
3. Evidence Match: Quote or paraphrase only explicitly stated facts. Do not inference.

REFUSAL FORMAT (If answer not in context):
{
  "answer": {
    "en": "This question cannot be answered using the official documents currently available. Please verify with your local agriculture office or bank.",
    "hi": "यह प्रश्न उपलब्ध आधिकारिक दस्तावेज़ों के आधार पर उत्तरित नहीं किया जा सकता। कृपया अपने नजदीकी कृषि कार्यालय या बैंक से पुष्टि करें।"
  },
  "confidence": "NONE",
  "refusal": true
}

SUCCESS FORMAT (If answerable):
{
  "answer": {
    "en": "<fact-based answer grounded strictly in documents>",
    "hi": "<same answer in Hindi>"
  },
  "evidence_used": ["<excerpt from context>"],
  "confidence": "HIGH",
  "refusal": false
}

Provide ONLY the JSON response.`,

        outputFormat: {
            answer: { en: 'string', hi: 'string' },
            evidence_used: ['string'],
            confidence: 'string',
            refusal: 'boolean'
        }
    }
};

/**
 * Gets the appropriate prompt for a task.
 * 
 * @param {string} taskType - Type of RAG task
 * @returns {Object} Prompt template and metadata
 */
export function getPromptTemplate(taskType) {
    const template = PROMPT_TEMPLATES[taskType];

    if (!template) {
        throw new Error(`Unknown task type: ${taskType}`);
    }

    return {
        systemPrompt: SYSTEM_PROMPT,
        ...template
    };
}

/**
 * Fills a prompt template with actual values.
 * 
 * @param {string} taskType - Type of RAG task
 * @param {Object} context - Retrieved context
 * @param {Object} params - Parameters to fill
 * @returns {string} Filled prompt
 */
export function fillPromptTemplate(taskType, context, params) {
    const { template } = getPromptTemplate(taskType);
    let filledPrompt = template;

    // Replace context placeholder
    const contextText = context.chunks
        .map(c => `[${c.doc_type.toUpperCase()}]\n${c.content}`)
        .join('\n\n---\n\n');

    filledPrompt = filledPrompt.replace('{context}', contextText);

    // Replace all parameter placeholders
    for (const [key, value] of Object.entries(params)) {
        const placeholder = `{${key}}`;
        filledPrompt = filledPrompt.replace(new RegExp(placeholder, 'g'), value || 'Not specified');
    }

    return filledPrompt;
}

/**
 * Gets the failure prompt when context is insufficient.
 */
export function getFailurePrompt(language = 'en') {
    const messages = RAG_CONFIG.failureMessages.noContext;
    return messages[language] || messages.en;
}

export default {
    SYSTEM_PROMPT,
    PROMPT_TEMPLATES,
    getPromptTemplate,
    fillPromptTemplate,
    getFailurePrompt
};

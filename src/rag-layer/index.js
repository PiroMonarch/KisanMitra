/**
 * RAG Knowledge Layer - Main Entry Point
 * 
 * Provides AI-assisted explanations for Phase 1 eligibility results.
 */

import { RAG_CONFIG, RAG_TASKS } from './config/ragConfig.js';
import { buildQuery } from './retrieval/queryBuilder.js';
import { retrieveContext, hasKnowledge } from './retrieval/retriever.js';
import { performSourceAwareRetrieval } from './retrieval/sourceAwareHandler.js';
import { executePrompt, setExecutionMode } from './prompts/promptExecutor.js';
import { formatSchemeExplanation, formatForCard } from './output/outputFormatter.js';
import { normalizeRagOutput } from './output/outputNormalizer.js';
import { SCHEME_KNOWLEDGE } from './data/schemeKnowledge.js';
import { validateKnowledgeBase } from './guardrails/kbValidator.js';
import { enforceKnowledgeGuardrail } from './guardrails/knowledgeGuardrail.js';
import ragRoutes from "./routes/rag.routes.js";

app.use("/api", ragRoutes);

// Anti-Hallucination Threshold (Fix 10)
const MIN_CONTEXT_THRESHOLD = 20;

/**
 * RAG Layer Controller
 * Main interface for Phase 2 functionality.
 */
class RAGLayerController {
    constructor() {
        this.initialized = false;
        this.mode = 'offline';
    }

    /**
     * Initializes the RAG layer.
     */
    initialize(options = {}) {
        // Fix 1: KB Schema Validation at Startup
        try {
            validateKnowledgeBase();
        } catch (e) {
            console.error(e.message);
            // In dev environment, we might throw. For now log critical error.
            if (process.env.NODE_ENV === 'test') throw e;
        }

        if (options.mode) {
            this.mode = options.mode;
        }

        if (options.apiKey) {
            setExecutionMode('online', options.apiKey);
        } else {
            setExecutionMode('offline');
        }

        this.initialized = true;

        return {
            initialized: true,
            mode: this.mode,
            knowledgeBaseSchemes: Object.keys(SCHEME_KNOWLEDGE),
            version: RAG_CONFIG.vectorStore.name
        };
    }

    /**
     * Explains a single scheme for a farmer.
     */
    async explainScheme(scheme, profile) {
        const schemeId = scheme.scheme_id;

        // Check if we have knowledge for this scheme
        if (!hasKnowledge(schemeId)) {
            const fallback = this.createNoKnowledgeResponse(schemeId, scheme);
            return normalizePhase2Output(normalizeRagOutput(fallback, 'en'));
        }

        // Build context parameters
        const contextParams = {
            scheme_id: schemeId,
            scheme_name: scheme.name,
            scheme_name_hi: scheme.name_hi,
            ...profile
        };

        // Execute all RAG tasks (Parallel execution for speed?)
        // Sequential for now to debug.
        const taskResults = {};

        // 1. Simple Explanation
        taskResults.explanation = await this.executeTask(
            RAG_TASKS.SIMPLE_EXPLANATION,
            schemeId,
            contextParams
        );

        // 2. Eligibility Reasoning
        taskResults.eligibility = await this.executeTask(
            RAG_TASKS.ELIGIBILITY_REASONING,
            schemeId,
            { ...contextParams, eligibility_status: scheme.confidence }
        );

        // 3. Document Checklist
        taskResults.documents = await this.executeTask(
            RAG_TASKS.DOCUMENT_CHECKLIST,
            schemeId,
            contextParams
        );

        // 4. Application Guidance
        taskResults.guidance = await this.executeTask(
            RAG_TASKS.APPLICATION_GUIDANCE,
            schemeId,
            contextParams
        );

        // 5. Benefits Summary
        taskResults.benefits = await this.executeTask(
            RAG_TASKS.BENEFIT_SUMMARY,
            schemeId,
            contextParams
        );

        // Format the complete explanation
        const rawExplanation = formatSchemeExplanation(schemeId, scheme, taskResults, contextParams);

        // Normalization Pass
        const normalizedExplanation = normalizeRagOutput(rawExplanation, 'en');

        // Final Guardrail
        return normalizePhase2Output(normalizedExplanation);
    }

    /**
     * Explains multiple schemes (batch processing).
     */
    async explainSchemes(schemes, profile) {
        const results = [];
        for (const scheme of schemes) {
            const explanation = await this.explainScheme(scheme, profile);
            results.push({ scheme: scheme, explanation: explanation });
        }

        // Apply Batch Explain Fix 9 (Preserve Name) and Fix 4 logic
        const explanations = results.map(r => {
            const kb = SCHEME_KNOWLEDGE[r.scheme.scheme_id];

            // Fix 9: Always pull scheme name from Phase-1 input first (r.scheme.name)
            const name = r.scheme.name || kb?.name?.en || r.scheme.scheme_id;

            // Extract key benefit safely
            const keyBenefit = kb?.benefits?.primary?.en || "Government support scheme";

            const result = {
                ...r.explanation,
                scheme_name: name,
                keyBenefit: keyBenefit,
                confidence: r.scheme.confidence // Keep Phase 1 confidence for Batch
            };
            return result;
        });

        return {
            profile,
            explanations,
            total_explained: explanations.filter(e => e.success !== false).length,
            generated_at: Date.now()
        };
    }

    /**
     * Phase 3: Answer follow-up question (Verification-Bound).
     */
    async answerFollowUp(schemeId, question, profile = {}) {
        return this.executeTask(
            RAG_TASKS.VERIFICATION_QNA,
            schemeId,
            {
                scheme_id: schemeId,
                user_question: question,
                ...profile
            }
        );
    }

    async getDocumentChecklist(schemeId, farmerContext = {}) {
        return this.executeTask(
            RAG_TASKS.DOCUMENT_CHECKLIST,
            schemeId,
            { scheme_id: schemeId, ...farmerContext }
        );
    }

    async getApplicationGuidance(schemeId, farmerContext = {}) {
        return this.executeTask(
            RAG_TASKS.APPLICATION_GUIDANCE,
            schemeId,
            { scheme_id: schemeId, ...farmerContext }
        );
    }

    /**
     * Executes a single RAG task with full hardening or falls back.
     */
    async executeTask(taskType, schemeId, params) {
        try {
            const query = buildQuery(schemeId, taskType, params);
            const rawContext = retrieveContext(query);

            // Fix 10: Anti-Hallucination Assertion
            // Check if we got meaningful context
            const totalLen = rawContext.metadata?.total_length || 0;
            if (!rawContext.success || totalLen < MIN_CONTEXT_THRESHOLD) {
                // Return empty success=false result to trigger fallback
                return {
                    success: false,
                    task: taskType,
                    error: "INSUFFICIENT_CONTEXT",
                    fallback_message: "Verified context unavailable."
                };
            }

            const context = performSourceAwareRetrieval(rawContext);
            const guardrailResult = enforceKnowledgeGuardrail(context, taskType);

            if (!guardrailResult.proceed) {
                return {
                    success: false,
                    task: taskType,
                    error: guardrailResult.fallback_reason,
                    fallback_message: guardrailResult.fallback_response.simple_explanation
                };
            }

            const result = await executePrompt(taskType, context, params);

            if (context._source_analysis) {
                result._source_analysis = context._source_analysis;
            }

            return result;

        } catch (error) {
            console.error(`RAG task ${taskType} failed for ${schemeId}:`, error);
            return {
                success: false,
                task: taskType,
                error: error.message
            };
        }
    }

    /**
     * Fix 8: Refined Fallback Response (Explicit Refusal)
     */
    createNoKnowledgeResponse(schemeId, scheme) {
        return {
            scheme_id: schemeId,
            scheme_name: scheme.name,
            success: false,
            simple_explanation: {
                en: "This system does not have verified government documents for this scheme. We do not generate unverified explanations.",
                hi: "इस योजना के लिए आधिकारिक सरकारी दस्तावेज़ उपलब्ध नहीं हैं। हम अनुमान आधारित जानकारी नहीं देते।"
            },
            eligibility_reason: {
                reason: 'Verification unavailable.',
                criteria: []
            },
            documents_required: {
                list: [],
                total: 0
            },
            application_steps: {
                steps: ['Contact local agriculture office.'],
                where: 'Local Office'
            },
            overall_confidence: 'NONE',
            requires_disclaimer: true,
            disclaimer: {
                en: 'Detailed information not available in our records.',
                hi: 'विस्तृत जानकारी हमारे रिकॉर्ड में उपलब्ध नहीं है।'
            }
        };
    }

    hasSchemeKnowledge(schemeId) {
        return hasKnowledge(schemeId);
    }
}

/**
 * Strict Phase 2 Output Normalizer.
 * Guarantees that no incomplete objects escape, but allows rich Multi-lingual structures where permitted.
 */
function normalizePhase2Output(exp) {
    if (!exp) return {};

    return {
        scheme_id: exp.scheme_id,

        simple_explanation: {
            en: exp.simple_explanation?.en || '',
            hi: exp.simple_explanation?.hi || ''
        },

        eligibility_reason: {
            why: (exp.eligibility_reason?.why && typeof exp.eligibility_reason.why === 'object')
                ? exp.eligibility_reason.why
                : { en: exp.eligibility_reason?.why || '', hi: '' },
            criteria: Array.isArray(exp.eligibility_reason?.criteria) ? exp.eligibility_reason.criteria : []
        },

        documents_required: {
            total: exp.documents_required?.total || 0,
            list: Array.isArray(exp.documents_required?.list)
                ? exp.documents_required.list.map(d => typeof d === 'string' ? d : d?.name).filter(Boolean)
                : []
        },

        application_steps: {
            steps: Array.isArray(exp.application_steps?.steps)
                ? exp.application_steps.steps.map(s => {
                    if (s?.text) return s;
                    if (s?.en || s?.hi) return s; // Fix: Accept direct {en, hi} objects (User Schema)
                    if (typeof s === 'string') return { en: s, hi: s }; // Promote string
                    return null;
                }).filter(Boolean)
                : [],
            where: exp.application_steps?.where || ''
        },

        benefits_summary: {
            primary: exp.benefits_summary?.primary || '',
            amounts: Array.isArray(exp.benefits_summary?.amounts)
                ? exp.benefits_summary.amounts
                : [],
            interest: exp.benefits_summary?.interest || ''
        },

        contacts: exp.contacts || null,
        overall_confidence: exp.overall_confidence || 'MEDIUM',
        requires_disclaimer: !!exp.requires_disclaimer,
        disclaimer: exp.disclaimer || null
    };
}

const ragLayer = new RAGLayerController();

export { ragLayer, RAGLayerController };
export { RAG_TASKS, RAG_CONFIG };
export default ragLayer;

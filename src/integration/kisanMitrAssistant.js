/**
 * Phase 1 + Phase 2 Integration
 * 
 * This module demonstrates how the RAG layer (Phase 2)
 * integrates with the eligibility engine (Phase 1).
 * 
 * FLOW:
 * 1. Phase 1 determines eligibility (AUTHORITATIVE)
 * 2. Phase 2 explains results (INFORMATIVE)
 * 3. Combined output sent to UI
 */

import { loanAssistant } from '../loan-assistant/index.js';
import ragLayer from '../rag-layer/index.js';

/**
 * KisanMitr Combined Assistant
 * 
 * Orchestrates both Phase 1 (eligibility) and Phase 2 (explanation).
 */
class KisanMitrAssistant {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initializes both layers.
     */
    initialize(options = {}) {
        // Initialize Phase 1
        loanAssistant.initialize(true);

        // Initialize Phase 2 (RAG)
        const ragStatus = ragLayer.initialize({
            mode: options.ragMode || 'offline',
            apiKey: options.apiKey || null
        });

        this.initialized = true;

        return {
            phase1: { ready: true, module: 'loan-assistant' },
            phase2: ragStatus,
            combined: true
        };
    }

    /**
     * Complete flow: Intent → Questions → Eligibility → Explanation
     * 
     * This is the main method that the UI should call.
     * 
     * @param {string} intent - AGRI_LOAN or GOV_SCHEME
     * @param {Object} profile - Complete farmer profile
     * @param {Object} options - Additional options
     * @returns {Object} Complete result with eligibility and explanations
     */
    async processRequest(intent, profile, options = {}) {
        const startTime = Date.now();

        // ══════════════════════════════════════════════════════════
        // PHASE 1: ELIGIBILITY (Deterministic, Authoritative)
        // ══════════════════════════════════════════════════════════

        // Set intent
        loanAssistant.setIntentFromButton(intent);

        // Set profile answers
        for (const [key, value] of Object.entries(profile)) {
            loanAssistant.answerQuestion(key, value);
        }

        // Get Phase 1 results
        const eligibilityResults = loanAssistant.findEligibleSchemes();

        // ══════════════════════════════════════════════════════════
        // PHASE 2: EXPLANATION (RAG, Informative)
        // ══════════════════════════════════════════════════════════

        let explanations = null;
        let ragEnabled = options.includeExplanations !== false;

        if (ragEnabled && eligibilityResults.eligible_schemes.length > 0) {
            // Get RAG explanations for top schemes
            const schemesToExplain = options.explainTop
                ? eligibilityResults.eligible_schemes.slice(0, options.explainTop)
                : eligibilityResults.eligible_schemes;

            explanations = await ragLayer.explainSchemes(
                schemesToExplain,
                profile
            );
        }

        // ══════════════════════════════════════════════════════════
        // COMBINED OUTPUT
        // ══════════════════════════════════════════════════════════

        const result = {
            // Meta
            intent,
            profile,
            processed_at: Date.now(),
            processing_time_ms: Date.now() - startTime,

            // Phase 1 Results (AUTHORITATIVE)
            eligibility: {
                total_matches: eligibilityResults.total_matches,
                high_confidence: eligibilityResults.high_confidence_count,
                medium_confidence: eligibilityResults.medium_confidence_count,
                schemes: eligibilityResults.eligible_schemes.map(scheme => ({
                    scheme_id: scheme.scheme_id,
                    name: scheme.name,
                    confidence: scheme.confidence,
                    score: scheme.score,
                    documents: scheme.documents,
                    // Mark as "from Phase 1"
                    source: 'phase1_eligibility'
                }))
            },

            // Phase 2 Explanations (INFORMATIVE)
            explanations: explanations ? {
                total_explained: explanations.total_explained,
                details: explanations.explanations.map(exp => ({
                    scheme_id: exp.scheme_id,
                    simple_explanation: exp.simple_explanation,
                    eligibility_reason: exp.eligibility_reason,
                    documents_required: exp.documents_required,
                    application_steps: exp.application_steps,
                    benefits_summary: exp.benefits_summary,
                    contacts: exp.contacts,
                    confidence: exp.overall_confidence,
                    requires_disclaimer: exp.requires_disclaimer,
                    // Mark as "from Phase 2"
                    source: 'phase2_rag'
                })),
                generated_at: explanations.generated_at
            } : null,

            // Combined view for UI
            combined_results: this.createCombinedView(
                eligibilityResults.eligible_schemes,
                explanations?.explanations || []
            ),

            // Disclaimers
            system_notes: {
                eligibility_source: 'Determined by rule-based Phase 1 engine',
                explanation_source: ragEnabled
                    ? 'Generated by Phase 2 RAG from official documents'
                    : 'RAG explanations disabled',
                verification_note: 'Please verify details with local authorities'
            }
        };

        return result;
    }

    /**
     * Creates a combined view merging Phase 1 and Phase 2 data.
     */
    createCombinedView(eligibleSchemes, explanations) {
        const explanationMap = new Map(
            explanations.map(e => [e.scheme_id, e])
        );

        return eligibleSchemes.map(scheme => {
            const explanation = explanationMap.get(scheme.scheme_id);

            return {
                // Core identity
                scheme_id: scheme.scheme_id,
                name: scheme.name,
                name_hi: scheme.name_hi,

                // Phase 1: Eligibility (AUTHORITATIVE)
                eligibility_confidence: scheme.confidence,
                eligibility_score: scheme.score,

                // Phase 2: Explanation (INFORMATIVE)
                has_explanation: !!explanation,
                explanation: explanation ? {
                    summary_en: explanation.simple_explanation?.en,
                    summary_hi: explanation.simple_explanation?.hi,
                    why_eligible: explanation.eligibility_reason?.reason,
                    documents: explanation.documents_required?.list,
                    first_step: explanation.application_steps?.steps?.[0],
                    helpline: explanation.contacts?.helpline,
                    key_benefit: explanation.benefits_summary?.primary
                } : null,

                // Action items
                documents_count: explanation?.documents_required?.total || scheme.documents?.length || 0,

                // Warnings
                show_disclaimer: explanation?.requires_disclaimer || false
            };
        });
    }

    /**
     * Quick method: Just get document checklist for a scheme.
     */
    async getQuickDocumentList(schemeId, farmerType = 'owner') {
        return ragLayer.getDocumentChecklist(schemeId, { farmer_type: farmerType });
    }

    /**
     * Quick method: Get application guidance.
     */
    async getApplicationHelp(schemeId, state = null) {
        return ragLayer.getApplicationGuidance(schemeId, { state });
    }

    /**
     * Reset the assistant for new query.
     */
    reset() {
        loanAssistant.reset();
    }
}

// Create singleton instance
const kisanMitr = new KisanMitrAssistant();

export { kisanMitr, KisanMitrAssistant };
export default kisanMitr;


// ═══════════════════════════════════════════════════════════════
// EXAMPLE USAGE
// ═══════════════════════════════════════════════════════════════

/*
import { kisanMitr } from './integration/kisanMitrAssistant.js';

// Initialize
kisanMitr.initialize();

// Process a request
const result = await kisanMitr.processRequest(
    'AGRI_LOAN',
    {
        state: 'UP',
        landholding: 'marginal',
        crop: 'wheat',
        purpose: 'seeds',
        farmer_type: 'owner',
        repayment: 'post-harvest'
    },
    { includeExplanations: true, explainTop: 3 }
);

// Access Phase 1 results (AUTHORITATIVE)
console.log('Eligible schemes:', result.eligibility.schemes);

// Access Phase 2 explanations (INFORMATIVE)
console.log('Explanations:', result.explanations.details);

// Use combined view for UI
console.log('Combined:', result.combined_results);
*/

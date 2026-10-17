/**
 * KB Validator
 * 
 * Enforces strict schema compliance for the Knowledge Base.
 * Prevents runtime errors by catching schema violations at startup.
 */

import { SCHEME_KNOWLEDGE } from '../data/schemeKnowledge.js';

export function validateKnowledgeBase() {
    const errors = [];

    Object.values(SCHEME_KNOWLEDGE).forEach(scheme => {
        const id = scheme.scheme_id;

        // 1. Eligibility
        if (!scheme.eligibility?.why?.en || !scheme.eligibility?.why?.hi) {
            errors.push(`${id}: Missing eligibility.why ({en, hi})`);
        }
        if (!Array.isArray(scheme.eligibility?.criteria)) {
            errors.push(`${id}: Missing eligibility.criteria array`);
        }

        // 2. Documents
        if (!Array.isArray(scheme.documents?.default)) {
            errors.push(`${id}: Missing documents.default array`);
        }
        // Tenant is optional but if present must be array, logic handled in code

        // 3. Benefits
        const bens = scheme.benefits;
        if (!bens?.primary?.en || !bens?.primary?.hi) {
            errors.push(`${id}: Missing benefits.primary ({en, hi})`);
        }
        if (!bens?.amounts?.en || !bens?.amounts?.hi) {
            errors.push(`${id}: Missing benefits.amounts ({en, hi})`);
        }
        if (!bens?.interest?.en || !bens?.interest?.hi) {
            errors.push(`${id}: Missing benefits.interest ({en, hi})`);
        }

        // 4. Steps
        if (!scheme.application_steps?.steps || !Array.isArray(scheme.application_steps.steps)) {
            errors.push(`${id}: Missing application_steps.steps array`);
        } else {
            scheme.application_steps.steps.forEach((step, i) => {
                if (!step.en || !step.hi) {
                    errors.push(`${id}: Step ${i} missing {en, hi}`);
                }
            });
        }
    });

    if (errors.length > 0) {
        console.error('KB VALIDATION FAILED:');
        errors.forEach(e => console.error(` - ${e}`));
        throw new Error(`Knowledge Base Schema Violation: ${errors.length} errors found.`);
    }

    console.log('✅ Knowledge Base Schema Verified.');
    return true;
}

/**
 * Loan Assistant Test Runner
 * 
 * Demonstrates the Phase 1 Core Guided Flow with example inputs and outputs.
 * Run with: node --experimental-json-modules src/loan-assistant/testRunner.js
 * Or import and call runTests() from browser console.
 */

// Import all modules
import intentDetector from './core/intentDetector.js';
import eligibilityFlow from './core/eligibilityFlow.js';
import schemeFilter from './core/schemeFilter.js';
import confidenceScorer from './core/confidenceScorer.js';
import outputGenerator from './core/outputGenerator.js';
import { INTENTS } from './constants/eligibilityOptions.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  KISANMITR LOAN ASSISTANT - PHASE 1 TEST RUNNER');
console.log('  Deterministic | Offline-First | Explainable');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test Case 1: Marginal farmer from UP needing seeds
console.log('📋 TEST CASE 1: Marginal farmer from UP needing seeds');
console.log('─────────────────────────────────────────────────────\n');

const testProfile1 = {
    state: 'UP',
    landholding: 'marginal',
    crop: 'wheat',
    purpose: 'seeds',
    farmer_type: 'owner',
    repayment: 'post-harvest'
};

console.log('INPUT - Eligibility Profile:');
console.log(JSON.stringify(testProfile1, null, 2));
console.log('\n');

// Step 1: Intent Detection
console.log('STEP 1: Intent Detection');
const intentResult = intentDetector.detectIntentFromButton('AGRI_LOAN');
console.log('  Intent:', intentResult.intent);
console.log('  Source:', intentResult.source);
console.log('  Valid:', intentResult.valid);
console.log('');

// Step 2: Scheme Filtering
console.log('STEP 2: Scheme Filtering');
const filterResult = schemeFilter.filterSchemes(testProfile1, INTENTS.AGRI_LOAN);
console.log('  Total schemes checked:', filterResult.totalChecked);
console.log('  Eligible schemes:', filterResult.totalEligible);
console.log('  Processing time:', filterResult.processingTimeMs + 'ms');
console.log('');

// Show filter details for each scheme
console.log('  Filter Details:');
filterResult.filterLog.forEach(log => {
    console.log(`    ${log.scheme_id}: ${log.isEligible ? '✓ ELIGIBLE' : '✗ Rejected'}`);
    if (!log.isEligible && log.failures) {
        log.failures.forEach(f => console.log(`      - ${f.check}: ${f.reason}`));
    }
});
console.log('');

// Step 3: Confidence Scoring
console.log('STEP 3: Confidence Scoring');
const scoredSchemes = confidenceScorer.scoreSchemes(filterResult.eligibleSchemes, testProfile1);
scoredSchemes.forEach(scheme => {
    console.log(`  ${scheme.scheme_id}:`);
    console.log(`    Score: ${scheme.score}/100`);
    console.log(`    Confidence: ${scheme.confidence}`);
});
console.log('');

// Step 4: Output Generation
console.log('STEP 4: Final Output');
const output = outputGenerator.generateOutput(scoredSchemes, testProfile1);
console.log('\nOUTPUT:');
console.log(JSON.stringify({
    eligible_schemes: output.eligible_schemes.map(s => ({
        scheme_id: s.scheme_id,
        confidence: s.confidence,
        documents: s.documents
    }))
}, null, 2));

console.log('\n');

// Test Case 2: Large landowner from Maharashtra for irrigation
console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 TEST CASE 2: Large landowner from Maharashtra - irrigation');
console.log('─────────────────────────────────────────────────────────────────\n');

const testProfile2 = {
    state: 'MH',
    landholding: 'large',
    crop: 'sugarcane',
    purpose: 'irrigation',
    farmer_type: 'owner',
    repayment: 'monthly'
};

console.log('INPUT - Eligibility Profile:');
console.log(JSON.stringify(testProfile2, null, 2));
console.log('');

const filterResult2 = schemeFilter.filterSchemes(testProfile2, null); // No intent filter
console.log('FILTERING (no intent filter):');
console.log('  Eligible:', filterResult2.totalEligible + '/' + filterResult2.totalChecked);

const scoredSchemes2 = confidenceScorer.scoreSchemes(filterResult2.eligibleSchemes, testProfile2);
const output2 = outputGenerator.generateOutput(scoredSchemes2, testProfile2);

console.log('\nOUTPUT:');
console.log(JSON.stringify({
    total_matches: output2.total_matches,
    high_confidence_count: output2.high_confidence_count,
    eligible_schemes: output2.eligible_schemes.map(s => ({
        scheme_id: s.scheme_id,
        name: s.name,
        confidence: s.confidence,
        highlights: s.highlights
    }))
}, null, 2));

console.log('\n');

// Test Case 3: Tenant farmer - fewer options expected
console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 TEST CASE 3: Tenant farmer from Bihar - tools');
console.log('─────────────────────────────────────────────────────────────────\n');

const testProfile3 = {
    state: 'BR',
    landholding: 'small',
    crop: 'rice',
    purpose: 'tools',
    farmer_type: 'tenant',
    repayment: 'post-harvest'
};

console.log('INPUT - Eligibility Profile:');
console.log(JSON.stringify(testProfile3, null, 2));
console.log('');

const filterResult3 = schemeFilter.filterSchemes(testProfile3, null);
console.log('FILTERING:');
console.log('  Eligible:', filterResult3.totalEligible + '/' + filterResult3.totalChecked);

if (filterResult3.eligibleSchemes.length > 0) {
    const scoredSchemes3 = confidenceScorer.scoreSchemes(filterResult3.eligibleSchemes, testProfile3);
    const output3 = outputGenerator.generateOutput(scoredSchemes3, testProfile3);
    console.log('\nOUTPUT:');
    console.log(JSON.stringify({
        eligible_schemes: output3.eligible_schemes.map(s => ({
            scheme_id: s.scheme_id,
            confidence: s.confidence
        }))
    }, null, 2));
} else {
    const noMatchOutput = outputGenerator.generateNoMatchOutput(testProfile3, filterResult3.filterLog);
    console.log('\nNO MATCH OUTPUT:');
    console.log(JSON.stringify({
        no_match_reason: noMatchOutput.no_match_reason,
        suggestions: noMatchOutput.suggestions
    }, null, 2));
}

console.log('\n');

// Test Case 4: Text-based intent detection
console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 TEST CASE 4: Text-based Intent Detection');
console.log('─────────────────────────────────────────────────────────────────\n');

const testTexts = [
    'I need a loan for farming',
    'मुझे सरकारी योजना चाहिए',  // Hindi: I need government scheme
    'kcc credit card',
    'subsidy for seeds',
    'random text with no intent'
];

testTexts.forEach(text => {
    const result = intentDetector.detectIntentFromText(text);
    console.log(`"${text}"`);
    console.log(`  → Intent: ${result.intent || 'null'} | Source: ${result.source}`);
    if (result.matched_keywords) {
        console.log(`    Keywords: ${result.matched_keywords.join(', ')}`);
    }
    console.log('');
});

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ALL TESTS COMPLETED');
console.log('═══════════════════════════════════════════════════════════════\n');

// Export for programmatic use
export function runTests() {
    console.log('Tests executed. Check console output above.');
    return {
        testProfile1,
        output1: outputGenerator.generateOutput(
            confidenceScorer.scoreSchemes(schemeFilter.filterSchemes(testProfile1, INTENTS.AGRI_LOAN).eligibleSchemes, testProfile1),
            testProfile1
        ),
        testProfile2,
        testProfile3
    };
}

export default runTests;

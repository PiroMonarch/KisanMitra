/**
 * Loan Assistant - Main Entry Point
 * 
 * Combines all modules into a cohesive API for the loan assistant.
 * This is the main interface for the UI components to interact with.
 */

import { detectIntentFromButton, detectIntentFromText, isValidIntent, getSupportedIntents } from './core/intentDetector.js';
import { createEmptyProfile, getCurrentQuestion, recordAnswer, isProfileComplete, getProgress, getProfileSummary, resetProfile, goBackToQuestion } from './core/eligibilityFlow.js';
import { filterSchemes, getAllSchemes, getSchemeById, getSchemeStoreInfo } from './core/schemeFilter.js';
import { scoreSchemes, getConfidenceLevel, getScoringWeights } from './core/confidenceScorer.js';
import { generateOutput, generateNoMatchOutput } from './core/outputGenerator.js';
import { saveProfile, loadProfile, saveResults, loadResults, saveSession, loadAllSessions, clearAllData, getStorageStats } from './storage/offlineStorage.js';
import { syncSchemes } from './storage/syncManager.js';
import { INTENTS, INTENT_LABELS, CONFIDENCE_LEVELS } from './constants/eligibilityOptions.js';

/**
 * Main Loan Assistant Controller
 * Orchestrates the complete flow from intent to results
 */
class LoanAssistantController {
    constructor() {
        this.intent = null;
        this.profile = createEmptyProfile();
        this.results = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the assistant, optionally restoring from saved state
     */
    async initialize(restoreFromStorage = true) {
        // Sync dynamic schemes from backend
        await syncSchemes();

        if (restoreFromStorage) {
            const savedProfile = loadProfile();
            if (savedProfile) {
                this.profile = savedProfile;
            }
            const savedResults = loadResults();
            if (savedResults) {
                this.results = savedResults;
            }
        }
        this.isInitialized = true;
        return { profile: this.profile, results: this.results };
    }

    /**
     * Set intent from button click
     */
    setIntentFromButton(intentType) {
        const result = detectIntentFromButton(intentType);
        if (result.valid) {
            this.intent = result.intent;
        }
        return result;
    }

    /**
     * Set intent from text input
     */
    setIntentFromText(text) {
        const result = detectIntentFromText(text);
        if (result.valid) {
            this.intent = result.intent;
        }
        return result;
    }

    /**
     * Get current question in the flow
     */
    getCurrentQuestion() {
        return getCurrentQuestion(this.profile);
    }

    /**
     * Answer the current question
     */
    answerQuestion(questionId, answer) {
        const result = recordAnswer(this.profile, questionId, answer);
        if (result.success) {
            this.profile = result.profile;
            saveProfile(this.profile);
        }
        return result;
    }

    /**
     * Get eligibility progress
     */
    getProgress() {
        return getProgress(this.profile);
    }

    /**
     * Get profile summary
     */
    getProfileSummary() {
        return getProfileSummary(this.profile);
    }

    /**
     * Run the scheme matching engine
     */
    findEligibleSchemes() {
        if (!isProfileComplete(this.profile)) {
            return { success: false, error: 'Profile incomplete', profile: this.profile };
        }

        // Step 1: Filter schemes
        const filterResult = filterSchemes(this.profile, this.intent);

        // Step 2: Score eligible schemes
        if (filterResult.eligibleSchemes.length > 0) {
            const scoredSchemes = scoreSchemes(filterResult.eligibleSchemes, this.profile);

            // Step 3: Generate output
            this.results = generateOutput(scoredSchemes, this.profile);
        } else {
            this.results = generateNoMatchOutput(this.profile, filterResult.filterLog);
        }

        // Save to storage
        saveResults(this.results);
        saveSession(this.profile, this.results);

        return this.results;
    }

    /**
     * Go back to a specific question
     */
    goBackTo(questionId) {
        this.profile = goBackToQuestion(this.profile, questionId);
        this.results = null;
        saveProfile(this.profile);
        return this.profile;
    }

    /**
     * Reset and start over
     */
    reset() {
        this.intent = null;
        this.profile = resetProfile();
        this.results = null;
        saveProfile(this.profile);
        return this.profile;
    }

    /**
     * Get current state
     */
    getState() {
        return {
            intent: this.intent,
            profile: this.profile,
            results: this.results,
            progress: getProgress(this.profile),
            isComplete: isProfileComplete(this.profile)
        };
    }

    /**
     * Get past sessions
     */
    getPastSessions() {
        return loadAllSessions();
    }

    /**
     * Load a past session
     */
    loadSession(sessionId) {
        const sessions = loadAllSessions();
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            this.profile = session.profile;
            this.results = session.results;
            return session;
        }
        return null;
    }
}

// Create singleton instance
const loanAssistant = new LoanAssistantController();

// Export controller and utilities
export { loanAssistant, LoanAssistantController };
export { INTENTS, INTENT_LABELS, CONFIDENCE_LEVELS };
export { getAllSchemes, getSchemeById, getSchemeStoreInfo };
export { clearAllData, getStorageStats };

export default loanAssistant;

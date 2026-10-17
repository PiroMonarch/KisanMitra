/**
 * Eligibility Flow Module
 * 
 * Manages the guided question flow to build an eligibility profile.
 * Exactly 6 questions in fixed order - no branching, no AI.
 * 
 * Questions:
 * 1. State
 * 2. Landholding
 * 3. Crop type
 * 4. Purpose
 * 5. Farmer type
 * 6. Repayment preference
 * 
 * Output: Structured eligibility profile
 */

import {
    QUESTIONS,
    QUESTION_ORDER,
    STATES,
    STATE_LABELS,
    LANDHOLDING,
    LANDHOLDING_LABELS,
    CROP_TYPES,
    CROP_LABELS,
    PURPOSES,
    PURPOSE_LABELS,
    FARMER_TYPES,
    FARMER_TYPE_LABELS,
    REPAYMENT_TYPES,
    REPAYMENT_LABELS
} from '../constants/eligibilityOptions.js';

/**
 * Creates a new empty eligibility profile.
 * 
 * @returns {Object} Empty eligibility profile
 */
export function createEmptyProfile() {
    return {
        state: null,
        landholding: null,
        crop: null,
        purpose: null,
        farmer_type: null,
        repayment: null
    };
}

/**
 * Gets the current question based on the profile state.
 * Returns null if all questions are answered.
 * 
 * @param {Object} profile - Current eligibility profile
 * @returns {Object|null} Current question or null if complete
 */
export function getCurrentQuestion(profile) {
    for (const questionId of QUESTION_ORDER) {
        if (profile[questionId] === null || profile[questionId] === undefined) {
            return {
                ...QUESTIONS[questionId],
                position: QUESTION_ORDER.indexOf(questionId) + 1,
                total: QUESTION_ORDER.length
            };
        }
    }
    return null; // All questions answered
}

/**
 * Validates an answer for a specific question.
 * 
 * @param {string} questionId - The question being answered
 * @param {string} answer - The provided answer
 * @returns {Object} Validation result with isValid and error
 */
export function validateAnswer(questionId, answer) {
    if (!questionId || !QUESTIONS[questionId]) {
        return { isValid: false, error: 'Invalid question' };
    }

    if (answer === null || answer === undefined || answer === '') {
        return { isValid: false, error: 'Answer is required' };
    }

    const question = QUESTIONS[questionId];
    const normalizedAnswer = String(answer).toLowerCase().trim();

    // Check if answer is in valid options
    const validOptions = question.options.map(o => String(o).toLowerCase());

    if (!validOptions.includes(normalizedAnswer)) {
        return {
            isValid: false,
            error: `Invalid answer. Valid options: ${question.options.join(', ')}`
        };
    }

    return { isValid: true, error: null };
}

/**
 * Records an answer to the current question.
 * Returns an updated profile (immutable).
 * 
 * @param {Object} profile - Current eligibility profile
 * @param {string} questionId - The question being answered
 * @param {string} answer - The provided answer
 * @returns {Object} Result with updated profile or error
 */
export function recordAnswer(profile, questionId, answer) {
    // Validate the answer
    const validation = validateAnswer(questionId, answer);
    if (!validation.isValid) {
        return {
            success: false,
            error: validation.error,
            profile: profile
        };
    }

    // Create new profile with the answer (immutable update)
    const updatedProfile = {
        ...profile,
        [questionId]: String(answer).toLowerCase().trim()
    };

    // Uppercase state codes
    if (questionId === 'state') {
        updatedProfile[questionId] = answer.toUpperCase().trim();
    }

    return {
        success: true,
        error: null,
        profile: updatedProfile,
        isComplete: isProfileComplete(updatedProfile)
    };
}

/**
 * Checks if the eligibility profile is complete.
 * 
 * @param {Object} profile - Eligibility profile to check
 * @returns {boolean} True if all questions answered
 */
export function isProfileComplete(profile) {
    for (const questionId of QUESTION_ORDER) {
        if (profile[questionId] === null || profile[questionId] === undefined) {
            return false;
        }
    }
    return true;
}

/**
 * Gets progress information for the current flow.
 * 
 * @param {Object} profile - Current eligibility profile
 * @returns {Object} Progress info with answered count and percentage
 */
export function getProgress(profile) {
    let answered = 0;
    for (const questionId of QUESTION_ORDER) {
        if (profile[questionId] !== null && profile[questionId] !== undefined) {
            answered++;
        }
    }

    return {
        answered,
        total: QUESTION_ORDER.length,
        percentage: Math.round((answered / QUESTION_ORDER.length) * 100),
        isComplete: answered === QUESTION_ORDER.length
    };
}

/**
 * Gets a human-readable summary of the profile.
 * Useful for confirmation screens.
 * 
 * @param {Object} profile - Eligibility profile
 * @returns {Object} Summary with labels for each field
 */
export function getProfileSummary(profile) {
    const summary = {};

    if (profile.state) {
        summary.state = {
            value: profile.state,
            label: STATE_LABELS[profile.state] || profile.state
        };
    }

    if (profile.landholding) {
        summary.landholding = {
            value: profile.landholding,
            label: LANDHOLDING_LABELS[profile.landholding] || profile.landholding
        };
    }

    if (profile.crop) {
        summary.crop = {
            value: profile.crop,
            label: CROP_LABELS[profile.crop] || profile.crop
        };
    }

    if (profile.purpose) {
        summary.purpose = {
            value: profile.purpose,
            label: PURPOSE_LABELS[profile.purpose] || profile.purpose
        };
    }

    if (profile.farmer_type) {
        summary.farmer_type = {
            value: profile.farmer_type,
            label: FARMER_TYPE_LABELS[profile.farmer_type] || profile.farmer_type
        };
    }

    if (profile.repayment) {
        summary.repayment = {
            value: profile.repayment,
            label: REPAYMENT_LABELS[profile.repayment] || profile.repayment
        };
    }

    return summary;
}

/**
 * Resets the profile to start over.
 * 
 * @returns {Object} Fresh empty profile
 */
export function resetProfile() {
    return createEmptyProfile();
}

/**
 * Goes back to a previous question by clearing subsequent answers.
 * 
 * @param {Object} profile - Current profile
 * @param {string} targetQuestionId - Question to go back to
 * @returns {Object} Profile with subsequent answers cleared
 */
export function goBackToQuestion(profile, targetQuestionId) {
    const targetIndex = QUESTION_ORDER.indexOf(targetQuestionId);

    if (targetIndex === -1) {
        return profile; // Invalid question, no change
    }

    const updatedProfile = { ...profile };

    // Clear this question and all subsequent ones
    for (let i = targetIndex; i < QUESTION_ORDER.length; i++) {
        updatedProfile[QUESTION_ORDER[i]] = null;
    }

    return updatedProfile;
}

export default {
    createEmptyProfile,
    getCurrentQuestion,
    validateAnswer,
    recordAnswer,
    isProfileComplete,
    getProgress,
    getProfileSummary,
    resetProfile,
    goBackToQuestion
};

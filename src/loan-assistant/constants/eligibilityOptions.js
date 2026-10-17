/**
 * Eligibility Options Constants
 * 
 * All valid options for eligibility questions.
 * These are hardcoded and deterministic - no AI inference.
 * 
 * Used by: QuestionFlow, SchemeFilter, ConfidenceScorer
 */

// Supported intents (hardcoded)
export const INTENTS = Object.freeze({
    AGRI_LOAN: 'AGRI_LOAN',
    GOV_SCHEME: 'GOV_SCHEME'
});

export const INTENT_LABELS = Object.freeze({
    [INTENTS.AGRI_LOAN]: 'Agricultural Loan',
    [INTENTS.GOV_SCHEME]: 'Government Scheme'
});

// All Indian states (simplified list for agricultural context)
export const STATES = Object.freeze([
    'ALL',  // Special: applicable to all states
    'AP',   // Andhra Pradesh
    'AR',   // Arunachal Pradesh
    'AS',   // Assam
    'BR',   // Bihar
    'CG',   // Chhattisgarh
    'GA',   // Goa
    'GJ',   // Gujarat
    'HR',   // Haryana
    'HP',   // Himachal Pradesh
    'JH',   // Jharkhand
    'KA',   // Karnataka
    'KL',   // Kerala
    'MP',   // Madhya Pradesh
    'MH',   // Maharashtra
    'MN',   // Manipur
    'ML',   // Meghalaya
    'MZ',   // Mizoram
    'NL',   // Nagaland
    'OD',   // Odisha
    'PB',   // Punjab
    'RJ',   // Rajasthan
    'SK',   // Sikkim
    'TN',   // Tamil Nadu
    'TS',   // Telangana
    'TR',   // Tripura
    'UK',   // Uttarakhand
    'UP',   // Uttar Pradesh
    'WB'    // West Bengal
]);

export const STATE_LABELS = Object.freeze({
    'ALL': 'All India',
    'AP': 'Andhra Pradesh',
    'AR': 'Arunachal Pradesh',
    'AS': 'Assam',
    'BR': 'Bihar',
    'CG': 'Chhattisgarh',
    'GA': 'Goa',
    'GJ': 'Gujarat',
    'HR': 'Haryana',
    'HP': 'Himachal Pradesh',
    'JH': 'Jharkhand',
    'KA': 'Karnataka',
    'KL': 'Kerala',
    'MP': 'Madhya Pradesh',
    'MH': 'Maharashtra',
    'MN': 'Manipur',
    'ML': 'Meghalaya',
    'MZ': 'Mizoram',
    'NL': 'Nagaland',
    'OD': 'Odisha',
    'PB': 'Punjab',
    'RJ': 'Rajasthan',
    'SK': 'Sikkim',
    'TN': 'Tamil Nadu',
    'TS': 'Telangana',
    'TR': 'Tripura',
    'UK': 'Uttarakhand',
    'UP': 'Uttar Pradesh',
    'WB': 'West Bengal'
});

// Landholding categories with acre ranges
export const LANDHOLDING = Object.freeze({
    LANDLESS: 'landless',
    MARGINAL: 'marginal',  // < 2 acres
    SMALL: 'small',        // 2-5 acres
    LARGE: 'large'         // > 5 acres
});

export const LANDHOLDING_LABELS = Object.freeze({
    [LANDHOLDING.LANDLESS]: 'Landless (0 acres)',
    [LANDHOLDING.MARGINAL]: 'Marginal (< 2 acres)',
    [LANDHOLDING.SMALL]: 'Small (2-5 acres)',
    [LANDHOLDING.LARGE]: 'Large (> 5 acres)'
});

// Maps landholding category to numeric range for filtering
export const LANDHOLDING_RANGES = Object.freeze({
    [LANDHOLDING.LANDLESS]: { min: 0, max: 0 },
    [LANDHOLDING.MARGINAL]: { min: 0.01, max: 1.99 },
    [LANDHOLDING.SMALL]: { min: 2, max: 5 },
    [LANDHOLDING.LARGE]: { min: 5.01, max: 999 }
});

// Common crop types
export const CROP_TYPES = Object.freeze([
    'wheat',
    'rice',
    'maize',
    'sugarcane',
    'cotton',
    'soybean',
    'pulses',
    'vegetables',
    'fruits',
    'spices',
    'oilseeds',
    'millets'
]);

export const CROP_LABELS = Object.freeze({
    'wheat': 'Wheat',
    'rice': 'Rice',
    'maize': 'Maize/Corn',
    'sugarcane': 'Sugarcane',
    'cotton': 'Cotton',
    'soybean': 'Soybean',
    'pulses': 'Pulses/Daal',
    'vegetables': 'Vegetables',
    'fruits': 'Fruits',
    'spices': 'Spices',
    'oilseeds': 'Oilseeds',
    'millets': 'Millets'
});

// Purpose of loan/scheme
export const PURPOSES = Object.freeze({
    SEEDS: 'seeds',
    FERTILIZER: 'fertilizer',
    TOOLS: 'tools',
    IRRIGATION: 'irrigation'
});

export const PURPOSE_LABELS = Object.freeze({
    [PURPOSES.SEEDS]: 'Seeds',
    [PURPOSES.FERTILIZER]: 'Fertilizer',
    [PURPOSES.TOOLS]: 'Tools/Equipment',
    [PURPOSES.IRRIGATION]: 'Irrigation'
});

// Farmer types
export const FARMER_TYPES = Object.freeze({
    OWNER: 'owner',
    TENANT: 'tenant'
});

export const FARMER_TYPE_LABELS = Object.freeze({
    [FARMER_TYPES.OWNER]: 'Land Owner',
    [FARMER_TYPES.TENANT]: 'Tenant Farmer'
});

// Repayment preferences
export const REPAYMENT_TYPES = Object.freeze({
    MONTHLY: 'monthly',
    POST_HARVEST: 'post-harvest'
});

export const REPAYMENT_LABELS = Object.freeze({
    [REPAYMENT_TYPES.MONTHLY]: 'Monthly EMI',
    [REPAYMENT_TYPES.POST_HARVEST]: 'After Harvest'
});

// Confidence levels for results
export const CONFIDENCE_LEVELS = Object.freeze({
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
});

// Question flow order
export const QUESTION_ORDER = Object.freeze([
    'state',
    'landholding',
    'crop',
    'purpose',
    'farmer_type',
    'repayment'
]);

// Question definitions for the guided flow
export const QUESTIONS = Object.freeze({
    state: {
        id: 'state',
        text: 'Which state are you from?',
        text_hi: 'आप किस राज्य से हैं?',
        type: 'select',
        options: STATES.filter(s => s !== 'ALL'),
        labels: STATE_LABELS,
        required: true
    },
    landholding: {
        id: 'landholding',
        text: 'How much land do you have?',
        text_hi: 'आपके पास कितनी ज़मीन है?',
        type: 'select',
        options: Object.values(LANDHOLDING),
        labels: LANDHOLDING_LABELS,
        required: true
    },
    crop: {
        id: 'crop',
        text: 'What crop do you grow?',
        text_hi: 'आप कौन सी फसल उगाते हैं?',
        type: 'select',
        options: CROP_TYPES,
        labels: CROP_LABELS,
        required: true
    },
    purpose: {
        id: 'purpose',
        text: 'What do you need money for?',
        text_hi: 'आपको पैसे किस लिए चाहिए?',
        type: 'select',
        options: Object.values(PURPOSES),
        labels: PURPOSE_LABELS,
        required: true
    },
    farmer_type: {
        id: 'farmer_type',
        text: 'Do you own the land or rent it?',
        text_hi: 'ज़मीन आपकी है या किराए पर है?',
        type: 'select',
        options: Object.values(FARMER_TYPES),
        labels: FARMER_TYPE_LABELS,
        required: true
    },
    repayment: {
        id: 'repayment',
        text: 'When can you repay?',
        text_hi: 'आप कब चुका सकते हैं?',
        type: 'select',
        options: Object.values(REPAYMENT_TYPES),
        labels: REPAYMENT_LABELS,
        required: true
    }
});

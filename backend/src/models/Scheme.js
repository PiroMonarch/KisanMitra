const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
    field: { type: String, required: true },
    operator: { type: String, enum: ['EQUALS', 'IN', 'LTE', 'GTE', 'CONTAINS'], required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const schemeSchema = new mongoose.Schema({
    scheme_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    name_hi: { type: String },
    category: { type: String, enum: ['AGRI_LOAN', 'GOV_SCHEME'], required: true },
    states: { type: [String], default: ['ALL'] },
    eligibility_rules: [ruleSchema],
    documents_required: [String],
    benefits: [String],
    highlights: [String],
    description: { type: String },
    description_hi: { type: String },
    interest_rate: { type: String },
    max_amount: { type: Number },
    source: { type: String },
    version: { type: String, required: true },
    last_updated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Scheme', schemeSchema);

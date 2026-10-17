# Phase 2: RAG Knowledge Layer

## 🎯 Purpose

The RAG Knowledge Layer provides **AI-assisted explanations** for Phase 1 eligibility results. It is a **read-only intelligence layer** that explains decisions, not makes them.

### Core Principle
```
┌───────────────────────────┐
│   Rules DECIDE (Phase 1)  │
│   RAG EXPLAINS (Phase 2)  │
└───────────────────────────┘
```

---

## 📐 Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     PHASE 1 (Immutable)                       │
│  Eligibility Profile → Scheme Filter → Shortlisted Schemes    │
└────────────────────────────┬──────────────────────────────────┘
                             ↓
┌───────────────────────────────────────────────────────────────┐
│                     PHASE 2 (RAG Layer)                       │
│                                                               │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  Knowledge  │   │   Query      │   │   Retriever      │   │
│  │  Base (JSON)│ → │   Builder    │ → │   (Filtered)     │   │
│  └─────────────┘   └──────────────┘   └────────┬─────────┘   │
│                                                 ↓             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Context Validator (Fail-Safe)               │ │
│  └────────────────────────────┬────────────────────────────┘ │
│                               ↓                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Prompt Executor (Offline-First)             │ │
│  └────────────────────────────┬────────────────────────────┘ │
│                               ↓                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Output Formatter (Action-First)             │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 🚫 Hard Constraints

| ❌ RAG Must NOT | ✅ RAG Must |
|----------------|-------------|
| Decide eligibility | Explain eligibility reasoning |
| Invent schemes/rules | Quote official sources only |
| Answer without context | Admit when uncertain |
| Chat openly about policies | Follow structured prompts |
| Override Phase 1 | Accept Phase 1 as authoritative |

---

## 📁 Module Structure

```
src/rag-layer/
├── config/
│   └── ragConfig.js           # Thresholds, settings, failure messages
├── data/
│   └── schemeKnowledge.js     # Official scheme knowledge (seed data)
├── ingestion/
│   ├── documentLoader.js      # Load documents from various sources
│   ├── preprocessor.js        # Clean, segment, structure text
│   └── chunker.js             # Scheme-aware chunking
├── vectorstore/
│   └── metadataSchema.js      # Chunk metadata structure
├── retrieval/
│   ├── queryBuilder.js        # Build controlled queries
│   ├── retriever.js           # Retrieve from knowledge base
│   └── contextValidator.js    # Validate before proceeding
├── prompts/
│   ├── promptTemplates.js     # Task-specific prompts
│   └── promptExecutor.js      # Execute prompts (offline/online)
├── output/
│   └── outputFormatter.js     # Format for UI
├── index.js                   # Main RAG API
├── testRunner.js              # Test cases
└── README.md                  # This file
```

---

## 🔌 Integration with Phase 1

```javascript
import { loanAssistant } from '../loan-assistant/index.js';
import ragLayer from '../rag-layer/index.js';

// Phase 1: Get eligible schemes (AUTHORITATIVE)
const phase1Results = loanAssistant.findEligibleSchemes();

// Phase 2: Explain the results (INFORMATIVE)
const explanations = await ragLayer.explainSchemes(
    phase1Results.eligible_schemes,
    phase1Results.profile_summary
);

// Combined output
const output = {
    eligibility: phase1Results,      // From Phase 1
    explanations: explanations       // From Phase 2
};
```

---

## 📊 RAG Tasks

| Task | Purpose | Doc Types Used |
|------|---------|----------------|
| `SIMPLE_EXPLANATION` | Plain language scheme summary | eligibility, benefits |
| `ELIGIBILITY_REASONING` | Why farmer is eligible | eligibility |
| `DOCUMENT_CHECKLIST` | What documents to collect | documents, process |
| `APPLICATION_GUIDANCE` | How to apply step-by-step | process, faq |
| `BENEFIT_SUMMARY` | What the farmer gets | benefits |

---

## 📄 Knowledge Base

### Current Schemes with Full Knowledge:
- **KCC** - Kisan Credit Card
- **PMKISAN** - PM Kisan Samman Nidhi
- **PMFBY** - PM Fasal Bima Yojana
- **SHC** - Soil Health Card
- **SMAM** - Sub-Mission on Agricultural Mechanization

### Knowledge Structure per Scheme:
```javascript
{
    full_name: "Kisan Credit Card",
    full_name_hi: "किसान क्रेडिट कार्ड",
    eligibility: "Who can apply...",
    benefits: "What you get...",
    documents: "What to bring...",
    process: "How to apply...",
    faq: "Common questions..."
}
```

---

## 🔒 Safe Failure Handling

When knowledge is insufficient:

```javascript
// Low confidence result
{
    success: false,
    safe_response: {
        en: "Complete information is not available. Please consult local authorities.",
        hi: "पूरी जानकारी उपलब्ध नहीं है। कृपया स्थानीय अधिकारियों से संपर्क करें।"
    }
}
```

**Never hallucinate. If unsure, say so.**

---

## 📤 Output Format

### Scheme Explanation:
```json
{
    "scheme_id": "KCC",
    "scheme_name": "Kisan Credit Card",
    "simple_explanation": {
        "en": "KCC provides up to ₹3 lakh credit at 4% interest...",
        "hi": "किसान क्रेडिट कार्ड से ₹3 लाख तक का ऋण 4% ब्याज पर..."
    },
    "eligibility_reason": {
        "reason": "You qualify because owner farmers are explicitly eligible",
        "criteria": ["Owner farmers eligible", "Marginal landholding covered"]
    },
    "documents_required": {
        "list": [
            { "name": "Aadhaar Card", "required": true },
            { "name": "Land Records", "required": true }
        ],
        "total": 4
    },
    "application_steps": {
        "steps": ["Visit bank", "Fill form", "Submit documents"],
        "helpline": "1800-180-1551"
    },
    "overall_confidence": "HIGH",
    "requires_disclaimer": false
}
```

---

## 🧪 Running Tests

```bash
cd src/rag-layer
node --experimental-json-modules testRunner.js
```

---

## 🔄 Execution Modes

### Offline Mode (Default)
- Uses template-based generation
- Extracts information directly from knowledge base
- No LLM API calls
- Works without internet

### Online Mode (Optional)
- Uses LLM API for richer explanations
- Requires API key
- Falls back to offline if unavailable

```javascript
ragLayer.initialize({
    mode: 'online',
    apiKey: 'YOUR_API_KEY'
});
```

---

## 📈 Confidence Scoring

| Level | Score | Meaning |
|-------|-------|---------|
| HIGH | ≥85% | Reliable, complete information |
| MEDIUM | 70-84% | Usable, may show disclaimer |
| LOW | 50-69% | Proceed with caution |
| NONE | <50% | Fail safe, show fallback |

---

## ⚠️ Important Notes

1. **RAG is NOT a chatbot** - It answers specific questions about shortlisted schemes only
2. **Phase 1 is authoritative** - If Phase 1 says ineligible, RAG cannot override
3. **All content must be from official sources** - No invented information
4. **Farmer-first language** - Simple, actionable, bilingual
5. **Fail safe** - When uncertain, admit it and suggest consulting officials

---

*Built for governance-grade trustworthiness, not demo convenience.*

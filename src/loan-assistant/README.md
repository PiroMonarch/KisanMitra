# Loan & Scheme Assistant - Phase 1 Documentation

## 🌾 Overview

This is **Phase 1 (Core Guided Flow)** of the Kisanmitr Loan & Scheme Assistant. It provides a deterministic, offline-first, explainable system for helping Indian farmers find eligible agricultural loans and government schemes.

### Key Principles
- ✅ **100% Deterministic** - No AI, no randomness, same input always produces same output
- ✅ **Offline-First** - All data stored locally, works without internet
- ✅ **Explainable** - Every decision can be traced and explained
- ✅ **No Hallucination** - Only recommends schemes farmer is actually eligible for

---

## 📁 Module Structure

```
src/loan-assistant/
├── constants/
│   └── eligibilityOptions.js    # All valid options, labels, question definitions
├── data/
│   └── schemes.json             # Local scheme metadata store (12 schemes)
├── core/
│   ├── intentDetector.js        # Intent entry (button/keyword matching)
│   ├── eligibilityFlow.js       # Guided 6-question flow
│   ├── schemeFilter.js          # Deterministic filtering engine
│   ├── confidenceScorer.js      # Explainable confidence scoring
│   └── outputGenerator.js       # Action-oriented output
├── storage/
│   └── offlineStorage.js        # localStorage persistence
├── index.js                     # Main entry point & controller
└── testRunner.js                # Test cases with example runs
```

---

## 🔄 Data Flow

```
┌─────────────────┐
│  Intent Entry   │ ← Button click or keyword match
│  (AGRI_LOAN /   │
│   GOV_SCHEME)   │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Question Flow   │ ← 6 guided questions
│ (State, Land,   │
│  Crop, Purpose, │
│  Farmer Type,   │
│  Repayment)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Eligibility     │ ← Structured profile
│ Profile         │   {state, landholding, crop, purpose, farmer_type, repayment}
└────────┬────────┘
         ▼
┌─────────────────┐
│ Scheme Filter   │ ← Check ALL constraints for ALL schemes
│ Engine          │   Returns only fully eligible schemes
└────────┬────────┘
         ▼
┌─────────────────┐
│ Confidence      │ ← Score based on match quality
│ Scorer          │   HIGH / MEDIUM / LOW
└────────┬────────┘
         ▼
┌─────────────────┐
│ Output          │ ← Concise, actionable results
│ Generator       │   Scheme ID, confidence, documents
└─────────────────┘
```

---

## 📊 Data Models

### Eligibility Profile
```javascript
{
  "state": "UP",           // State code (e.g., UP, MH, KA)
  "landholding": "marginal", // landless | marginal | small | large
  "crop": "wheat",         // Type of crop
  "purpose": "seeds",      // seeds | fertilizer | tools | irrigation
  "farmer_type": "owner",  // owner | tenant
  "repayment": "post-harvest" // monthly | post-harvest
}
```

### Scheme Metadata
```javascript
{
  "scheme_id": "KCC",
  "name": "Kisan Credit Card",
  "name_hi": "किसान क्रेडिट कार्ड",
  "type": "AGRI_LOAN",
  "states": ["ALL"],           // ALL = nationwide
  "min_land": 0,               // Minimum acres
  "max_land": 999,             // Maximum acres
  "farmer_types": ["owner", "tenant"],
  "purposes": ["seeds", "fertilizer", "tools"],
  "repayment": ["post-harvest", "monthly"],
  "interest_rate": "4%",
  "max_amount": 300000,
  "documents": ["Aadhaar", "Land Record", "Bank Passbook"],
  "description": "Short-term credit for crop production"
}
```

### Filter Result
```javascript
{
  "eligible_schemes": [
    {
      "scheme_id": "KCC",
      "confidence": "HIGH",
      "score": 85,
      "documents": ["Aadhaar", "Land Record", "Bank Passbook"],
      "highlights": ["4% interest", "Up to ₹3 Lakh"]
    }
  ],
  "total_matches": 3,
  "high_confidence_count": 2,
  "medium_confidence_count": 1
}
```

---

## ⚙️ Core Logic

### 1. Intent Detection
```javascript
// Button click (primary method)
detectIntentFromButton("AGRI_LOAN")
// → { intent: "AGRI_LOAN", source: "BUTTON_CLICK", valid: true }

// Keyword matching (fallback for text input)
detectIntentFromText("मुझे सरकारी योजना चाहिए")
// → { intent: "GOV_SCHEME", source: "KEYWORD_MATCH", valid: true }
```

### 2. Eligibility Checks (All Must Pass)

| Check | Logic |
|-------|-------|
| State | `scheme.states.includes('ALL') OR scheme.states.includes(farmer.state)` |
| Landholding | `farmer.land >= scheme.min_land AND farmer.land <= scheme.max_land` |
| Farmer Type | `scheme.farmer_types.includes(farmer.type)` |
| Purpose | `scheme.purposes.includes(farmer.purpose)` |
| Repayment | `scheme.repayment.includes(farmer.repayment) OR scheme.repayment.length === 0` |

### 3. Confidence Scoring

| Factor | Weight | Description |
|--------|--------|-------------|
| Purpose Match | 30 | Primary purpose = full, secondary = 80% |
| Farmer Type | 25 | Exclusive match = full, shared = 90% |
| State Specific | 20 | Specific state = full, ALL = 70% |
| Repayment | 15 | Exact match or grant = full |
| Landholding Fit | 10 | Narrow target = full, wide = 60% |

**Thresholds:**
- HIGH: Score ≥ 80
- MEDIUM: Score ≥ 50
- LOW: Score < 50

---

## 💾 Offline Storage

Uses `localStorage` with keys:
- `kisanmitr_profile` - Current eligibility profile
- `kisanmitr_results` - Last filtered results
- `kisanmitr_sessions` - History of past sessions (max 10)

```javascript
// Save profile
saveProfile(profile);

// Load profile
const profile = loadProfile();

// Save complete session
saveSession(profile, results);

// Get storage stats
getStorageStats();
// → { available: true, hasProfile: true, hasResults: true, sessionCount: 3 }
```

---

## 🎯 Example Run

**Input:**
```javascript
const profile = {
  state: "UP",
  landholding: "marginal",
  crop: "wheat",
  purpose: "seeds",
  farmer_type: "owner",
  repayment: "post-harvest"
};
```

**Output:**
```javascript
{
  "total_matches": 5,
  "high_confidence_count": 2,
  "eligible_schemes": [
    {
      "scheme_id": "KCC",
      "confidence": "HIGH",
      "documents": ["Aadhaar", "Land Record", "Bank Passbook"],
      "highlights": ["4% interest", "Up to ₹3 Lakh"]
    },
    {
      "scheme_id": "PACS_LOAN",
      "confidence": "HIGH",
      "documents": ["Aadhaar", "PACS Membership", "Land Record"],
      "highlights": ["7% interest", "Up to ₹1 Lakh"]
    },
    {
      "scheme_id": "PMKISAN",
      "confidence": "MEDIUM",
      "documents": ["Aadhaar", "Land Record", "Bank Account"],
      "highlights": ["Benefits up to ₹6K"]
    }
  ]
}
```

---

## 🔌 RAG Integration Points (Future Phase 2)

This Phase 1 architecture is designed to support later AI/RAG integration:

### 1. **Intent Detection Enhancement**
Current: Keyword matching
Future: LLM can classify intent from natural language
```javascript
// Phase 1
detectIntentFromText("loan") → deterministic keyword match

// Phase 2 (future)
// LLM classifies: "My crops failed, I need money" → AGRI_LOAN intent
// Falls back to Phase 1 if LLM unavailable (offline)
```

### 3. **Scheme Explanation**
Current: Static descriptions
Future: RAG retrieval from scheme PDFs for detailed explanations
```javascript
// Phase 1: scheme.description = "Short-term credit for crop production"
// Phase 2: RAG retrieves relevant sections from KCC policy PDF
```

### 4. **Eligibility Edge Cases**
Current: Strict constraint matching
Future: LLM handles edge cases with human confirmation
```javascript
// Phase 1: Rejects if any constraint fails
// Phase 2: LLM suggests "You might qualify under special provision X"
//          → Flags for human verification
```

### Key Design Decisions for RAG Compatibility:
1. **Structured profiles** - Easy to embed and compare
2. **Explainable scores** - LLM can reference specific factors
3. **Offline fallback** - Phase 1 works when LLM unavailable
4. **Audit trail** - filterLog captures all decisions for explanation

---

## 🧪 Running Tests

```bash
# From project root
cd src/loan-assistant
node --experimental-json-modules testRunner.js
```

Or in browser console:
```javascript
import { runTests } from './loan-assistant/testRunner.js';
runTests();
```

---

## 📋 Included Schemes (12 Total)

| ID | Name | Type | Coverage |
|----|------|------|----------|
| KCC | Kisan Credit Card | AGRI_LOAN | All India |
| PMFBY | PM Fasal Bima Yojana | GOV_SCHEME | All India |
| PMKSY | PM Krishi Sinchai Yojana | GOV_SCHEME | All India |
| SMAM | Sub-Mission on Agricultural Mechanization | GOV_SCHEME | All India |
| PKVY | Paramparagat Krishi Vikas Yojana | GOV_SCHEME | All India |
| NABARD_TERM | NABARD Term Loan | AGRI_LOAN | All India |
| PACS_LOAN | PACS Short Term Loan | AGRI_LOAN | 7 States |
| SHC | Soil Health Card Scheme | GOV_SCHEME | All India |
| PMKISAN | PM Kisan Samman Nidhi | GOV_SCHEME | All India |
| MIF | Micro Irrigation Fund | AGRI_LOAN | 7 States |
| AIF | Agriculture Infrastructure Fund | AGRI_LOAN | All India |
| NMOOP | National Mission on Oilseeds | GOV_SCHEME | 6 States |

---

## ✅ Compliance Checklist

| Requirement | Status |
|-------------|--------|
| ❌ No free-form chatbot | ✅ Guided questions only |
| ❌ No embeddings | ✅ Deterministic matching |
| ❌ No policy-PDF reasoning | ✅ Hardcoded eligibility rules |
| ❌ No hallucinated eligibility | ✅ Strict constraint checking |
| ❌ No internet dependency | ✅ localStorage + local JSON |
| ❌ No long text explanations | ✅ Concise actionable output |

---

## 🚀 Usage

```jsx
import { LoanAssistant } from './components/LoanAssistant';

function App() {
  const [showAssistant, setShowAssistant] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowAssistant(true)}>Get Help</button>
      {showAssistant && <LoanAssistant onClose={() => setShowAssistant(false)} />}
    </div>
  );
}
```

---

*Built as governance-grade software, not a demo chatbot.*

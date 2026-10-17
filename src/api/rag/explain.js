import { retrieveContext } from "../../rag-layer/retrieval/retriever.js";
import { formatSchemeExplanation } from "../../rag-layer/generator/formatter.js"; // we’ll stub this

export async function explainSchemeHandler(req, res) {
    try {
        const { scheme_id, farmer_profile, language = "en" } = req.body;

        console.log("[API][RAG] Explain request:", scheme_id);

        // 1️⃣ Retrieve context
        const retrievalResult = retrieveContext({
            scheme_id,
            task: "SIMPLE_EXPLANATION",
            doc_types: ["eligibility", "benefits", "documents"],
            farmer_context: farmer_profile
        });

        if (!retrievalResult.success) {
            return res.status(404).json({
                success: false,
                message: "Scheme knowledge not available"
            });
        }

        // 2️⃣ Format for UI (NO LLM yet)
        const explanation = formatSchemeExplanation(
            retrievalResult,
            language
        );

        return res.json({
            success: true,
            scheme_id,
            confidence: retrievalResult.confidence,
            explanation
        });

    } catch (err) {
        console.error("[API][RAG] Error:", err);
        res.status(500).json({ success: false });
    }
}
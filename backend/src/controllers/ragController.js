import SCHEME_REGISTRY from "../config/schemeRegistry.js";
// Note: In a production environment, this should be a proper service import
// For this task, we will bridge to the RAGLayerController logic
import { RAGLayerController } from "../../../src/rag-layer/index.js";

const rag = new RAGLayerController();
rag.initialize();

/**
 * Get list of supported schemes
 */
export const getSchemes = async (req, res) => {
    res.json(SCHEME_REGISTRY);
};

/**
 * Ask a question about a specific scheme
 * Mandatory fields: scheme_id, query
 */
export const askQuestion = async (req, res) => {
    try {
        const { scheme_id, query } = req.body;

        // Phase 4 Requirement: Explicit Scheme Selection
        if (!scheme_id) {
            return res.status(400).json({
                error: "Scheme selection required before answering questions"
            });
        }

        if (!query) {
            return res.status(400).json({
                error: "Query is required"
            });
        }

        // Phase 4 Requirement: Route queries strictly by scheme
        // We use the fully implemented Phase 3 method
        const response = await rag.answerDocumentQuery(scheme_id, query);

        // Debug Visibility (Dev-Only)
        console.log(`[RAG Debug] Scheme: ${scheme_id} | Query: ${query}`);

        res.json(response);
    } catch (error) {
        console.error("RAG API Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

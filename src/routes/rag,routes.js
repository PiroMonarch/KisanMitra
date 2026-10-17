import express from "express";
import ragLayer from "../rag-layer/index.js";

const router = express.Router();

router.post("/rag/explain", async (req, res) => {
    console.log("[API] /rag/explain HIT");

    try {
        const { scheme, profile } = req.body;

        const result = await ragLayer.explainScheme(scheme, profile);

        res.json({ success: true, data: result });
    } catch (err) {
        console.error("[API][RAG] Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
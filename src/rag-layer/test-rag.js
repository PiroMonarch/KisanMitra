import { retrieveContext } from "./retrieval/retriever.js";

const testQuery = {
    scheme_id: "KCC", // must match SCHEME_KNOWLEDGE key
    task: "SIMPLE_EXPLANATION",
    doc_types: ["eligibility", "benefits", "documents"],
    semantic_query: "loan for seeds",
    farmer_context: {
        farmer_type: "owner",
        purpose: "seeds"
    }
};

console.log("\n===== RAG RETRIEVER TEST START =====\n");

const result = retrieveContext(testQuery);

console.log("\n===== RAG RETRIEVER RESULT =====\n");
console.dir(result, { depth: null });
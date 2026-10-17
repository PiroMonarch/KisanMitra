export function formatSchemeExplanation(retrievalResult, language = "en") {
    const sections = {};

    for (const chunk of retrievalResult.chunks) {
        const parsed = JSON.parse(chunk.content);

        sections[chunk.doc_type] = parsed;
    }

    return {
        eligibility: sections.eligibility?.why?.[language],
        benefits: sections.benefits?.primary?.[language],
        loan_amount: sections.benefits?.amounts?.[language],
        documents: sections.documents?.default?.map(d => d.name)
    };
}
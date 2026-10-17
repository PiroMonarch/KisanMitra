import React, { useState } from 'react';
import { CONFIDENCE_LEVELS } from '../../loan-assistant/index.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Results Display Component
 * Shows eligible schemes with confidence scores and documents
 */
function ResultsDisplay({ results, onReset, onBack, onChat }) {
    const { t, language } = useLanguage();
    const [expandedScheme, setExpandedScheme] = useState(null);

    const getConfidenceColor = (confidence) => {
        switch (confidence) {
            case CONFIDENCE_LEVELS.HIGH: return 'confidence-high';
            case CONFIDENCE_LEVELS.MEDIUM: return 'confidence-medium';
            case CONFIDENCE_LEVELS.LOW: return 'confidence-low';
            default: return '';
        }
    };

    const getConfidenceLabel = (confidence) => {
        switch (confidence) {
            case CONFIDENCE_LEVELS.HIGH: return `✓ ${t('loan.conf.high')}`;
            case CONFIDENCE_LEVELS.MEDIUM: return `◐ ${t('loan.conf.medium')}`;
            case CONFIDENCE_LEVELS.LOW: return `○ ${t('loan.conf.low')}`;
            default: return '';
        }
    };

    const toggleExpand = (schemeId) => {
        setExpandedScheme(expandedScheme === schemeId ? null : schemeId);
    };

    if (results.total_matches === 0) {
        return (
            <div className="results-display results-empty">
                <div className="empty-icon">📭</div>
                <h3>{t('loan.results.empty')}</h3>
                <p className="empty-reason">{results.no_match_reason}</p>

                {results.suggestions && results.suggestions.length > 0 && (
                    <div className="suggestions">
                        <h4>{t('loan.results.suggestions')}:</h4>
                        <ul>
                            {results.suggestions.map((suggestion, idx) => (
                                <li key={idx}>{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="results-actions">
                    <button type="button" className="btn-secondary" onClick={onBack}>
                        ← {t('loan.results.modify')}
                    </button>
                    <button type="button" className="btn-primary" onClick={onReset}>
                        {t('loan.results.startOver')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="results-display">
            <div className="results-header">
                <div className="results-summary">
                    <span className="results-count">{results.total_matches}</span>
                    <span className="results-label">{t('loan.results.found')}</span>
                </div>
                <div className="confidence-summary">
                    {results.high_confidence_count > 0 && (
                        <span className="badge badge-high">
                            {results.high_confidence_count} {t('loan.results.recommended')}
                        </span>
                    )}
                </div>
            </div>

            <div className="schemes-list">
                {results.eligible_schemes.map((scheme) => (
                    <div
                        key={scheme.scheme_id}
                        className={`scheme-card ${getConfidenceColor(scheme.confidence)}`}
                    >
                        <div
                            className="scheme-header"
                            onClick={() => toggleExpand(scheme.scheme_id)}
                            role="button"
                            aria-expanded={expandedScheme === scheme.scheme_id}
                        >
                            <div className="scheme-info">
                                <h4 className="scheme-name">{scheme.name}</h4>
                                {language === 'hi' && scheme.name_hi && (
                                    <span className="scheme-name-hi">{scheme.name_hi}</span>
                                )}
                                <span className={`confidence-badge ${getConfidenceColor(scheme.confidence)}`}>
                                    {getConfidenceLabel(scheme.confidence)}
                                </span>
                            </div>
                            <span className="expand-icon">
                                {expandedScheme === scheme.scheme_id ? '−' : '+'}
                            </span>
                        </div>

                        {/* Highlights always visible */}
                        <div className="scheme-highlights">
                            {scheme.highlights?.map((highlight, idx) => (
                                <span key={idx} className="highlight-tag">{highlight}</span>
                            ))}
                        </div>

                        {/* Expanded details */}
                        {expandedScheme === scheme.scheme_id && (
                            <div className="scheme-details">
                                <p className="scheme-description">{scheme.description}</p>

                                <div className="documents-section">
                                    <h5>📄 {t('loan.results.documents')}:</h5>
                                    <ul className="documents-list">
                                        {scheme.documents.map((doc, idx) => (
                                            <li key={idx}>{doc}</li>
                                        ))}
                                    </ul>
                                </div>

                                {scheme.match_reason && (
                                    <div className="match-reason">
                                        <span className="reason-icon">💡</span>
                                        <span>{scheme.match_reason}</span>
                                    </div>
                                )}

                                                <div className="scheme-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-chat"
                                                        onClick={() => onChat(scheme)}
                                                    >
                                                        <span className="chat-icon">💬</span>
                                                        {t('loan.results.ask')}
                                                    </button>
                                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="results-actions">
                <button type="button" className="btn-secondary" onClick={onBack}>
                    ← {t('loan.results.modify')}
                </button>
                <button type="button" className="btn-primary" onClick={onReset}>
                    {t('loan.results.searchAgain')}
                </button>
            </div>

            <div className="results-footer">
                <p className="disclaimer">
                    ℹ️ {t('loan.results.disclaimer')}
                </p>
            </div>
        </div>
    );
}

export default ResultsDisplay;

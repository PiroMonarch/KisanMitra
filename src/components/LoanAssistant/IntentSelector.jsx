import React from 'react';
import { INTENTS } from '../../loan-assistant/index.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Intent Selector Component
 * First step - user selects what they need (loan or scheme)
 */
function IntentSelector({ onSelect }) {
    const { t } = useLanguage();
    const intents = [
        {
            id: INTENTS.AGRI_LOAN,
            label: t('loan.intent.loan'),
            icon: '💰',
            description: t('loan.intent.loan.desc')
        },
        {
            id: INTENTS.GOV_SCHEME,
            label: t('loan.intent.scheme'),
            icon: '🏛️',
            description: t('loan.intent.scheme.desc')
        }
    ];

    return (
        <div className="intent-selector">
            <div className="intent-header">
                <h3>{t('loan.intent.header')}</h3>
            </div>

            <div className="intent-options">
                {intents.map((intent) => (
                    <button
                        key={intent.id}
                        className="intent-card"
                        onClick={() => onSelect(intent.id)}
                        aria-label={intent.label}
                    >
                        <span className="intent-icon">{intent.icon}</span>
                        <div className="intent-text">
                            <span className="intent-label">{intent.label}</span>
                            <span className="intent-desc">{intent.description}</span>
                        </div>
                        <span className="intent-arrow">→</span>
                    </button>
                ))}
            </div>

            <div className="intent-footer">
                <p className="help-text">
                    <span className="help-icon">ℹ️</span>
                    {t('loan.intent.footer')}
                </p>
            </div>
        </div>
    );
}

export default IntentSelector;

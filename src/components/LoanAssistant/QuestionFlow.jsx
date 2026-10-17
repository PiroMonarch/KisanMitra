import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Question Flow Component
 * Displays each eligibility question with options
 */
function QuestionFlow({ question, progress, onAnswer, onBack }) {
    const { t, language } = useLanguage();
    const [selectedOption, setSelectedOption] = useState(null);

    const handleSelect = (option) => {
        setSelectedOption(option);
    };

    const handleSubmit = () => {
        if (selectedOption) {
            onAnswer(question.id, selectedOption);
            setSelectedOption(null);
        }
    };

    const handleKeyPress = (e, option) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleSelect(option);
        }
    };

    return (
        <div className="question-flow">
            <div className="question-header">
                <span className="question-number">
                    {t('loan.question.label')} {question.position} {t('loan.question.of')} {question.total}
                </span>
            </div>

            <div className="question-content">
                <h3 className="question-text">
                    {language === 'hi' && question.text_hi ? question.text_hi : question.text}
                </h3>
            </div>

            <div className="options-grid">
                {question.options.map((option) => {
                    const label = question.labels?.[option] || option;
                    const isSelected = selectedOption === option;

                    return (
                        <button
                            key={option}
                            className={`option-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelect(option)}
                            onKeyPress={(e) => handleKeyPress(e, option)}
                            aria-pressed={isSelected}
                            role="radio"
                        >
                            <span className="option-check">
                                {isSelected ? '✓' : '○'}
                            </span>
                            <span className="option-label">{label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="question-actions">
                <button
                    className="btn-secondary"
                    onClick={onBack}
                    aria-label="Go back"
                >
                    ← {t('loan.question.back')}
                </button>
                <button
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={!selectedOption}
                    aria-label="Continue to next question"
                >
                    {question.position === question.total ? t('loan.question.find') : t('loan.question.next')} →
                </button>
            </div>
        </div>
    );
}

export default QuestionFlow;

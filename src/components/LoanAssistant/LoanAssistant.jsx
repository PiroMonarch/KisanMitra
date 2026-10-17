import React, { useState, useEffect, useCallback } from 'react';
import { loanAssistant, INTENTS, INTENT_LABELS, CONFIDENCE_LEVELS } from '../../loan-assistant/index.js';
import IntentSelector from './IntentSelector';
import QuestionFlow from './QuestionFlow';
import ResultsDisplay from './ResultsDisplay';
import ChatPanel from './ChatPanel';
import './LoanAssistant.css';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Main Loan Assistant Component
 * Orchestrates the guided flow from intent selection to results display
 */
function LoanAssistant({ onClose, inline = false }) {
    const { t } = useLanguage();
    const [stage, setStage] = useState('intent'); // intent | questions | results | chat
    const [intent, setIntent] = useState(null);
    const [profile, setProfile] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [progress, setProgress] = useState({ answered: 0, total: 6 });
    const [results, setResults] = useState(null);
    const [selectedScheme, setSelectedScheme] = useState(null);
    const [error, setError] = useState(null);

    // Initialize on mount
    useEffect(() => {
        const init = async () => {
            // Always attempt to restore saved answers/results so users return
            // to their previous results after a reload. The UI will show
            // the appropriate stage based on saved progress.
            const resume = true;
            const state = await loanAssistant.initialize(resume);
            setProfile(state.profile);

            // Check saved progress or results and set initial stage
            const currentProgress = loanAssistant.getProgress();
            if (currentProgress.answered > 0 && !currentProgress.isComplete) {
                setStage('questions');
                setCurrentQuestion(loanAssistant.getCurrentQuestion());
                setProgress(currentProgress);
            } else if (state.results && state.results.eligible_schemes) {
                setResults(state.results);
                setStage('results');
            } else if (currentProgress.answered > 0 && currentProgress.isComplete) {
                // profile complete but no cached results: compute them
                const matchResults = loanAssistant.findEligibleSchemes();
                setResults(matchResults);
                setStage('results');
            }
        };
        init();
    }, [inline]);

    // Handle intent selection
    const handleIntentSelect = useCallback((selectedIntent) => {
        const result = loanAssistant.setIntentFromButton(selectedIntent);
        if (result.valid) {
            setIntent(selectedIntent);

            const question = loanAssistant.getCurrentQuestion();
            const currentProgress = loanAssistant.getProgress();

            setProgress(currentProgress);

            if (currentProgress.isComplete || !question) {
                // If profile already complete, jump to results
                const matchResults = loanAssistant.findEligibleSchemes();
                setResults(matchResults);
                setStage('results');
            } else {
                setCurrentQuestion(question);
                setStage('questions');
            }
            setError(null);
        } else {
            setError('Invalid selection. Please try again.');
        }
    }, []);

    // Handle question answer
    const handleAnswer = useCallback((questionId, answer) => {
        const result = loanAssistant.answerQuestion(questionId, answer);

        if (result.success) {
            setProfile(result.profile);
            setProgress(loanAssistant.getProgress());

            if (result.isComplete) {
                // Run the matching engine
                const matchResults = loanAssistant.findEligibleSchemes();
                setResults(matchResults);
                setStage('results');
            } else {
                setCurrentQuestion(loanAssistant.getCurrentQuestion());
            }
            setError(null);
        } else {
            setError(result.error);
        }
    }, []);

    // Handle going back
    const handleBack = useCallback(() => {
        const questionOrder = ['state', 'landholding', 'crop', 'purpose', 'farmer_type', 'repayment'];
        if (stage === 'questions') {
            const currentIdx = progress.answered;
            if (currentIdx > 0) {
                loanAssistant.goBackTo(questionOrder[currentIdx - 1]);
                setCurrentQuestion(loanAssistant.getCurrentQuestion());
                setProgress(loanAssistant.getProgress());
            } else {
                setStage('intent');
            }
        } else if (stage === 'results') {
            // If profile was complete, go back to the last answered question
            const currentProgress = loanAssistant.getProgress();
            if (currentProgress.answered > 0) {
                loanAssistant.goBackTo(questionOrder[currentProgress.answered - 1]);
                setCurrentQuestion(loanAssistant.getCurrentQuestion());
                setProgress(loanAssistant.getProgress());
                setStage('questions');
            } else {
                setStage('intent');
            }
        }
    }, [stage, progress]);

    // Handle chat opening
    const handleOpenChat = useCallback((scheme) => {
        setSelectedScheme(scheme);
        setStage('chat');
    }, []);

    // Handle chat closing/back
    const handleChatBack = useCallback(() => {
        setStage('results');
        setSelectedScheme(null);
    }, []);

    // Handle reset
    const handleReset = useCallback(() => {
        loanAssistant.reset();
        setIntent(null);
        setProfile(null);
        setCurrentQuestion(null);
        setResults(null);
        setSelectedScheme(null);
        setProgress({ answered: 0, total: 6 });
        setStage('intent');
        setError(null);
    }, []);

    return (
        <div className={"loan-assistant" + (inline ? ' inline' : '')}>
            <div className="loan-assistant-header">
                                <h2 className="loan-assistant-title">
                                        <span className="title-icon">🌾</span>
                                        {t('assistant.title')}
                                </h2>
                                {!inline && (
                                    <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
                                )}
            </div>

            {error && (
                <div className="error-banner">
                    <span>⚠️</span> {error}
                </div>
            )}

            <div className="loan-assistant-content">
                {stage === 'intent' && (
                    <IntentSelector onSelect={handleIntentSelect} />
                )}

                {stage === 'questions' && currentQuestion && (
                    <QuestionFlow
                        question={currentQuestion}
                        progress={progress}
                        onAnswer={handleAnswer}
                        onBack={handleBack}
                    />
                )}

                {stage === 'results' && results && (
                    <ResultsDisplay
                        results={results}
                        onReset={handleReset}
                        onBack={handleBack}
                        onChat={handleOpenChat}
                    />
                )}

                {stage === 'chat' && selectedScheme && (
                    <ChatPanel
                        schemeId={selectedScheme.scheme_id}
                        schemeName={selectedScheme.name}
                        onBack={handleChatBack}
                    />
                )}
            </div>

            {/* Progress indicator */}
            {stage === 'questions' && (
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress.percentage || 0}%` }}
                    />
                    <span className="progress-text">
                        Step {progress.answered + 1} of {progress.total}
                    </span>
                </div>
            )}

            {/* Offline indicator */}
            <div className="offline-indicator">
                <span className="offline-dot"></span>
                Works Offline
            </div>
        </div>
    );
}

export default LoanAssistant;

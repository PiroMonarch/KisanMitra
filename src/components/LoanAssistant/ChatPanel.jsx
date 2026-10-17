import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Chat Panel Component - Phase 4 Implementation
 * Handles real-time Q&A about a selected scheme.
 */
function ChatPanel({ schemeId, schemeName, onBack }) {
    const { t, language } = useLanguage();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial greeting
    useEffect(() => {
        const greeting = language === 'hi'
            ? `नमस्ते! आपने **${schemeName}** चुना है। मैं आपकी कैसे मदद कर सकता हूँ?`
            : `Hi! You've selected **${schemeName}**. How can I help you with this scheme?`;
        const punjabiGreeting = language === 'pa'
            ? `ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਤੁਸੀਂ **${schemeName}** ਚੁਣਿਆ ਹੈ। ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?`
            : greeting;
        setMessages([
            {
                role: 'assistant',
                content: punjabiGreeting,
                timestamp: Date.now()
            }
        ]);
    }, [schemeId, schemeName, language]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // UI → API → RAGLayerController wiring
            const response = await fetch('/api/rag/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheme_id: schemeId,
                    query: input,
                    language
                })
            });

            const data = await response.json();

            if (data.error) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Error: ${data.error}`,
                    isError: true,
                    timestamp: Date.now()
                }]);
            } else {
                const reply = language === 'hi' ? data.hi || data.en : language === 'pa' ? data.pa || data.en : data.en;
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: reply || data.en,
                    timestamp: Date.now()
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: t('loan.chat.error'),
                isError: true,
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([messages[0]]);
    };

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div className="chat-title">
                    <MessageCircle size={18} className="chat-icon" />
                    <span>{t('loan.chat.title')}: <strong>{schemeId}</strong></span>
                </div>
                <div className="chat-actions">
                    <button onClick={clearChat} title={t('loan.chat.clear')} className="icon-btn">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={onBack} title={t('loan.chat.back')} className="icon-btn">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message-wrapper ${msg.role}`}>
                        <div className="message-icon">
                            {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                        </div>
                        <div className={`message-content ${msg.isError ? 'error' : ''}`}>
                            <p>{msg.content}</p>
                            <span className="timestamp">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-numeric', minute: '2-numeric' })}
                            </span>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message-wrapper assistant">
                        <div className="message-icon"><Bot size={16} /></div>
                        <div className="message-content typing">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('loan.chat.placeholder')}
                    disabled={isLoading}
                />
                <button type="submit" disabled={!input.trim() || isLoading}>
                    <Send size={18} />
                </button>
            </form>

            {/* Debug Visibility (Phase 4 Requirement) */}
            <div className="debug-visibility">
                {t('loan.chat.debug')}: {schemeId}
            </div>
        </div>
    );
}

export default ChatPanel;

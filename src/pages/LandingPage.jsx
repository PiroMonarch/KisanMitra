import React, { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import Services from '../components/Services.jsx';
import Features from '../components/Features.jsx';
import Testimonials from '../components/Testimonials.jsx';
import Footer from '../components/Footer.jsx';
import LoanAssistant from '../components/LoanAssistant/LoanAssistant.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const LandingPage = () => {
  const [showAssistant, setShowAssistant] = useState(false);
  const { t } = useLanguage();

  return (
    <div>
      <Navbar />
      <Hero />
      <Services />
      <Features />
      <Testimonials />
      <Footer />

      <button className="loan-assistant-fab" onClick={() => setShowAssistant(true)}>
        <span className="fab-icon">🌾</span>
        <span className="fab-text">{t('loan.assistant.fab')}</span>
      </button>

      {showAssistant && (
        <LoanAssistant onClose={() => setShowAssistant(false)} />
      )}
    </div>
  );
};

export default LandingPage;

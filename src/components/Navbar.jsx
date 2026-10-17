import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Leaf } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import LanguageSelector from './LanguageSelector.jsx';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <nav style={{
      background: 'var(--primary-dark-green)',
      padding: '1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1.4rem',
          fontWeight: 'bold',
          color: 'var(--white)',
          fontFamily: 'var(--font-heading)'
        }}>
          <Leaf size={24} color="#e8a23a" fill="#e8a23a" />
          Kisanmitr
        </div>

        {/* Desktop Navigation */}
        <div className="desktop-nav" style={{
          display: 'flex',
          gap: '2.5rem',
          alignItems: 'center'
        }}>
          <a href="#hero" className="nav-link" style={{ color: 'var(--white)', fontWeight: '500', opacity: 0.9 }}>{t('nav.home')}</a>
          <a href="#services" className="nav-link" style={{ color: 'var(--white)', fontWeight: '500', opacity: 0.9 }}>{t('nav.services')}</a>
          <a href="#features" className="nav-link" style={{ color: 'var(--white)', fontWeight: '500', opacity: 0.9 }}>{t('nav.features')}</a>
          <a href="#about" className="nav-link" style={{ color: 'var(--white)', fontWeight: '500', opacity: 0.9 }}>{t('nav.about')}</a>
          <a href="#contact" className="nav-link" style={{ color: 'var(--white)', fontWeight: '500', opacity: 0.9 }}>{t('nav.contact')}</a>
          <LanguageSelector />
          <Link to="/auth" className="btn btn-primary">{t('nav.login')}</Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--white)'
          }}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div style={{
          background: 'var(--primary-dark-green)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <a href="#hero" style={{ color: 'var(--white)' }}>{t('nav.home')}</a>
          <a href="#services" style={{ color: 'var(--white)' }}>{t('nav.services')}</a>
          <a href="#features" style={{ color: 'var(--white)' }}>{t('nav.features')}</a>
          <a href="#contact" style={{ color: 'var(--white)' }}>{t('nav.contact')}</a>
          <LanguageSelector />
          <Link to="/auth" className="btn btn-primary">{t('nav.login')}</Link>
        </div>
      )}

      <style>{`
        .nav-link:hover {
          opacity: 1 !important;
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;

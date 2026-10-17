import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

const Hero = () => {
    const { t } = useLanguage();
    return (
        <section id="hero" style={{
            background: 'linear-gradient(135deg, var(--primary-dark-green) 0%, var(--primary-dark-green) 55%, var(--cream-bg) 55%)',
            minHeight: '85vh',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '0 2rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1.3fr',
                alignItems: 'center',
                gap: '2rem',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Left Content - Pushed more to left */}
                <div style={{ color: 'var(--white)', paddingLeft: '1rem' }}>
                    <p style={{
                        fontSize: '1rem',
                        marginBottom: '1.5rem',
                        opacity: 0.9
                    }}>
                        🌿 {t('hero.tagline')}
                    </p>

                    <h1 style={{
                        fontSize: '3.8rem',
                        marginBottom: '1.5rem',
                        color: 'var(--white)',
                        fontWeight: '700',
                        lineHeight: 1.1
                    }}>
                        {t('hero.title.line1')}<br />
                        <span style={{ color: 'var(--orange-cta)' }}>{t('hero.title.line2')}</span>
                    </h1>

                    <p style={{
                        fontSize: '1.1rem',
                        marginBottom: '2.5rem',
                        opacity: 0.85,
                        maxWidth: '420px',
                        lineHeight: 1.7
                    }}>
                        {t('hero.subtitle')}
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <Link to="/auth" className="btn btn-primary" style={{ fontSize: '1rem', padding: '1rem 2rem' }}>
                            {t('hero.cta')} <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Right - Larger Farmer Image */}
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '600px',
                        height: '520px',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                    }}>
                        <img
                            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=900&auto=format&fit=crop"
                            alt="Happy Farmer in field"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center'
                            }}
                        />
                    </div>

                    {/* Floating Stats Card */}
                    <div style={{
                        position: 'absolute',
                        bottom: '50px',
                        left: '0',
                        background: 'var(--white)',
                        padding: '1.2rem 1.5rem',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{
                            width: '45px',
                            height: '45px',
                            background: 'var(--light-green-tint)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem'
                        }}>
                            🛒
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-dark)' }}>Fertilizer Saved</div>
                            <div style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '1.1rem' }}>₹ 1,200</div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media (max-width: 1100px) {
          #hero > div {
            grid-template-columns: 1fr !important;
            text-align: center;
            padding: 4rem 1rem !important;
          }
          #hero {
            background: var(--primary-dark-green) !important;
            min-height: auto !important;
          }
          #hero h1 {
            font-size: 2.5rem !important;
          }
          #hero > div > div:first-child {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-left: 0 !important;
          }
          #hero > div > div:last-child {
            display: none;
          }
        }
      `}</style>
        </section>
    );
};

export default Hero;

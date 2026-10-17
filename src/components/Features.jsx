import React from 'react';
import { WifiOff, Bell, MessageCircle, TrendingUp, Shield } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const Features = () => {
    const { t } = useLanguage();
    const features = [
        {
            icon: <WifiOff size={28} />,
            title: t('feature.offline.title'),
            desc: t('feature.offline.desc')
        },
        {
            icon: <Bell size={28} />,
            title: t('feature.alerts.title'),
            desc: t('feature.alerts.desc')
        },
        {
            icon: <MessageCircle size={28} />,
            title: t('feature.chat.title'),
            desc: t('feature.chat.desc')
        },
        {
            icon: <TrendingUp size={28} />,
            title: t('feature.prices.title'),
            desc: t('feature.prices.desc')
        },
        {
            icon: <Shield size={28} />,
            title: t('feature.trust.title'),
            desc: t('feature.trust.desc')
        }
    ];

    return (
        <section id="features" className="section" style={{ background: 'var(--white)' }}>
            <div className="container">
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.2fr',
                    gap: '4rem',
                    alignItems: 'center'
                }}>
                    {/* Left - Farmer Image */}
                    <div style={{ position: 'relative' }}>
                        <img
                            src="https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=600"
                            alt="Farmer using smartphone in field"
                            style={{
                                width: '100%',
                                height: '400px',
                                objectFit: 'cover',
                                borderRadius: '20px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                            }}
                        />
                        {/* Decorative element */}
                        <div style={{
                            position: 'absolute',
                            top: '-20px',
                            right: '-20px',
                            width: '100px',
                            height: '100px',
                            background: 'var(--orange-cta)',
                            borderRadius: '50%',
                            opacity: 0.2,
                            zIndex: -1
                        }}></div>
                    </div>

                    {/* Right - Features */}
                    <div>
                        <span className="badge" style={{ marginBottom: '1rem' }}>{t('features.badge')}</span>
                        <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--primary-green)' }}>{t('features.title')}</span>
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            {t('features.subtitle')}
                        </p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1.5rem'
                        }}>
                            {features.map((feature, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'flex-start'
                                }}>
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        background: 'var(--light-green-tint)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--primary-green)',
                                        flexShrink: 0
                                    }}>
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h4 style={{ marginBottom: '0.3rem', fontSize: '1rem' }}>{feature.title}</h4>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media (max-width: 968px) {
          #features .container > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </section>
    );
};

export default Features;

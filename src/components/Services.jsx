import React from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

const Services = () => {
    const { t } = useLanguage();
    const services = [
        {
            title: t('service.buy.title'),
            subtitle: t('service.buy.subtitle'),
            desc: t('service.buy.desc'),
            image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=400&auto=format&fit=crop"
        },
        {
            title: t('service.sell.title'),
            subtitle: t('service.sell.subtitle'),
            desc: t('service.sell.desc'),
            image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=400&auto=format&fit=crop"
        },
        {
            title: t('service.inventory.title'),
            subtitle: t('service.inventory.subtitle'),
            desc: t('service.inventory.desc'),
            image: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=400&auto=format&fit=crop"
        },
        {
            title: t('service.loan.title'),
            subtitle: t('service.loan.subtitle'),
            desc: t('service.loan.desc'),
            image: "https://images.unsplash.com/photo-1560693225-b8507d6f3aa9?q=80&w=400&auto=format&fit=crop"
        }
    ];

    return (
        <section id="services" className="section" style={{ background: 'var(--cream-bg)' }}>
            <div className="container">
                <h2 className="section-title">
                    <span style={{ color: 'var(--primary-green)' }}>{t('services.title')}</span>
                </h2>
                <p className="section-subtitle">
                    {t('services.subtitle')}
                </p>

                <div className="grid-4" style={{ marginTop: '3rem' }}>
                    {services.map((service, index) => (
                        <div key={index} className="card" style={{ cursor: 'pointer' }}>
                            <img
                                src={service.image}
                                alt={service.title}
                                className="card-image"
                            />
                            <div className="card-content">
                                <span className="badge" style={{ marginBottom: '0.8rem', display: 'inline-block' }}>
                                    {service.subtitle}
                                </span>
                                <h3 className="card-title">{service.title}</h3>
                                <p className="card-text">{service.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;

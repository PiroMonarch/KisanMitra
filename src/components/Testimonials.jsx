import React from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const Testimonials = () => {
    const { t } = useLanguage();
    const testimonials = [
        {
            name: "Rajesh Kumar",
            location: "Haryana",
            text: t('testimonial.1'),
            rating: 5,
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
        },
        {
            name: "Sunita Devi",
            location: "Punjab",
            text: t('testimonial.2'),
            rating: 5,
            image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100&auto=format&fit=crop"
        },
        {
            name: "Mohan Singh",
            location: "Uttar Pradesh",
            text: t('testimonial.3'),
            rating: 5,
            image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop"
        }
    ];

    return (
        <section className="section" style={{ background: 'var(--cream-bg)' }}>
            <div className="container">
                <h2 className="section-title">
                    <span style={{ color: 'var(--primary-green)' }}>{t('testimonials.title')}</span>
                </h2>
                <p className="section-subtitle">
                    {t('testimonials.subtitle')}
                </p>

                <div className="grid-3" style={{ marginTop: '3rem' }}>
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="card" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} size={18} fill="#e8a23a" color="#e8a23a" />
                                ))}
                            </div>
                            <p style={{
                                color: 'var(--text-dark)',
                                marginBottom: '1.5rem',
                                fontStyle: 'italic',
                                lineHeight: 1.7
                            }}>
                                "{testimonial.text}"
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <img
                                    src={testimonial.image}
                                    alt={testimonial.name}
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        objectFit: 'cover'
                                    }}
                                />
                                <div>
                                    <h4 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>{testimonial.name}</h4>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{testimonial.location}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;

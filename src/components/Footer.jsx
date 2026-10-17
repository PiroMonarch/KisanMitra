import React from 'react';
import { Leaf, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const Footer = () => {
    const { t } = useLanguage();
    return (
        <footer id="contact" style={{
            background: 'var(--primary-dark-green)',
            color: 'var(--white)',
            paddingTop: '4rem',
            paddingBottom: '2rem'
        }}>
            <div className="container">
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '3rem',
                    marginBottom: '3rem'
                }}>

                    {/* Brand */}
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '1.4rem',
                            fontWeight: 'bold',
                            marginBottom: '1rem',
                            fontFamily: 'var(--font-heading)'
                        }}>
                            <Leaf size={24} color="#e8a23a" />
                            Kisanmitr
                        </div>
                        <p style={{ opacity: 0.7, lineHeight: '1.8', fontSize: '0.95rem' }}>
                            {t('footer.tagline')}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <a href="#" style={{ opacity: 0.7 }}><Facebook size={20} /></a>
                            <a href="#" style={{ opacity: 0.7 }}><Twitter size={20} /></a>
                            <a href="#" style={{ opacity: 0.7 }}><Instagram size={20} /></a>
                            <a href="#" style={{ opacity: 0.7 }}><Youtube size={20} /></a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 style={{ marginBottom: '1.5rem', color: 'var(--orange-cta)', fontFamily: 'var(--font-heading)' }}>{t('footer.links.title')}</h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <li><a href="#" style={{ opacity: 0.8 }}>{t('footer.links.home')}</a></li>
                            <li><a href="#" style={{ opacity: 0.8 }}>{t('footer.links.buy')}</a></li>
                            <li><a href="#" style={{ opacity: 0.8 }}>{t('footer.links.sell')}</a></li>
                            <li><a href="#" style={{ opacity: 0.8 }}>{t('footer.links.loans')}</a></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 style={{ marginBottom: '1.5rem', color: 'var(--orange-cta)', fontFamily: 'var(--font-heading)' }}>{t('footer.resources.title')}</h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <li><a href="#" style={{ opacity: 0.8 }}>{t('footer.resources.help')}</a></li>
                            <li><a href="#" style={{ opacity: 0.8 }}>{t('footer.resources.privacy')}</a></li>
                            <li><a href="#" style={{ opacity: 0.8 }}>{t('footer.resources.terms')}</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 style={{ marginBottom: '1.5rem', color: 'var(--orange-cta)', fontFamily: 'var(--font-heading)' }}>{t('footer.contact.title')}</h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', opacity: 0.8 }}>
                                <Phone size={18} /> +91 98765 43210
                            </li>
                            <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', opacity: 0.8 }}>
                                <Mail size={18} /> support@kisanmitr.com
                            </li>
                            <li style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', opacity: 0.8 }}>
                                <MapPin size={18} /> New Delhi, India
                            </li>
                        </ul>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '2rem',
                    textAlign: 'center',
                    opacity: 0.6,
                    fontSize: '0.9rem'
                }}>
                    {t('footer.copyright')}
                </div>
            </div>
        </footer>
    );
};

export default Footer;

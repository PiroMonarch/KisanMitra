import React from 'react';
import { ShoppingCart, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import LanguageSelector from './LanguageSelector.jsx';

const BuyerNavbar = ({ activeTab, onTabChange, cartCount, orderCount }) => {
  const { t } = useLanguage();
  const navItems = [
    { id: 'shop', label: t('buyer.nav.shop') },
    { id: 'cart', label: t('buyer.nav.cart') },
    { id: 'subscriptions', label: t('buyer.nav.subscriptions') },
    { id: 'orders', label: t('buyer.nav.orders') }
  ];
  const handleLogout = () => {
    localStorage.removeItem('kisanmitr_token');
    localStorage.removeItem('kisanmitr_user');
    window.location.href = '/';
  };

  return (
    <nav className="dashboard-nav buyer-nav">
      <div className="nav-brand">
        <ShoppingCart size={20} />
        {t('dashboard.buyer.title')}
      </div>
      <div className="nav-links">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeTab === item.id ? 'active' : ''}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
            {item.id === 'cart' && cartCount > 0 && (
              <span className="cart-count">{cartCount}</span>
            )}
            {item.id === 'orders' && orderCount > 0 && (
              <span className="cart-count">{orderCount}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <LanguageSelector />
        <button className="logout" onClick={handleLogout}>
          <LogOut size={16} /> {t('logout')}
        </button>
        <button className="profile-button" onClick={() => onTabChange('profile')} aria-label={t('buyer.nav.profile')}>
          <span>P</span>
        </button>
      </div>
    </nav>
  );
};

export default BuyerNavbar;

import React from 'react';
import { Leaf, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import LanguageSelector from './LanguageSelector.jsx';

const FarmerNavbar = ({ activeTab, onTabChange, orderCount }) => {
  const { t } = useLanguage();
  // call agent removed
  const navItems = [
    { id: 'sell', label: t('farmer.nav.sell') },
    { id: 'orders', label: t('farmer.nav.orders') },
    { id: 'group', label: t('farmer.nav.group') },
    { id: 'resources', label: t('farmer.nav.resources') },
    { id: 'loans', label: t('farmer.nav.loans') },
  ];
  const handleLogout = () => {
    localStorage.removeItem('kisanmitr_token');
    localStorage.removeItem('kisanmitr_user');
    window.location.href = '/';
  };

  return (
    <nav className="dashboard-nav">
      <div className="nav-brand">
        <Leaf size={22} color="#e8a23a" fill="#e8a23a" />
        {t('dashboard.farmer.title')}
      </div>
      <div className="nav-links">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeTab === item.id ? 'active' : ''}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
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
        <button className="profile-button" onClick={() => onTabChange('profile')} aria-label={t('farmer.nav.profile')}>
          <span>P</span>
        </button>
      </div>
    </nav>
  );
};

export default FarmerNavbar;

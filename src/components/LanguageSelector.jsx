import React from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <select
      className="lang-select"
      value={language}
      onChange={(event) => setLanguage(event.target.value)}
      aria-label="Language selector"
    >
      <option value="en">{t('lang.english')}</option>
      <option value="hi">{t('lang.hindi')}</option>
      <option value="pa">{t('lang.punjabi')}</option>
    </select>
  );
};

export default LanguageSelector;

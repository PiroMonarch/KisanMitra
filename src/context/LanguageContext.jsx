import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../utils/api.js';
import { translations } from '../i18n/translations.js';

const DEFAULT_LANG = 'en';
const LanguageContext = createContext(null);

const getInitialLang = () => {
  const stored = localStorage.getItem('kisanmitr_lang');
  if (stored) return stored;
  try {
    const user = JSON.parse(localStorage.getItem('kisanmitr_user'));
    if (user?.language) return user.language;
  } catch (error) {
    return DEFAULT_LANG;
  }
  return DEFAULT_LANG;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(getInitialLang);

  useEffect(() => {
    localStorage.setItem('kisanmitr_lang', language);
  }, [language]);

  const persistLanguage = useCallback(async (nextLang) => {
    try {
      const userRaw = localStorage.getItem('kisanmitr_user');
      const token = localStorage.getItem('kisanmitr_token');
      if (!userRaw || !token) return;
      const response = await fetch(`${API_BASE}/api/users/language`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ language: nextLang })
      });
      const data = await response.json();
      if (response.ok && data.user) {
        localStorage.setItem('kisanmitr_user', JSON.stringify(data.user));
      }
    } catch (error) {
      // no-op fallback to local storage
    }
  }, []);

  const changeLanguage = useCallback((nextLang) => {
    setLanguage(nextLang);
    persistLanguage(nextLang);
  }, [persistLanguage]);

  const t = useCallback((key, fallback) => {
    const value = translations?.[language]?.[key];
    if (value) return value;
    const english = translations?.[DEFAULT_LANG]?.[key];
    return english || fallback || key;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage: changeLanguage, t }), [language, changeLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
};

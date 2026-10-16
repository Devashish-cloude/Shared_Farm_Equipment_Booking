import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  LanguageCode,
  SUPPORTED_LANGUAGES,
  normalizeLanguageCode,
  translations,
} from '../i18n/translations';

export type { LanguageCode } from '../i18n/translations';
export { SUPPORTED_LANGUAGES, normalizeLanguageCode } from '../i18n/translations';

interface LanguageContextType {
  language: LanguageCode;
  selectedLangDisplay: string;
  setLanguage: (lang: string | LanguageCode) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'shared_farm_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeLanguageCode(saved) : 'en';
  });

  const setLanguage = (lang: string | LanguageCode) => {
    const normalized = normalizeLanguageCode(lang);
    setLanguageState(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalized;
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
    // Listen to storage events in case changed across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setLanguageState(normalizeLanguageCode(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [language]);

  const t = (key: string, defaultText?: string): string => {
    const currentDict = translations[language] || translations.en;
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to English
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return defaultText ?? key;
  };

  const currentOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        selectedLangDisplay: currentOption.display,
        setLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

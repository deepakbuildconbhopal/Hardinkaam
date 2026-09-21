import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, TRANSLATIONS } from '../utils/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  translateCategory: (catIdOrName: string) => string;
  isHindi: boolean;
}

const LANGUAGE_STORAGE_KEY = 'hardinkaam_selected_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default language is HINDI ('hi')
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
        return stored as SupportedLanguage;
      }
    } catch (e) {
      console.warn('Language storage load notice:', e);
    }
    return 'hi'; // Default Hindi
  });

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch (e) {
      console.warn('Language storage save notice:', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to Hindi, then English, then given fallback or key
    if (TRANSLATIONS['hi'] && TRANSLATIONS['hi'][key]) {
      return TRANSLATIONS['hi'][key];
    }
    if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) {
      return TRANSLATIONS['en'][key];
    }
    return fallback || key;
  };

  const translateCategory = (catIdOrName: string): string => {
    const key = catIdOrName.toLowerCase().startsWith('cat_')
      ? catIdOrName.toLowerCase()
      : `cat_${catIdOrName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const translated = t(key);
    if (translated !== key) return translated;

    // Common category fallbacks
    const match = Object.keys(TRANSLATIONS[language]).find(
      (k) => k.startsWith('cat_') && catIdOrName.toLowerCase().includes(k.replace('cat_', ''))
    );
    if (match) return TRANSLATIONS[language][match];

    return catIdOrName;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateCategory,
        isHindi: language === 'hi',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageInfo } from './languages';
import type { LanguageCode, LanguageInfo } from './languages';
import type { TranslationSchema } from './types';
import { en } from './locales/en';
import { tr } from './locales/tr';
import { ru } from './locales/ru';

export * from './languages';
export * from './types';

const LOCALES: Record<LanguageCode, TranslationSchema> = {
  en,
  tr,
  ru,
};

const STORAGE_KEY = 'navisecret:lang';

function detectInitialLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && (saved === 'en' || saved === 'tr' || saved === 'ru')) {
      return saved;
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('tr')) return 'tr';
      if (browserLang.startsWith('ru')) return 'ru';
    }
  } catch {
    /* ignore storage errors */
  }
  return DEFAULT_LANGUAGE;
}

// Type-safe key path accessor (e.g. 'common.save', 'auth.signInButton')
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

export type Paths<T> = T extends object
  ? { [K in keyof T]-?: K extends string ? K | Join<K, Paths<T[K]>> : never }[keyof T]
  : never;

export type TranslationKeyPath = Paths<TranslationSchema>;

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  languages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(detectInitialLanguage);

  const setLanguage = useCallback((newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      /* ignore */
    }
  }, [language]);

  const currentDict = useMemo(() => {
    return LOCALES[language] || LOCALES[DEFAULT_LANGUAGE];
  }, [language]);

  const fallbackDict = LOCALES[DEFAULT_LANGUAGE];

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const segments = path.split('.');
      let currentVal: any = currentDict;
      let fallbackVal: any = fallbackDict;

      for (const seg of segments) {
        if (currentVal && typeof currentVal === 'object') {
          currentVal = currentVal[seg];
        } else {
          currentVal = undefined;
        }

        if (fallbackVal && typeof fallbackVal === 'object') {
          fallbackVal = fallbackVal[seg];
        } else {
          fallbackVal = undefined;
        }
      }

      let text = typeof currentVal === 'string' ? currentVal : typeof fallbackVal === 'string' ? fallbackVal : path;

      if (params && typeof text === 'string') {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        });
      }

      return text;
    },
    [currentDict, fallbackDict]
  );

  const currentLanguageInfo = useMemo(() => {
    return getLanguageInfo(language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageInfo,
    }),
    [language, setLanguage, t, currentLanguageInfo]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return ctx;
}

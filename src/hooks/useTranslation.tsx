'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { en, type Dictionary } from '@/locales/en';
import { th } from '@/locales/th';

export type Language = 'en' | 'th';

const dictionaries: Record<Language, Dictionary> = { en, th };

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

function makeT(lang: Language) {
  const dict = dictionaries[lang];
  return function t(path: string): string {
    const keys = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = dict;
    for (const key of keys) {
      if (result == null || result[key] === undefined) {
        // Fallback to English
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fallback: any = dictionaries['en'];
        for (const fKey of keys) {
          if (fallback == null || fallback[fKey] === undefined) return path;
          fallback = fallback[fKey];
        }
        return typeof fallback === 'string' ? fallback : path;
      }
      result = result[key];
    }
    return typeof result === 'string' ? result : path;
  };
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved language on mount (client only)
  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Language;
    if (saved === 'en' || saved === 'th') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
  }, []);

  // `t` is a plain function that doesn't change identity per language —
  // it's derived purely from `language` and memoized with useMemo.
  const t = useMemo(() => makeT(language), [language]);

  // Memoize the context value so consumers only re-render when language changes.
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
  return ctx;
}

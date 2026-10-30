'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SUPPORTED_LANGUAGES,
  LanguageOption,
  TranslationKey,
  TRANSLATIONS,
} from './i18n';

interface LanguageContextType {
  primaryLang: string;
  secondaryLang: string;
  primaryOption: LanguageOption;
  secondaryOption: LanguageOption;
  setPrimaryLang: (code: string) => void;
  setSecondaryLang: (code: string) => void;
  swapLanguages: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
  tSec: (key: TranslationKey, fallback?: string) => string;
  hoverTranslationsEnabled: boolean;
  setHoverTranslationsEnabled: (enabled: boolean) => void;
  dualSubtitlesEnabled: boolean;
  setDualSubtitlesEnabled: (enabled: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [primaryLang, setPrimaryLangState] = useState<string>('en');
  const [secondaryLang, setSecondaryLangState] = useState<string>('es');
  const [hoverTranslationsEnabled, setHoverTranslationsEnabled] = useState<boolean>(true);
  const [dualSubtitlesEnabled, setDualSubtitlesEnabled] = useState<boolean>(false);

  // Load persisted preferences from localStorage if available
  useEffect(() => {
    try {
      const savedPrimary = localStorage.getItem('accord_primary_lang');
      const savedSecondary = localStorage.getItem('accord_secondary_lang');
      const savedDual = localStorage.getItem('accord_dual_subtitles');
      if (savedPrimary) setPrimaryLangState(savedPrimary);
      if (savedSecondary) setSecondaryLangState(savedSecondary);
      if (savedDual) setDualSubtitlesEnabled(savedDual === 'true');
    } catch {
      // Ignore in SSR
    }
  }, []);

  const setPrimaryLang = (code: string) => {
    setPrimaryLangState(code);
    try {
      localStorage.setItem('accord_primary_lang', code);
    } catch {}

    // If new primary equals secondary, auto-switch secondary to opposite primary (e.g. en <-> es)
    if (code === secondaryLang) {
      const nextSecondary = code === 'es' ? 'en' : 'es';
      setSecondaryLangState(nextSecondary);
      try {
        localStorage.setItem('accord_secondary_lang', nextSecondary);
      } catch {}
    }
  };

  const setSecondaryLang = (code: string) => {
    setSecondaryLangState(code);
    try {
      localStorage.setItem('accord_secondary_lang', code);
    } catch {}
  };

  const swapLanguages = () => {
    const currentP = primaryLang;
    const currentS = secondaryLang;
    setPrimaryLangState(currentS);
    setSecondaryLangState(currentP);
    try {
      localStorage.setItem('accord_primary_lang', currentS);
      localStorage.setItem('accord_secondary_lang', currentP);
    } catch {}
  };

  const primaryOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === primaryLang) || SUPPORTED_LANGUAGES[0];
  const secondaryOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === secondaryLang) || SUPPORTED_LANGUAGES[1];

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = (TRANSLATIONS as any)[primaryLang] || TRANSLATIONS.en;
    return langDict[key] || TRANSLATIONS.en[key] || fallback || key;
  };

  const tSec = (key: TranslationKey, fallback?: string): string => {
    const langDict = (TRANSLATIONS as any)[secondaryLang] || TRANSLATIONS.es;
    return langDict[key] || TRANSLATIONS.es[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        primaryLang,
        secondaryLang,
        primaryOption,
        secondaryOption,
        setPrimaryLang,
        setSecondaryLang,
        swapLanguages,
        t,
        tSec,
        hoverTranslationsEnabled,
        setHoverTranslationsEnabled,
        dualSubtitlesEnabled,
        setDualSubtitlesEnabled,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

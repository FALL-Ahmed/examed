'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Lang, TranslationKey, translations } from '@/lib/i18n';

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  isRTL: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    const saved = (localStorage.getItem('lang') as Lang) || 'fr';
    applyLang(saved);
    setLangState(saved);
  }, []);

  function applyLang(l: Lang) {
    const isRTL = l === 'ar';
    document.documentElement.lang = l;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    // Switch font class
    document.documentElement.classList.toggle('font-arabic', isRTL);
  }

  function setLang(l: Lang) {
    localStorage.setItem('lang', l);
    applyLang(l);
    setLangState(l);
  }

  function t(key: TranslationKey, fallback?: string): string {
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations.fr as Record<string, string>)[key]
      ?? fallback
      ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRTL: lang === 'ar' }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

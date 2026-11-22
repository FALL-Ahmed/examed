'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Lang, TranslationKey, translations } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth-store';

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  isRTL: boolean;
  /** true pour un résident connecté : interface verrouillée en français */
  langLocked: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
  isRTL: false,
  langLocked: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [chosenLang, setLangState] = useState<Lang>('fr');
  // Résidanat : une fois connecté, tout est en français (la page d'accueil publique reste bilingue)
  const langLocked = useAuthStore((st) => st.user?.profession === 'resident');
  const lang: Lang = langLocked ? 'fr' : chosenLang;

  useEffect(() => {
    const saved = (localStorage.getItem('lang') as Lang) || 'fr';
    setLangState(saved);
  }, []);

  useEffect(() => { applyLang(lang); }, [lang]);

  function applyLang(l: Lang) {
    const isRTL = l === 'ar';
    document.documentElement.lang = l;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    // Switch font class
    document.documentElement.classList.toggle('font-arabic', isRTL);
  }

  function setLang(l: Lang) {
    if (langLocked) return;
    localStorage.setItem('lang', l);
    setLangState(l);
  }

  function t(key: TranslationKey, fallback?: string): string {
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations.fr as Record<string, string>)[key]
      ?? fallback
      ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRTL: lang === 'ar', langLocked }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

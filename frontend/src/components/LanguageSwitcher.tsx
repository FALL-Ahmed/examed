'use client';
import { useLang } from '@/components/LanguageProvider';

function Flag() {
  return <span className="fi fi-mr rounded-sm" style={{ fontSize: '1.1em', lineHeight: 1 }} />;
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  const next = lang === 'fr' ? 'ar' : 'fr';
  const nextLabel = lang === 'fr' ? 'العربية' : 'Français';

  return (
    <button
      onClick={() => setLang(next)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
        hover:bg-white/10 text-white/60 hover:text-white ${className}`}
    >
      <Flag />
      <span>{nextLabel}</span>
    </button>
  );
}

export function LanguageSwitcherLight({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  const next = lang === 'fr' ? 'ar' : 'fr';
  const nextLabel = lang === 'fr' ? 'العربية' : 'Français';

  return (
    <button
      onClick={() => setLang(next)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
        text-slate-400 hover:bg-slate-800 hover:text-white transition ${className}`}
    >
      <Flag />
      <span>{nextLabel}</span>
    </button>
  );
}

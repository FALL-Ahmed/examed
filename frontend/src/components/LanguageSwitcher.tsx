'use client';
import { useLang } from '@/components/LanguageProvider';

interface Props {
  className?: string;
  /** 'icon' shows flag+code, 'full' shows full name */
  variant?: 'icon' | 'full';
}

export function LanguageSwitcher({ className = '', variant = 'full' }: Props) {
  const { lang, setLang } = useLang();

  const options = [
    { code: 'fr' as const, label: 'Français', flag: '🇫🇷', short: 'FR' },
    { code: 'ar' as const, label: 'العربية', flag: '🇲🇷', short: 'ع' },
  ];

  const current = options.find(o => o.code === lang)!;
  const next = options.find(o => o.code !== lang)!;

  return (
    <button
      onClick={() => setLang(next.code)}
      title={`Switch to ${next.label}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
        hover:bg-white/10 text-white/60 hover:text-white ${className}`}
    >
      <span>{next.flag}</span>
      {variant === 'full' ? (
        <span>{next.label}</span>
      ) : (
        <span className="font-bold">{next.short}</span>
      )}
    </button>
  );
}

/** Variant for light backgrounds (admin sidebar) */
export function LanguageSwitcherLight({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  const next = lang === 'fr' ? 'ar' : 'fr';
  const nextLabel = lang === 'fr' ? 'العربية' : 'Français';
  const nextFlag = lang === 'fr' ? '🇲🇷' : '🇫🇷';

  return (
    <button
      onClick={() => setLang(next)}
      className={`flex items-center gap-2 px-3 py-2 w-full rounded-xl text-sm font-medium
        text-slate-400 hover:bg-slate-800 hover:text-white transition ${className}`}
    >
      <span>{nextFlag}</span>
      <span>{nextLabel}</span>
    </button>
  );
}

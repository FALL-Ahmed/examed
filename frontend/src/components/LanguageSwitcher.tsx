'use client';
import { useLang } from '@/components/LanguageProvider';

interface Props {
  className?: string;
  variant?: 'icon' | 'full';
}

function Flag({ code }: { code: 'mr' | 'fr' }) {
  return <span className={`fi fi-${code} rounded-sm`} style={{ fontSize: '1.1em', lineHeight: 1 }} />;
}

export function LanguageSwitcher({ className = '', variant = 'full' }: Props) {
  const { lang, setLang } = useLang();

  const options = [
    { code: 'fr' as const, label: 'Français', flagCode: 'fr' as const, short: 'FR' },
    { code: 'ar' as const, label: 'العربية',  flagCode: 'mr' as const, short: 'ع' },
  ];

  const next = options.find(o => o.code !== lang)!;

  return (
    <button
      onClick={() => setLang(next.code)}
      title={`Switch to ${next.label}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
        hover:bg-white/10 text-white/60 hover:text-white ${className}`}
    >
      <Flag code={next.flagCode} />
      {variant === 'full' ? <span>{next.label}</span> : <span className="font-bold">{next.short}</span>}
    </button>
  );
}

export function LanguageSwitcherLight({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  const next = lang === 'fr' ? 'ar' : 'fr';
  const nextLabel = lang === 'fr' ? 'العربية' : 'Français';
  const nextFlagCode = lang === 'fr' ? 'mr' : 'fr';

  return (
    <button
      onClick={() => setLang(next)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
        text-slate-400 hover:bg-slate-800 hover:text-white transition ${className}`}
    >
      <Flag code={nextFlagCode as 'mr' | 'fr'} />
      <span>{nextLabel}</span>
    </button>
  );
}

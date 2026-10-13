'use client';
import Link from 'next/link';
import { BookOpen, Trophy } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';

// Concours de la Rentrée — éléments partagés par les pages publiques
export const CONCOURS_STATE_KEY = 'concours_state';
export const CONCOURS_TEST_KEY = 'concours_test_state'; // test admin : ignore les dates, hors classement
export const WINNERS_COUNT = 10;

export const concoursHome = (target: string) => (target === 'SAGE_FEMME' ? '/concours/sage-femme' : '/concours');

// Couleurs par filière : sage-femme en rose comme l'Examen Blanc sage-femme
export function concoursTheme(target?: string) {
  const sf = target === 'SAGE_FEMME';
  return {
    bg: sf ? 'linear-gradient(145deg,#f48fb1 0%,#f06292 50%,#e91e8c 100%)' : 'linear-gradient(150deg,#0b1026 0%,#1a1040 55%,#2b1a06 100%)',
    accent: sf ? 'linear-gradient(135deg,#9f1239,#be185d)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
    headline: sf ? 'linear-gradient(135deg,#ffffff,#fce7f3)' : 'linear-gradient(135deg,#fde68a,#f59e0b)',
    accentText: sf ? 'text-white' : 'text-amber-300',
    card: sf ? 'bg-white/30 border-white/50' : 'bg-white/5 border-white/10',
    softCard: sf ? 'bg-white/20 border-white/40' : 'bg-white/[0.03] border-white/10',
    textDim: sf ? 'text-white/90' : 'text-white/60',
    textMuted: sf ? 'text-white/80' : 'text-white/50',
    textFaint: sf ? 'text-white/70' : 'text-white/40',
    input: sf
      ? 'bg-white/20 border-white/40 placeholder:text-white/60 focus:ring-white focus:border-white'
      : 'bg-white/5 border-white/10 placeholder:text-white/30 focus:ring-amber-400 focus:border-amber-400',
    choiceOn: sf ? 'border-white bg-white/30 text-white' : 'border-amber-400 bg-amber-400/15 text-white',
    choiceOff: sf ? 'border-white/40 bg-white/10 text-white/80 hover:border-white/70' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20',
    highlight: sf ? 'bg-white/35 border-white/70' : 'bg-amber-400/10 border-amber-400/30',
    badge: sf ? 'bg-white text-rose-700' : 'bg-amber-400 text-gray-900',
    spinner: sf ? 'border-white' : 'border-amber-400',
    shadow: sf ? 'shadow-pink-900/40' : 'shadow-amber-900/40',
    navBox: sf ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10',
    selectBg: sf ? '#be185d' : '#1f2937',
  };
}

export const PROFESSION = {
  INFIRMIER: { fr: 'Infirmier', ar: 'الممرضين' },
  SAGE_FEMME: { fr: 'Sage-femme', ar: 'القابلات' },
} as const;

export const WILAYAS = [
  'Hodh Ech Chargui', 'Hodh El Gharbi', 'Assaba', 'Gorgol', 'Brakna',
  'Trarza', 'Adrar', 'Dakhlet Nouadhibou', 'Tagant', 'Guidimaka',
  'Tiris Zemmour', 'Inchiri', 'Nouakchott Ouest', 'Nouakchott Nord', 'Nouakchott Sud',
  'Autre', // hors liste (étranger, wilaya non listée…)
];
export const WILAYAS_AR: Record<string, string> = {
  'Hodh Ech Chargui': 'الحوض الشرقي', 'Hodh El Gharbi': 'الحوض الغربي',
  'Assaba': 'العصابة', 'Gorgol': 'كركول', 'Brakna': 'البراكنة',
  'Trarza': 'الترارزة', 'Adrar': 'آدرار', 'Dakhlet Nouadhibou': 'داخلة نواذيبو',
  'Tagant': 'التاكانت', 'Guidimaka': 'كيدي ماغا', 'Tiris Zemmour': 'تيرس زمور',
  'Inchiri': 'إنشيري', 'Nouakchott Ouest': 'نواكشوط الغربية',
  'Nouakchott Nord': 'نواكشوط الشمالية', 'Nouakchott Sud': 'نواكشوط الجنوبية',
  'Autre': 'أخرى',
};

export const fmtDate = (d: string | Date, isAr: boolean) =>
  new Date(d).toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtTime = (d: string | Date, isAr: boolean) =>
  new Date(d).toLocaleTimeString(isAr ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });

// Score en % (0-100) → note sur 20
export const toNote20 = (score?: number | null) => Math.round(((score ?? 0) / 5) * 10) / 10;

export function readConcoursState(test = false): any | null {
  try { return JSON.parse(localStorage.getItem(test ? CONCOURS_TEST_KEY : CONCOURS_STATE_KEY) || 'null'); } catch { return null; }
}

export function Spinner({ target }: { target?: string }) {
  const th = concoursTheme(target);
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: th.bg }}>
      <div className={`w-10 h-10 border-4 ${th.spinner} border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}

export function ConcoursShell({ children, target = 'INFIRMIER' }: { children: React.ReactNode; target?: string }) {
  const { lang, setLang } = useLang();
  const isAr = lang === 'ar';
  const th = concoursTheme(target);
  return (
    <div className="min-h-screen" dir={isAr ? 'rtl' : 'ltr'} style={{ background: th.bg }}>
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <nav className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 max-w-5xl mx-auto">
        <Link href={concoursHome(target)} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: th.accent }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Al Bourour</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`flex items-center gap-1 p-1 border rounded-xl ${th.navBox}`}>
            {(['fr', 'ar'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${lang === l ? 'bg-white/25 text-white' : `${th.textMuted} hover:text-white`}`}>
                {l === 'fr' ? 'FR' : 'عربي'}
              </button>
            ))}
          </div>
          <Link href={`/concours/classement?target=${target}`}
            className={`flex items-center gap-1.5 ${th.textDim} hover:text-white text-sm font-medium transition`}>
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">{isAr ? 'الترتيب' : 'Classement'}</span>
          </Link>
        </div>
      </nav>
      <main className="relative z-10">{children}</main>
    </div>
  );
}

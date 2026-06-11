'use client';
import Link from 'next/link';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, ChevronRight, CheckCircle2, TrendingUp, Target as TargetIcon } from 'lucide-react';

type Target = 'INFIRMIER' | 'SAGE_FEMME' | 'BIOLOGISTE';

const PROFESSION: Record<Target, { fr: string; ar: string }> = {
  INFIRMIER:   { fr: 'Infirmier',   ar: 'الممرّضين'   },
  SAGE_FEMME:  { fr: 'Sage‑femme',  ar: 'القابلات'    },
  BIOLOGISTE:  { fr: 'Biologiste',  ar: 'البيولوجيين' },
};

const CONTENT: Record<Target, { fr: any; ar: any }> = {
  INFIRMIER: {
    fr: {
      label: 'Plateforme de préparation au concours de recrutement des',
      country: 'en Mauritanie',
      subtitle: 'Prépare le concours officiel en toute confiance',
      features: [
        'Plus de 700 QCM infirmiers, corrigés et commentés',
        'Suivi de ton évolution et comparaison nationale avec tes collègues',
        'Révision ciblée de tes points faibles, chapitre par chapitre',
      ],
      btn: "Commencer à m'entraîner maintenant",
      sub: 'La plateforme Al Bourour vous accompagne jusqu\'au jour du concours de recrutement.',
    },
    ar: {
      label: 'منصّة تدريب لمسابقة توظيف',
      country: 'في موريتانيا',
      subtitle: 'استعدّ للامتحان الرسمي باطمئنان',
      features: [
        'أكثر من 700 سؤال QCM خاصّة بالممرّضين مع تصحيح وشرح',
        'متابعة تطوّر مستواك ومقارنة نتائجك بزملائك على المستوى الوطني',
        'تحديد نِقَاط الضعف ومراجعتها محورًا بمحور',
      ],
      btn: 'ابدأ التدرّب الآن',
      sub: 'الوصول إلى المنصّة متاح 24/7 إلى غاية يوم المسابقة',
    },
  },
  SAGE_FEMME: {
    fr: {
      label: 'Plateforme de préparation au concours de recrutement des',
      country: 'en Mauritanie',
      subtitle: 'Prépare le concours officiel en toute confiance',
      features: [
        'Plus de 700 QCM sages‑femmes, corrigés et commentés par des gynécologues',
        'Suivi de ton évolution et comparaison nationale avec tes collègues',
        'Révision ciblée de tes points faibles, chapitre par chapitre',
      ],
      btn: "Commencer à m'entraîner maintenant",
      sub: 'La plateforme Al Bourour vous accompagne jusqu\'au jour du concours de recrutement.',
    },
    ar: {
      label: 'منصّة تدريب لمسابقة توظيف',
      country: 'في موريتانيا',
      subtitle: 'استعدّي للامتحان الرسمي بثقة',
      features: [
        'أكثر من 700 سؤال QCM خاصّ بالقابلات، مع تصحيح وشرح من أطبّاء نساء وتوليد',
        'متابعة تطوّر مستواك ومقارنة نتائجك بزميلاتك على المستوى الوطني',
        'مراجعة مركَّزة لنِقَاط الضعف، محورًا بمحور',
      ],
      btn: 'أبدأ التدرّب الآن',
      sub: 'منصّة البُرور ترافقكِ خطوة بخطوة إلى غاية يوم مسابقة توظيف القابلات.',
    },
  },
  BIOLOGISTE: {
    fr: {
      label: 'Plateforme de préparation au concours de recrutement des',
      country: 'en Mauritanie',
      subtitle: 'Prépare le concours officiel en toute confiance',
      features: [
        'Plus de 400 QCM biologistes, corrigés et commentés',
        'Suivi de ton évolution et comparaison nationale avec tes collègues',
        'Révision ciblée de tes points faibles, chapitre par chapitre',
      ],
      btn: "Commencer à m'entraîner maintenant",
      sub: 'La plateforme Al Bourour vous accompagne jusqu\'au jour du concours de recrutement.',
    },
    ar: {
      label: 'منصّة تدريب لمسابقة توظيف',
      country: 'في موريتانيا',
      subtitle: 'استعدّ للامتحان الرسمي بثقة',
      features: [
        'أكثر من 400 سؤال QCM خاصّ بالبيولوجيا، مع تصحيح وشرح',
        'متابعة تطوّر مستواك ومقارنة نتائجك بزملائك على المستوى الوطني',
        'مراجعة مركَّزة لنِقَاط الضعف، محورًا بمحور',
      ],
      btn: 'أبدأ التدرّب الآن',
      sub: 'منصّة البُرور ترافقك خطوة بخطوة إلى غاية يوم مسابقة توظيف البيولوجيين.',
    },
  },
};

const THEME: Record<Target, any> = {
  INFIRMIER: {
    bg:            'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)',
    glow1:         '#7c3aed',
    glow2:         '#6366f1',
    titleGrad:     'linear-gradient(135deg,#c4b5fd,#818cf8)',
    accent:        'linear-gradient(135deg,#7c3aed,#6366f1)',
    featuresBg:    'rgba(124,58,237,0.12)',
    featuresBorder: 'rgba(124,58,237,0.3)',
    dimText:       'text-violet-200/60',
    registerUrl:   '/register',
  },
  SAGE_FEMME: {
    bg:            'linear-gradient(145deg,#f48fb1 0%,#f06292 50%,#e91e8c 100%)',
    glow1:         '#9f1239',
    glow2:         '#be123c',
    titleGrad:     'linear-gradient(135deg,#ffffff,#fce7f3)',
    accent:        'linear-gradient(135deg,#9f1239,#be185d)',
    featuresBg:    'rgba(255,255,255,0.18)',
    featuresBorder: 'rgba(255,255,255,0.35)',
    dimText:       'text-white/90',
    registerUrl:   '/register?profession=sage_femme',
  },
  BIOLOGISTE: {
    bg:            'linear-gradient(145deg,#052e16 0%,#14532d 50%,#052e16 100%)',
    glow1:         '#16a34a',
    glow2:         '#15803d',
    titleGrad:     'linear-gradient(135deg,#86efac,#4ade80)',
    accent:        'linear-gradient(135deg,#16a34a,#15803d)',
    featuresBg:    'rgba(22,163,74,0.1)',
    featuresBorder: 'rgba(22,163,74,0.3)',
    dimText:       'text-emerald-200/60',
    registerUrl:   '/register?profession=biologiste',
  },
};

const ICONS = [CheckCircle2, TrendingUp, TargetIcon];

export function AnnoncePageContent({ target }: { target: Target }) {
  const { lang, setLang } = useLang();
  const isAr = lang === 'ar';
  const theme = THEME[target];
  const c = CONTENT[target][isAr ? 'ar' : 'fr'];
  const profName = PROFESSION[target][isAr ? 'ar' : 'fr'];

  return (
    <div className="min-h-screen relative" style={{ background: theme.bg }} dir={isAr ? 'rtl' : 'ltr'}>

      {/* Grid + glows — identique examen-blanc */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: theme.glow1 }} />
      <div className="fixed top-2/3 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: theme.glow2 }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: theme.accent }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Al Bourour</span>
        </Link>
        <div className={`flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl`}>
          <button onClick={() => setLang('fr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${!isAr ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/90'}`}>
            🇫🇷 Français
          </button>
          <button onClick={() => setLang('ar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${isAr ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/90'}`}>
            🇲🇷 العربية
          </button>
        </div>
      </nav>

      {/* Hero — mot professionnel géant */}
      <section className="relative z-10 text-center px-5 pt-4 pb-8">
        <p className={`text-sm font-semibold uppercase tracking-widest mb-3 ${theme.dimText}`}>
          {c.label}
        </p>

        {/* NOM PROFESSION */}
        <h1
          className="font-black block"
          style={{
            fontSize: 'clamp(2.8rem, 13vw, 5.5rem)',
            lineHeight: 1.1,
            background: theme.titleGrad,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            paddingBottom: '0.2em',
          }}
        >
          {profName}
        </h1>

        <p className={`text-lg font-bold mt-1 mb-5 ${theme.dimText}`}>
          {c.country}
        </p>

        {/* Séparateur */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="h-px flex-1 max-w-[80px] bg-white/10" />
          <p className="text-white/80 text-base font-semibold">{c.subtitle}</p>
          <div className="h-px flex-1 max-w-[80px] bg-white/10" />
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-5 pb-6 max-w-md mx-auto space-y-3">
        {c.features.map((f: string, i: number) => {
          const Icon = ICONS[i];
          return (
            <div
              key={i}
              className={`rounded-2xl px-5 py-4 flex items-center gap-4 ${isAr ? 'flex-row-reverse text-right' : ''}`}
              style={{ background: theme.featuresBg, border: `1px solid ${theme.featuresBorder}` }}
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: theme.accent }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-white font-bold text-base leading-snug">{f}</p>
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 pb-12 max-w-md mx-auto">
        <Link
          href={theme.registerUrl}
          className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-white text-base shadow-2xl transition active:scale-95 mb-3 ${isAr ? 'flex-row-reverse' : ''}`}
          style={{ background: theme.accent }}
        >
          {c.btn}
          <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isAr ? 'rotate-180' : ''}`} />
        </Link>
        <p className="text-white/40 text-xs text-center leading-relaxed px-2">
          {c.sub}
        </p>
      </section>

    </div>
  );
}

export default function AnnoncePage() {
  return <AnnoncePageContent target="INFIRMIER" />;
}

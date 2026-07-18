'use client';
import Link from 'next/link';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, ChevronRight } from 'lucide-react';

const THEME = {
  bg:             'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)',
  glow1:          '#7c3aed',
  glow2:          '#6366f1',
  titleGrad:      'linear-gradient(135deg,#c4b5fd,#818cf8)',
  accent:         'linear-gradient(135deg,#7c3aed,#6366f1)',
  featuresBg:     'rgba(124,58,237,0.12)',
  featuresBorder: 'rgba(124,58,237,0.3)',
  dimText:        'text-violet-200/60',
  registerUrl:    '/register',
};

const CONTENT = {
  fr: {
    label: 'Préparation du concours interne de reclassement',
    title: 'Infirmiers de santé',
    subtitle: 'Activez votre compte jusqu\'au jour du concours',
    features: [
      'Plus de 1000 QCM, corrigés et commentés',
      'Classement national en temps réel',
      'Examen blanc dans les conditions réelles du concours',
      'Fiches mémo pour réviser l\'essentiel',
    ],
    btn: "Commencer à m'entraîner maintenant",
    sub: "La plateforme Al Bourour vous accompagne jusqu'au jour du concours interne de reclassement.",
  },
  ar: {
    label: 'التحضير لمسابقة إعادة الترتيب الداخلية',
    title: 'الممرضين الصحيين',
    subtitle: 'فعّل حسابك إلى غاية يوم المسابقة',
    features: [
      'أكثر من 1000 سؤال QCM مع تصحيح وشرح',
      'ترتيب وطني في الوقت الفعلي',
      'امتحان تجريبي بنفس ظروف المسابقة الحقيقية',
      'بطاقات مراجعة لحفظ الأساسيات',
    ],
    btn: 'ابدأ التدرّب الآن',
    sub: 'منصّة البُرور ترافقكم إلى غاية يوم مسابقة إعادة الترتيب الداخلية.',
  },
};

const ICONS = ['✅', '📊', '🗓️', '📋'];

export default function AnnonceReclassementPage() {
  const { lang, setLang } = useLang();
  const isAr = lang === 'ar';
  const c = CONTENT[isAr ? 'ar' : 'fr'];

  return (
    <div className="min-h-screen relative" style={{ background: THEME.bg }} dir={isAr ? 'rtl' : 'ltr'}>

      {/* Grid + glows */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: THEME.glow1 }} />
      <div className="fixed top-2/3 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: THEME.glow2 }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.accent }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Al Bourour</span>
        </Link>
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
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

      {/* Hero */}
      <section className="relative z-10 text-center px-5 pt-4 pb-4">
        <p className={`text-base sm:text-lg font-semibold uppercase tracking-widest mb-2 ${THEME.dimText}`}>
          {c.label}
        </p>
        <h1
          className="font-black block"
          style={{
            fontSize: 'clamp(2.4rem, 11vw, 4.8rem)',
            lineHeight: 1.1,
            background: THEME.titleGrad,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            paddingBottom: '0.2em',
          }}
        >
          {c.title}
        </h1>
        <p className="text-white/80 text-sm font-semibold mt-2 mb-3">{c.subtitle}</p>
      </section>

      {/* Features */}
      <section className="relative z-10 px-5 pb-6 max-w-md mx-auto space-y-3">
        {c.features.map((f: string, i: number) => (
          <div
            key={i}
            className="rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{ background: THEME.featuresBg, border: `1px solid ${THEME.featuresBorder}` }}
          >
            <span className="text-3xl flex-shrink-0">{ICONS[i]}</span>
            <p className={`text-white font-bold text-base leading-snug ${isAr ? 'text-right' : ''}`}>
              {f.split(/(\d+ QCM|\d+ سؤال QCM)/i).map((part, j) =>
                /^\d+ QCM$|^\d+ سؤال QCM$/i.test(part)
                  ? <span key={j} className="font-black text-white px-2 py-0.5 rounded-lg mx-0.5" style={{ background: THEME.accent }}>{part}</span>
                  : part
              )}
            </p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 pb-12 max-w-md mx-auto">
        <Link
          href={THEME.registerUrl}
          className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-white text-base shadow-2xl transition active:scale-95 mb-3 ${isAr ? 'flex-row-reverse' : ''}`}
          style={{ background: THEME.accent }}
        >
          <span className="text-sm sm:text-base">{c.btn}</span>
          <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isAr ? 'rotate-180' : ''}`} />
        </Link>
        <p className="text-white/40 text-xs text-center leading-relaxed px-2">
          {c.sub}
        </p>
      </section>

    </div>
  );
}

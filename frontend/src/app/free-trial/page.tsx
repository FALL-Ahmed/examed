'use client';
import { useEffect, useState, Suspense, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowRight, CheckCircle2, XCircle, ChevronRight, Star, Zap, Users, BookOpenCheck, BarChart3, RotateCcw } from 'lucide-react';
import { publicApi, settingsApi } from '@/lib/api';

const pad = (n: number) => String(n).padStart(2, '0');

/* Composant isolé pour le compte à rebours — re-rend seul, sans toucher au parent */
const CountdownTimer = memo(({ isAr }: { isAr: boolean }) => {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = new Date('2026-04-29T23:59:59').getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setT({ h: 0, m: 0, s: 0 }); return; }
      setT({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <p className="text-white/80 text-xs font-semibold mb-1.5">
        ⏰ {isAr ? 'ينتهي العرض -50% خلال' : 'La promo -50% expire dans'}
      </p>
      <div className="flex items-end gap-1">
        {[
          { v: pad(t.h), l: isAr ? 'ساعة' : 'heures' },
          { v: pad(t.m), l: isAr ? 'دقيقة' : 'min' },
          { v: pad(t.s), l: isAr ? 'ثانية' : 'sec' },
        ].map(({ v, l }, i) => (
          <div key={i} className="flex items-end gap-1">
            <div className="flex flex-col items-center">
              <span className="bg-white text-violet-700 font-extrabold text-lg px-2.5 py-1 rounded-lg tabular-nums leading-none shadow-sm">{v}</span>
              <span className="text-white/60 text-[10px] mt-0.5">{l}</span>
            </div>
            {i < 2 && <span className="text-white/50 font-extrabold text-base mb-4 mx-0.5">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
});

const THEMES = [
  { key: 'Paludisme',  label: 'Paludisme',       labelAr: 'الملاريا' },
  { key: 'Pédiatrie',  label: 'Pédiatrie',        labelAr: 'طب الأطفال' },
  { key: 'Lavage',     label: 'Lavage des mains', labelAr: 'غسل اليدين' },
];

const FEATURES_FR = [
  { icon: BookOpenCheck, text: '+350 questions validées par des experts' },
  { icon: BarChart3,     text: 'Suivi de progression en temps réel' },
  { icon: RotateCcw,     text: 'Mode révision des erreurs' },
  { icon: Users,         text: 'Abonnements solo et groupe' },
  { icon: Zap,           text: 'Accès instantané après paiement' },
];

const FEATURES_AR = [
  { icon: BookOpenCheck, text: '+350 سؤال معتمد من خبراء' },
  { icon: BarChart3,     text: 'تتبع التقدم في الوقت الفعلي' },
  { icon: RotateCcw,     text: 'مراجعة الأخطاء المخصصة' },
  { icon: Users,         text: 'اشتراكات فردية وجماعية' },
  { icon: Zap,           text: 'وصول فوري بعد الدفع' },
];

function FreeTrialContent() {
  const searchParams = useSearchParams();
  const themeKey = searchParams.get('theme') || 'Paludisme';
  const langParam = searchParams.get('lang') === 'ar' ? 'ar' : 'fr';

  const [lang, setLang] = useState<'fr' | 'ar'>(langParam);
  const [questions, setQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState<any>(null);
  const [showMobilePromo, setShowMobilePromo] = useState(false);
  const [promoPopupDismissed, setPromoPopupDismissed] = useState(false);

  const isAr = lang === 'ar';
  const promoActive = new Date() <= new Date('2026-04-29T23:59:59');
  const promo = (p: number) => Math.round(p / 2);

  useEffect(() => {
    settingsApi.pricing().then((r) => setPricing(r.data)).catch(() => {});
  }, []);


  useEffect(() => {
    setLoading(true);
    setIndex(0); setSelected([]); setRevealed(false); setScore(0); setDone(false); setError('');
    publicApi.freeTrial(themeKey, lang)
      .then((r) => { setQuestions(r.data); setLoading(false); })
      .catch(() => { setError('Impossible de charger les questions.'); setLoading(false); });
  }, [themeKey, lang]);

  const q = questions[index];
  const choices = q ? ['A', 'B', 'C', 'D', ...(q.choiceE ? ['E'] : [])].filter((c) => q[`choice${c}`]) : [];
  const correctAnswers: string[] = q?.correctAnswer?.split(',').map((s: string) => s.trim()) ?? [];
  const isMultiple = correctAnswers.length > 1;

  function toggleChoice(c: string) {
    if (revealed) return;
    if (isMultiple) {
      setSelected((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
    } else {
      setSelected([c]);
    }
  }

  function validate() {
    if (selected.length === 0 || revealed) return;
    setRevealed(true);
    const isCorrect = correctAnswers.length === selected.length && correctAnswers.every((c) => selected.includes(c));
    if (isCorrect) setScore((s) => s + 1);
    if (index === 1 && !promoPopupDismissed) {
      setTimeout(() => setShowMobilePromo(true), 900);
    }
  }

  function next() {
    if (index + 1 >= questions.length) { setDone(true); return; }
    setIndex((i) => i + 1);
    setSelected([]);
    setRevealed(false);
  }

  const themeLabel = isAr
    ? (THEMES.find((t) => t.key === themeKey)?.labelAr ?? themeKey)
    : (THEMES.find((t) => t.key === themeKey)?.label ?? themeKey);

  const solo1m   = pricing?.solo1m?.price ?? 500;
  const solo3m   = pricing?.solo3m?.price ?? 1200;
  const groupMin = pricing?.groupMin ?? 5;
  const groupPerP = pricing?.groupPerP?.price ?? 400;

  const plans = [
    {
      label: isAr ? 'فردي — شهر' : 'Solo — 1 mois',
      href: '/register?plan=SOLO_1M',
      price: promoActive ? promo(solo1m) : solo1m,
      oldPrice: promoActive ? solo1m : null,
      badge: null,
      sub: isAr ? 'وصول كامل لمدة 30 يوماً' : 'Accès complet 30 jours',
    },
    {
      label: isAr ? 'فردي — 3 أشهر' : 'Solo — 3 mois',
      href: '/register?plan=SOLO_3M',
      price: promoActive ? promo(solo3m) : solo3m,
      oldPrice: promoActive ? solo3m : null,
      badge: isAr ? '⭐ الأفضل قيمة' : '⭐ Meilleure valeur',
      sub: `≈ ${promoActive ? promo(Math.round(solo3m / 3)) : Math.round(solo3m / 3)} MRU/${isAr ? 'شهر' : 'mois'}`,
    },
    {
      label: isAr ? `جماعي (${groupMin}+ أشخاص)` : `Groupe (${groupMin}+ pers.)`,
      href: '/register?plan=GROUP',
      price: promoActive ? promo(groupPerP * groupMin) : groupPerP * groupMin,
      oldPrice: promoActive ? groupPerP * groupMin : null,
      badge: null,
      sub: `${promoActive ? promo(groupPerP) : groupPerP} MRU / ${isAr ? 'شخص' : 'personne'}`,
    },
  ];

  const features = isAr ? FEATURES_AR : FEATURES_FR;

  // Done state computed values
  const scorePct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const isTop = scorePct >= 80;
  const isMid = scorePct >= 50 && scorePct < 80;
  const doneEmoji = isTop ? '🏆' : isMid ? '💪' : '📚';
  const doneGradient = isTop ? 'linear-gradient(135deg,#059669,#10b981)' : isMid ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : 'linear-gradient(135deg,#f59e0b,#f97316)';
  const doneTopLabel = isTop ? (isAr ? 'أفضل 20%' : 'top 20 %') : isMid ? (isAr ? 'أفضل 50%' : 'top 50 %') : null;
  const doneHeadline = isTop
    ? (isAr ? 'ممتاز! أنت في أفضل 20%' : 'Excellent ! Tu es dans le top 20 %')
    : isMid
    ? (isAr ? 'مستوى جيد — واصل التقدم !' : 'Bon niveau — continue sur ta lancée !')
    : (isAr ? 'Des lacunes à combler !' : 'Des lacunes à combler — c\'est normal !');
  const doneSubline = isTop
    ? (isAr ? 'مستواك قوي. تخيل ماذا ستحقق مع 350+ سؤال على 50 موضوعاً.' : 'Ton niveau est solide. Imagine tes résultats avec 350+ questions sur 50 thèmes.')
    : isMid
    ? (isAr ? 'بالتدريب المنتظم ستصل إلى القمة.' : 'Avec un entraînement ciblé, tu atteins le sommet.')
    : (isAr ? 'هذه الثغرات تختفي بسرعة مع التدريب المنظم.' : 'Ces lacunes disparaissent vite avec un entraînement ciblé.');
  const doneUnlocks = isAr
    ? ['350+ سؤال على 50+ موضوعاً', 'مراجعة مفصلة لكل خطأ', 'تتبع تقدمك أسبوعاً بأسبوع', 'وصول فوري بعد الدفع']
    : ['350+ questions sur 50+ thèmes', 'Révision détaillée de chaque erreur', 'Suivi de ta progression semaine par semaine', 'Accès immédiat après paiement'];

  /* ── Mobile promo popup (after 2nd question answered) ── */
  const MobilePromoPopup = () => {
    if (!showMobilePromo) return null;
    return (
      <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Backdrop — pas de fermeture au clic, uniquement via les boutons */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        {/* Sheet */}
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 animate-slide-up shadow-2xl">
          {/* Close */}
          <button onClick={() => { setShowMobilePromo(false); setPromoPopupDismissed(true); }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition text-lg font-bold">
            ×
          </button>

          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white' }}>
              🔥 {isAr ? 'عرض إطلاق حصري' : 'Offre de lancement exclusive'}
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 leading-tight">
              {isAr ? 'خصم 50% على جميع الخطط!' : '-50% sur tous les plans !'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {isAr ? '⏳ ينتهي الأربعاء 29 أبريل 2026' : '⏳ Valable jusqu\'au mercredi 29 avril 2026'}
            </p>
          </div>

          {/* Plans */}
          <div className="space-y-2.5 mb-5">
            {plans.map((plan, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 ${i === 1 ? 'border-violet-400 bg-violet-50' : 'border-gray-100 bg-gray-50'}`}>
                <div>
                  <p className="text-sm font-bold text-gray-900">{plan.label}</p>
                  <p className="text-xs text-gray-400">{plan.sub}</p>
                </div>
                <div className="text-right ml-3">
                  {plan.oldPrice && (
                    <p className="text-xs text-red-400 line-through font-semibold">
                      {plan.oldPrice} MRU <span className="text-gray-400 no-underline">{isAr ? '(السعر العادي)' : '(prix normal)'}</span>
                    </p>
                  )}
                  <p className="text-base font-extrabold text-gray-900">{plan.price} <span className="text-xs font-semibold text-gray-400">MRU</span></p>
                </div>
              </div>
            ))}
          </div>

          {/* Countdown */}
          {promoActive && (
            <div className="mb-4 flex justify-center p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <CountdownTimer isAr={isAr} />
            </div>
          )}

          {/* CTA */}
          <Link href="/register" onClick={() => setShowMobilePromo(false)}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-base hover:opacity-90 transition shadow-lg shadow-violet-300/50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <Star className="w-4 h-4" />
            {isAr ? 'إنشاء حسابي الآن' : 'Créer mon compte maintenant'}
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button onClick={() => { setShowMobilePromo(false); setPromoPopupDismissed(true); }}
            className="w-full text-center text-xs text-gray-400 mt-3 hover:text-gray-600 transition">
            {isAr ? 'ربما لاحقاً' : 'Plus tard'}
          </button>
        </div>
      </div>
    );
  };

  /* ── Right CTA panel ── */
  const CtaPanel = () => (
    <div className="lg:sticky lg:top-6 space-y-3">

      {/* Compact header */}
      <div className="rounded-2xl p-4 shadow-lg shadow-violet-200/50 text-center"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
        {promoActive && (
          <div className="flex justify-center mb-2">
            <CountdownTimer isAr={isAr} />
          </div>
        )}
        <p className="text-white font-extrabold text-base leading-snug">
          {isAr ? 'مستعد لرؤية جميع الأسئلة؟' : 'Prêt à voir toutes les questions ?'}
        </p>
        <p className="text-white/65 text-xs mt-0.5">
          {isAr ? '+350 سؤال · جميع المواضيع · تتبع التقدم' : '+350 questions · tous les thèmes · suivi de progression'}
        </p>
      </div>

      {/* CTA button — en haut, bien visible */}
      <Link href="/register"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-white text-sm hover:opacity-90 transition shadow-md shadow-violet-300/40"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
        <Star className="w-4 h-4" />
        {isAr ? 'إنشاء حسابي الآن' : 'Créer mon compte maintenant'}
        <ArrowRight className="w-4 h-4" />
      </Link>

      {/* Pricing cards — compact */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {isAr ? 'اختر عرضك' : 'Nos offres'}
        </p>
        {plans.map((plan, i) => (
          <Link key={i} href={plan.href}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition hover:border-violet-400 hover:bg-violet-50 ${i === 1 ? 'border-violet-300 bg-violet-50/50' : 'border-gray-100'}`}>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-900">{plan.label}</p>
                {plan.badge && <span className="text-xs text-violet-500 font-semibold">{plan.badge}</span>}
              </div>
              <p className="text-xs text-gray-400">{plan.sub}</p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              {plan.oldPrice && (
                <p className="text-xs text-red-400 line-through leading-none">{plan.oldPrice} MRU</p>
              )}
              <p className="text-sm font-extrabold text-gray-900">{plan.price} <span className="text-xs font-semibold text-gray-400">MRU</span></p>
            </div>
          </Link>
        ))}
      </div>

      {/* Payment methods */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 text-center">
          {isAr ? 'طرق الدفع المقبولة' : 'Paiement accepté via'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {[
            { name: 'Bankily', src: '/images/bankily.png' },
            { name: 'Masrivi', src: '/images/masrivi.png' },
            { name: 'Sedad',   src: '/images/sedad.png'   },
          ].map(({ name, src }) => (
            <img key={name} src={src} alt={name} className="h-7 w-auto object-contain" />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        {isAr ? 'لديك حساب؟' : 'Déjà inscrit ?'}{' '}
        <Link href="/login" className="text-violet-600 font-semibold hover:underline">
          {isAr ? 'تسجيل الدخول' : 'Connexion'}
        </Link>
      </p>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || questions.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 text-center px-6">
      <p className="text-gray-500">{error || 'Aucune question disponible pour ce thème pour le moment.'}</p>
      <Link href="/" className="text-violet-600 font-semibold hover:underline">← Retour à l'accueil</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir={isAr ? 'rtl' : 'ltr'}>
      <MobilePromoPopup />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition" title={isAr ? 'الصفحة الرئيسية' : 'Accueil'}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm text-gray-900">{isAr ? 'البورور' : 'Al Bourour'}</span>
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            🎁 {isAr ? `تجربة مجانية — ${themeLabel}` : `Essai gratuit — ${themeLabel}`}
          </span>
        </div>
        <button
          onClick={() => setLang(isAr ? 'fr' : 'ar')}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
          <span className={`fi fi-${isAr ? 'fr' : 'mr'} rounded-sm`} style={{ fontSize: '1em' }} />
          {isAr ? 'Français' : 'العربية'}
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start" dir={isAr ? 'rtl' : 'ltr'}>

          {/* ── LEFT : Quiz ── */}
          <div>
            {/* Sélecteur de thème */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {THEMES.map((t) => (
                <Link key={t.key} href={`/free-trial?theme=${t.key}`}
                  className={`text-sm font-semibold px-3 py-1.5 rounded-full border-2 transition
                    ${themeKey === t.key ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {isAr ? t.labelAr : t.label}
                </Link>
              ))}
            </div>

            {done ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Score header */}
                <div className="p-8 text-center border-b border-gray-50">
                  <div className="text-5xl mb-3">{doneEmoji}</div>
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                    style={{ background: doneGradient }}>
                    <span className="text-white font-extrabold text-xl">{scorePct}%</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 mb-1">{doneHeadline}</h2>
                  {doneTopLabel && (
                    <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-violet-100 text-violet-700 mb-2">{doneTopLabel}</span>
                  )}
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{doneSubline}</p>
                </div>
                {/* Unlock list + CTA */}
                <div className="px-8 py-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                    {isAr ? 'ما الذي ستفتحه بحساب كامل' : 'Ce que tu débloques avec un compte'}
                  </p>
                  <div className="space-y-2.5 mb-6">
                    {doneUnlocks.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/register"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-base hover:opacity-90 transition shadow-lg shadow-violet-300/40"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                    <Star className="w-4 h-4" />
                    {isAr ? 'إنشاء حسابي الآن' : 'Créer mon compte maintenant'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  {promoActive && (
                    <div className="mt-3 flex justify-center p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                      <CountdownTimer isAr={isAr} />
                    </div>
                  )}
                  <button onClick={() => { setIndex(0); setSelected([]); setRevealed(false); setScore(0); setDone(false); }}
                    className="w-full text-center text-xs text-gray-500 hover:text-gray-800 underline transition mt-4">
                    {isAr ? 'إعادة المحاولة' : 'Recommencer ce thème'}
                  </button>
                </div>
              </div>
            ) : (
              /* Question */
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gray-100">
                  <div className="h-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${(index / questions.length) * 100}%` }} />
                </div>
                <div className="p-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{themeLabel}</span>
                    <span className="text-xs font-semibold text-gray-400">{index + 1} / {questions.length}</span>
                  </div>
                  {isMultiple && !revealed && (
                    <p className="text-xs text-violet-600 font-semibold mb-4">
                      {isAr ? 'سؤال متعدد الإجابات — اختر كل الإجابات الصحيحة' : 'Plusieurs réponses possibles — sélectionnez toutes les bonnes'}
                    </p>
                  )}
                  <p className="text-lg font-bold text-gray-900 leading-snug mb-8" dir={isAr ? 'rtl' : 'ltr'}>{q.text}</p>
                  <div className="space-y-3 mb-6">
                    {choices.map((c) => {
                      const isCorrect = correctAnswers.includes(c);
                      const isSelected = selected.includes(c);
                      let cls = 'border-gray-200 bg-white text-gray-700 hover:border-violet-300 cursor-pointer';
                      if (!revealed && isSelected) cls = 'border-violet-500 bg-violet-50 text-violet-800 cursor-pointer';
                      if (revealed) {
                        if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800 cursor-default';
                        else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-700 cursor-default';
                        else cls = 'border-gray-100 bg-gray-50 text-gray-400 cursor-default';
                      }
                      return (
                        <button key={c} onClick={() => toggleChoice(c)}
                          className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left text-sm font-medium transition-all ${cls}`}>
                          <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 border-current
                            ${isMultiple ? 'rounded-md' : 'rounded-full'}`}>{c}</span>
                          <span className="flex-1">{q[`choice${c}`]}</span>
                          {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                          {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {revealed && q.explanation && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-sm text-blue-800 leading-relaxed">
                      <p className="font-bold mb-1">{isAr ? 'الشرح' : 'Explication'}</p>
                      <p dir={isAr ? 'rtl' : 'ltr'}>{q.explanation}</p>
                    </div>
                  )}
                  {!revealed ? (
                    <button onClick={validate} disabled={selected.length === 0}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition
                        ${selected.length > 0 ? 'text-white hover:opacity-90 shadow-md shadow-violet-200' : 'text-gray-400 bg-gray-100 cursor-not-allowed'}`}
                      style={selected.length > 0 ? { background: 'linear-gradient(135deg,#7c3aed,#6366f1)' } : {}}>
                      {isAr ? 'تحقق من إجابتي' : 'Valider ma réponse'}
                    </button>
                  ) : (
                    <button onClick={next}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white hover:opacity-90 transition shadow-md shadow-violet-200"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                      {index + 1 >= questions.length
                        ? (isAr ? 'عرض نتيجتي' : 'Voir mon résultat')
                        : (isAr ? 'السؤال التالي' : 'Question suivante')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT : CTA panel — desktop only ── */}
          <div className="hidden lg:block">
            <CtaPanel />
          </div>
        </div>

        {/* Mobile CTA strip (visible only on small screens, panel is hidden below lg) */}
        <div className="lg:hidden mt-6 text-center text-xs text-gray-400">
          {isAr ? 'تجربة مجانية · 3 مواضيع متاحة · ' : 'Essai gratuit · 3 thèmes disponibles · '}
          <Link href="/register" className="text-violet-600 font-semibold hover:underline">
            {isAr ? 'الوصول إلى 300+ سؤال ←' : 'Accéder aux 300+ questions →'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FreeTrialPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FreeTrialContent />
    </Suspense>
  );
}

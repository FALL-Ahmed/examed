'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useLang } from '@/components/LanguageProvider';
import {
  BookOpen, Zap, TrendingUp, CheckCircle2,
  Star, GraduationCap, ArrowRight, Target, Users, Clock,
} from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { LanguageSwitcherLight } from '@/components/LanguageSwitcher';

export default function LandingPage() {
  const router = useRouter();
  const { loadUser } = useAuthStore();
  const { t, lang } = useLang();
  const [pricing, setPricing] = useState<any>(null);
  const promoActive = new Date() <= new Date('2026-04-27T23:59:59');
  const promo = (p: number) => Math.round(p / 2);

  const FEATURES = [
    { icon: BookOpen,   title: t('landing.feat1.title'), subtitle: t('landing.feat1.subtitle'), desc: t('landing.feat1.desc'), color: '#818cf8' },
    { icon: Zap,        title: t('landing.feat2.title'), subtitle: t('landing.feat2.subtitle'), desc: t('landing.feat2.desc'), color: '#fbbf24' },
    { icon: TrendingUp, title: t('landing.feat3.title'), subtitle: t('landing.feat3.subtitle'), desc: t('landing.feat3.desc'), color: '#34d399' },
  ];

  const STATS = [
    { value: '300+', label: t('landing.stat.q') },
    { value: lang === 'ar' ? '🇲🇷 ع·ف' : '🇲🇷 FR·AR', label: t('landing.stat.themes') },
    { value: '✓', label: t('landing.stat.adapted') },
    { value: '10 min', label: t('landing.stat.available') },
  ];

  const TESTIMONIALS = [
    { name: t('landing.testi.1.name'), role: t('landing.testi.1.role'), text: t('landing.testi.1.text'), stars: 5 },
    { name: t('landing.testi.2.name'), role: t('landing.testi.2.role'), text: t('landing.testi.2.text'), stars: 5 },
    { name: t('landing.testi.3.name'), role: t('landing.testi.3.role'), text: t('landing.testi.3.text'), stars: 5 },
  ];

  const FREE_CHAPTERS = [
    { key: 'Paludisme',  name: lang === 'ar' ? 'الملاريا' : 'Paludisme' },
    { key: 'Pédiatrie',  name: lang === 'ar' ? 'طب الأطفال' : 'Pédiatrie' },
    { key: 'Lavage',     name: lang === 'ar' ? 'غسل اليدين' : 'Lavage des mains' },
  ];

  useEffect(() => {
    settingsApi.pricing().then((r) => setPricing(r.data)).catch(() => {});
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (u) router.replace(u.role === 'ADMIN' ? '/admin' : '/dashboard');
    });
  }, []);

  const line2prefix = t('landing.hero.line2prefix');

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-sm">
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shadow-violet-200"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-gray-900">{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-1 flex-nowrap flex-shrink-0">
            <LanguageSwitcherLight className="!text-gray-500 hover:!bg-gray-100 hover:!text-gray-900 flex-shrink-0" />
            <Link href="/login"
              className="text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition whitespace-nowrap flex-shrink-0">
              {t('auth.login.submit')}
            </Link>
            <Link href="/register"
              className="text-sm font-semibold text-white px-3 py-2 rounded-xl transition hover:opacity-90 shadow-md shadow-violet-200 whitespace-nowrap flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {t('auth.register.submit')} →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0f0a2e 0%,#1a1040 40%,#0d1b3e 100%)' }}>

        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#3b82f6,transparent)' }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-24 pb-32">
          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-violet-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 backdrop-blur-sm">
              <GraduationCap className="w-3.5 h-3.5" />
              {t('landing.hero.badge')}
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white mb-6">
              {t('landing.hero.line1')}<br />
              {line2prefix && <>{line2prefix}{' '}</>}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg,#a78bfa,#60a5fa)' }}>
                {t('landing.hero.accent')}
              </span>
            </h1>

            <p className="text-lg text-white/60 max-w-xl mb-10 leading-relaxed">
              {t('landing.hero.desc')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/free-trial"
                className="inline-flex items-center justify-center gap-2 text-white font-bold px-7 py-4 rounded-2xl text-sm transition hover:opacity-90 shadow-xl shadow-violet-900/50"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                {t('landing.hero.start')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 text-white/70 font-semibold px-7 py-4 rounded-2xl text-sm border border-white/15 hover:bg-white/10 transition">
                {t('landing.hero.hasAccount')}
              </Link>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-8 mt-12 pt-10 border-t border-white/10">
              <div>
                <p className="text-2xl font-extrabold text-white">300+</p>
                <p className="text-xs text-white/40 mt-0.5">{t('landing.stat.q')}</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">FR · AR</p>
                <p className="text-xs text-white/40 mt-0.5">{t('landing.stat.themes')}</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">100%</p>
                <p className="text-xs text-white/40 mt-0.5">{t('landing.stat.adapted')}</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">24/7</p>
                <p className="text-xs text-white/40 mt-0.5">{t('landing.stat.available')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Vidéo démo ── */}
      <section className="py-20 px-6 lg:px-10 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-3">
            {lang === 'ar' ? 'اكتشف المنصة' : 'Découvrez la plateforme'}
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            {lang === 'ar' ? 'شاهد كيف يعمل البورور' : 'Voyez Al Bourour en action'}
          </h2>
          <p className="text-gray-500 text-sm mb-10 max-w-lg mx-auto">
            {lang === 'ar'
              ? 'جولة سريعة في المنصة — من التدريب إلى نتائجك في دقائق'
              : 'Tour rapide de la plateforme — de l\'entraînement à vos résultats en quelques minutes'}
          </p>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-violet-100 border border-gray-100">
            <video
              src="/demo.mp4"
              controls
              playsInline
              preload="metadata"
              className="w-full aspect-video bg-gray-900"
              poster=""
            />
          </div>
        </div>
      </section>

      {/* ── Essai gratuit ── */}
      <section className="py-16 px-6 lg:px-10 bg-violet-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
              🎁 {lang === 'ar' ? 'تجربة مجانية' : 'Essai gratuit'}
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900">
              {lang === 'ar' ? 'ابدأ بهذه الفصول المجانية' : 'Commencez par ces chapitres offerts'}
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              {lang === 'ar' ? '30 سؤالاً مجانياً — بدون بطاقة بنكية' : '30 QCM gratuits — sans carte bancaire'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {FREE_CHAPTERS.map((ch) => (
              <Link key={ch.name} href={`/free-trial?theme=${ch.key}`}
                className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-violet-100 hover:border-violet-400 hover:shadow-lg transition-all group">
                <p className="font-bold text-gray-900 text-sm text-center">{ch.name}</p>
                <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full group-hover:bg-violet-100 transition">
                  {lang === 'ar' ? 'مجاناً' : 'Gratuit'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chiffres clés ── */}
      <section className="py-20 px-6 lg:px-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-2">
              {lang === 'ar' ? 'الأرقام الرئيسية' : 'Chiffres clés'}
            </p>
            <h2 className="text-3xl font-extrabold text-gray-900">
              {lang === 'ar' ? 'لماذا البورور ؟' : 'Pourquoi Al Bourour ?'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 300+ QCM */}
            <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
              <p className="text-3xl font-black text-gray-900">300+</p>
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  {lang === 'ar' ? 'سؤال لا غنى عنه' : 'QCM Incontournables'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'ar' ? 'تغطي 100% من البرنامج الرسمي الموريتاني' : 'Couvrant 100% du programme officiel mauritanien'}
                </p>
              </div>
            </div>
            {/* FR + AR */}
            <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">🌐</div>
              <p className="text-3xl font-black text-gray-900">FR · AR</p>
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  {lang === 'ar' ? 'متاح بالعربية والفرنسية' : 'Disponible en Arabe et Français'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'ar' ? 'غيّر اللغة بنقرة واحدة للفهم الكامل' : 'Changez de langue en un clic pour une compréhension totale'}
                </p>
              </div>
            </div>
            {/* Explications */}
            <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-gray-900">100%</p>
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  {lang === 'ar' ? 'فهم المفاهيم' : 'Comprenez les concepts'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'ar' ? 'كل سؤال مرفق بشرح طبي مفصّل' : "Questions suivies d'explications médicales"}
                </p>
              </div>
            </div>
            {/* Activation */}
            <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-black text-gray-900">10 min</p>
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  {lang === 'ar' ? 'تفعيل سريع' : 'Activation Express'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'ar' ? 'حسابك جاهز في 10 دقائق بعد الدفع' : 'Votre compte prêt en 10 min après paiement'}
                </p>
                <div className="flex gap-1.5 mt-2">
                  {['bankily', 'masrivi', 'sedad'].map((op) => (
                    <img key={op} src={`/images/${op}.png`} alt={op} className="h-5 w-auto object-contain opacity-70" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-28 px-6 lg:px-10 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-3">{t('landing.features.badge')}</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight max-w-lg">
              {t('landing.features.h2')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="group relative p-7 rounded-3xl border border-gray-100 bg-white hover:border-transparent hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
                  style={{ background: `linear-gradient(135deg,${f.color}08,${f.color}03)` }} />
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: `${f.color}15` }}>
                    <f.icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: f.color }}>{f.subtitle}</p>
                  <h3 className="font-extrabold text-gray-900 text-xl mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28 px-6 lg:px-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-3">{t('landing.testi.badge')}</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 max-w-lg">{t('landing.testi.h2')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((testi) => (
              <div key={testi.name} className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: testi.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6 text-sm">"{testi.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                    {testi.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{testi.name}</p>
                    <p className="text-xs text-gray-400">{testi.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-28 px-6 lg:px-10 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center">
            <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-3">{t('landing.pricing.badge')}</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900">{t('landing.pricing.h2')}</h2>
          </div>

          {promoActive && (
            <div className="mb-12 relative overflow-hidden rounded-3xl text-white text-center shadow-2xl shadow-red-300"
              style={{ background: 'linear-gradient(135deg,#b91c1c 0%,#dc2626 40%,#f97316 100%)' }}>
              <div className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,white 1px,transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="absolute top-0 left-1/4 w-64 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle,#fbbf24,transparent)' }} />
              <div className="relative px-8 py-8">
                <p className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
                  {lang === 'ar' ? '-50% على جميع الخطط !' : '-50% sur tous les plans !'}
                </p>
                <p className="text-white/80 text-base mb-4">
                  {lang === 'ar'
                    ? <>عرض الإطلاق — صالح حتى <strong className="text-white text-lg underline decoration-2">الاثنين 27 أبريل 2026</strong></>
                    : <>Offre de lancement — valable jusqu'au <strong className="text-white text-lg underline decoration-2">lundi 27 avril 2026</strong></>}
                </p>
                <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 text-white text-sm font-bold px-4 py-2 rounded-full backdrop-blur-sm">
                  ⏳ {lang === 'ar' ? 'الأسعار الأصلية مشطوبة أدناه' : 'Les prix barrés ci-dessous sont les prix normaux'}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {/* Solo 1 mois */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
                <Target className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-extrabold text-xl text-gray-900 mb-1">{t('landing.pricing.solo1.name')}</h3>
              <p className="text-gray-400 text-sm mb-6">{t('landing.pricing.solo1.desc')}</p>
              <div className="mb-6">
                {promoActive && <p className="text-2xl font-black text-red-400 line-through">{pricing?.solo1m?.price ?? 500} MRU</p>}
                <p className="text-4xl font-black text-gray-900">
                  {promoActive ? promo(pricing?.solo1m?.price ?? 500) : (pricing?.solo1m?.price ?? 500)}
                  <span className="text-lg font-semibold text-gray-400 ml-1">MRU</span>
                </p>
                {promoActive && <span className="inline-flex items-center gap-1 mt-2 bg-red-500 text-white text-sm font-black px-3 py-1.5 rounded-full">-50%</span>}
              </div>
              <Link href="/register?plan=SOLO_1M"
                className="block w-full text-center py-3 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition">
                {t('landing.pricing.start')}
              </Link>
            </div>

            {/* Solo 3 mois — populaire */}
            <div className="relative bg-white rounded-3xl border-2 border-violet-500 p-8 shadow-xl shadow-violet-100">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">{t('landing.pricing.popular')}</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
                <Zap className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="font-extrabold text-xl text-gray-900 mb-1">{t('landing.pricing.solo3.name')}</h3>
              <p className="text-gray-400 text-sm mb-6">{t('landing.pricing.solo3.desc')}</p>
              <div className="mb-1">
                {promoActive && <p className="text-2xl font-black text-red-400 line-through">{pricing?.solo3m?.price ?? 1200} MRU</p>}
                <p className="text-4xl font-black text-gray-900">
                  {promoActive ? promo(pricing?.solo3m?.price ?? 1200) : (pricing?.solo3m?.price ?? 1200)}
                  <span className="text-lg font-semibold text-gray-400 ml-1">MRU</span>
                </p>
                {promoActive && <span className="inline-flex items-center gap-1 mt-2 bg-red-500 text-white text-sm font-black px-3 py-1.5 rounded-full">-50%</span>}
              </div>
              <p className="text-xs text-violet-500 font-semibold mb-6">
                ≈ {promoActive ? promo(pricing ? Math.round(pricing.solo3m.price / 3) : 400) : (pricing ? Math.round(pricing.solo3m.price / 3) : 400)} MRU/{lang === 'ar' ? 'شهر' : 'mois'}
              </p>
              <Link href="/register?plan=SOLO_3M"
                className="block w-full text-center py-3 rounded-2xl font-bold text-sm text-white transition hover:opacity-90 shadow-md shadow-violet-200"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                {t('landing.pricing.start')}
              </Link>
            </div>

            {/* Groupe */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-xl text-gray-900 mb-1">{t('landing.pricing.group.name')}</h3>
              <p className="text-gray-400 text-sm mb-6">Min. {pricing?.groupMin ?? 5} {lang === 'ar' ? 'أشخاص' : 'personnes'}</p>
              <div className="mb-1">
                {promoActive && <p className="text-2xl font-black text-red-400 line-through">{(pricing?.groupPerP?.price ?? 400) * (pricing?.groupMin ?? 5)} MRU</p>}
                <p className="text-4xl font-black text-gray-900">
                  {promoActive ? promo((pricing?.groupPerP?.price ?? 400) * (pricing?.groupMin ?? 5)) : (pricing?.groupPerP?.price ?? 400) * (pricing?.groupMin ?? 5)}
                  <span className="text-lg font-semibold text-gray-400 ml-1">MRU</span>
                </p>
                {promoActive && <span className="inline-flex items-center gap-1 mt-2 bg-red-500 text-white text-sm font-black px-3 py-1.5 rounded-full">-50%</span>}
              </div>
              <p className="text-xs text-emerald-600 font-semibold mb-6">
                {promoActive ? promo(pricing?.groupPerP?.price ?? 400) : (pricing?.groupPerP?.price ?? 400)} MRU / {lang === 'ar' ? 'شخص' : 'personne'}
              </p>
              <div className="space-y-1.5 mb-6">
                {[5, 10, 20].map((n) => {
                  const perP = pricing?.groupPerP?.price ?? 400;
                  const finalPerP = promoActive ? promo(perP) : perP;
                  return (
                    <div key={n} className="flex justify-between text-sm">
                      <span className="text-gray-500">{n} {lang === 'ar' ? 'أشخاص' : 'personnes'}</span>
                      <span className="font-bold text-gray-800">{n * finalPerP} MRU</span>
                    </div>
                  );
                })}
              </div>
              <Link href="/register?plan=GROUP"
                className="block w-full text-center py-3 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-600 transition">
                {t('landing.pricing.group.create')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 lg:px-10 pb-28 pt-16">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden px-10 py-16 text-center text-white"
            style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl opacity-25"
              style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />
            <div className="relative">
              <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-4">{t('landing.cta.badge')}</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
                {t('landing.cta.h2a')}<br />{t('landing.cta.h2b')}
              </h2>
              <p className="text-white/50 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                {t('landing.cta.desc')}
              </p>
              <Link href="/register"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-sm transition hover:opacity-90 shadow-xl shadow-violet-900/50 text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                {t('landing.cta.button')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Citations ── */}
      <section className="py-20 px-6 lg:px-10 bg-slate-50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Cheikh Ahmedou Bamba */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <p className="text-right text-gray-800 leading-loose text-base font-medium mb-4" dir="rtl">
              ولا تكن في كل يوم تاركا&nbsp;&nbsp;&nbsp;تعلما واعمل به مداركا<br />
              فالعلم يحيي قلب من تعلما&nbsp;&nbsp;&nbsp;ينوّر النفس يقيها الظّلما
            </p>
            <p className="text-sm text-gray-500 italic leading-relaxed border-t border-gray-100 pt-4">
              Ne cesse chaque jour d'apprendre, puis de mettre en pratique ce que tu as appris.
              Le savoir ranime le cœur de qui l'étudie, éclaire l'âme et la protège des ténèbres.
            </p>
            <p className="text-xs text-violet-600 font-bold mt-3">— الشيخ أحمد بمب امباكي · Cheikh Ahmedou Bamba Mbacke</p>
          </div>

          {/* William Osler */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <p className="text-gray-800 leading-relaxed text-base italic mb-4">
              "Celui qui étudie la médecine sans livres navigue sur une mer inexplorée, mais celui qui étudie la médecine sans patients ne prend pas du tout la mer."
            </p>
            <p className="text-right text-gray-600 text-sm leading-relaxed mb-4" dir="rtl">
              «من يدرس الطب بلا كتب يبحر في بحرٍ مجهولٍ، ومن يدرس الطب بلا مرضى فلا يبحر إطلاقًا»
            </p>
            <p className="text-xs text-violet-600 font-bold">— Sir William Osler</p>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-10 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-gray-400 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-gray-600">{t('app.name')}</span>
              <span className="text-gray-300">·</span>
              <span>{t('landing.footer.tagline')}</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/login" className="hover:text-gray-700 transition">{t('landing.footer.login')}</Link>
              <Link href="/register" className="hover:text-gray-700 transition">{t('landing.footer.register')}</Link>
            </div>
          </div>

          {/* Logos de paiement */}
          <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              {lang === 'ar' ? 'طرق الدفع المقبولة' : 'Paiement accepté via'}
            </p>
            <div className="flex items-center gap-6">
              {['bankily', 'masrivi', 'sedad'].map((op) => (
                <img key={op} src={`/images/${op}.png`} alt={op} className="h-8 w-auto object-contain opacity-70 hover:opacity-100 transition" />
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

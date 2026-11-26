'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useLang } from '@/components/LanguageProvider';
import {
  BookOpen, Zap, TrendingUp, CheckCircle2,
  GraduationCap, ArrowRight, Target, Users, Clock, FileText, ClipboardList, Trophy, Stethoscope, ChevronDown, Languages,
} from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { computePrices, type PromoSettings } from '@/lib/promo';
import { LanguageSwitcherLight } from '@/components/LanguageSwitcher';
import { ConcoursCards } from '@/components/ConcoursCards';

export default function LandingPage() {
  const router = useRouter();
  const { loadUser } = useAuthStore();
  const { t, lang } = useLang();
  const [pricing, setPricing] = useState<any>(null);
  const [regOpen, setRegOpen] = useState(false);
  const [promoSettings, setPromoSettings] = useState<PromoSettings | null>(null);
  const promoActive = promoSettings?.active ?? false;
  const promoDiscount = promoSettings?.discount ?? 30;
  const promoEndDate = promoSettings?.endDate ?? null;
  const promoIncludesGroup = promoSettings?.includesGroup ?? false;
  // Prix promo : fixes si saisis dans l'admin, sinon pourcentage (calcul partagé)
  const prices = computePrices({
    soloBase: pricing?.solo1m?.price ?? 500, perPerson: pricing?.groupPerP?.price ?? 400,
    groupSize: pricing?.groupMin ?? 3, promo: promoSettings,
  });
  const formattedEndDate = promoEndDate
    ? new Date(promoEndDate).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const FEATURES = [
    { icon: BookOpen,       title: t('landing.feat1.title'), subtitle: t('landing.feat1.subtitle'), desc: t('landing.feat1.desc'), color: '#818cf8' },
    { icon: Zap,            title: t('landing.feat2.title'), subtitle: t('landing.feat2.subtitle'), desc: t('landing.feat2.desc'), color: '#fbbf24' },
    { icon: FileText,       title: t('landing.feat4.title'), subtitle: t('landing.feat4.subtitle'), desc: t('landing.feat4.desc'), color: '#10b981' },
    { icon: ClipboardList,  title: t('landing.feat5.title'), subtitle: t('landing.feat5.subtitle'), desc: t('landing.feat5.desc'), color: '#ec4899' },
    { icon: TrendingUp,     title: t('landing.feat3.title'), subtitle: t('landing.feat3.subtitle'), desc: t('landing.feat3.desc'), color: '#34d399' },
  ];


  const TESTIMONIALS = [
    { name: 'Hamza',     role: 'Infirmier d\'État',  img: '/images/fr-com-3.jpeg' },
    { name: 'Fatimetou', role: 'Étudiante en sciences infirmières', img: '/images/fr-com-1.jpeg' },
    { name: 'Mohamed',   role: 'Étudiant en sciences infirmières',  img: '/images/fr-com-2.png' },
    { name: 'مريم',     role: 'ممرضة متخرجة، نواكشوط',            img: '/images/ar-com-1.jpeg' },
    { name: 'سيدي',     role: 'طالب في العلوم التمريضية',           img: '/images/ar-com-2.jpeg' },
  ];

  const MARQUEE_ITEMS = [
    { type: 'chat', src: '/images/testimonials-chat/t1.jpeg' },
    { type: 'chat', src: '/images/testimonials-chat/t2.jpeg' },
    { type: 'chat', src: '/images/testimonials-chat/t3.jpeg' },
    ...TESTIMONIALS.map((testi) => ({ type: 'photo' as const, ...testi })),
    { type: 'chat', src: '/images/testimonials-chat/t4.jpeg' },
    { type: 'chat', src: '/images/testimonials-chat/t5.jpeg' },
    { type: 'chat', src: '/images/testimonials-chat/t6.jpeg' },
  ] as const;

  const FREE_CHAPTERS = [
    { key: 'Paludisme',  name: lang === 'ar' ? 'الملاريا' : 'Paludisme' },
    { key: 'Pédiatrie',  name: lang === 'ar' ? 'طب الأطفال' : 'Pédiatrie' },
    { key: 'Lavage',     name: lang === 'ar' ? 'غسل اليدين' : 'Lavage des mains' },
  ];

  useEffect(() => {
    settingsApi.pricing().then((r) => setPricing(r.data)).catch(() => {});
    settingsApi.promo().then((r) => setPromoSettings(r.data)).catch(() => {});
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (u) router.replace(u.role === 'ADMIN' ? '/admin' : '/dashboard');
    });
  }, []);


  // Journée Internationale des Infirmiers — 12 mai uniquement
  const today = new Date();
  const isNursesDay = today.getMonth() === 4 && (today.getDate() === 12 || today.getDate() === 13); // 12 et 13 mai

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-violet-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm md:text-lg tracking-tight text-gray-900">{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-1 flex-nowrap flex-shrink-0">
            <LanguageSwitcherLight className="!text-gray-500 hover:!bg-gray-100 hover:!text-gray-900 flex-shrink-0" />
            <Link href="/register"
              className="text-sm font-semibold text-white px-3 py-2 rounded-md bg-violet-600 hover:bg-violet-700 transition whitespace-nowrap flex-shrink-0">
              {t('auth.register.submit')}
            </Link>
            <Link href="/login"
              className="hidden sm:inline-block text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition whitespace-nowrap flex-shrink-0">
              {t('auth.login.submit')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      {/* Hero simple (style PassMedicine) : fond médical discret + encadré centré */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-100 via-indigo-50 to-sky-100">
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden>
          <defs>
            <pattern id="hero-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#c4b5fd" strokeWidth="0.6" /></pattern>
          </defs>
          <rect width="1200" height="400" fill="url(#hero-grid)" />
          <path d="M0,220 L180,220 L200,200 L215,220 L260,220 L272,240 L288,110 L304,300 L318,220 L380,220 L400,195 L425,220 L620,220 L640,200 L655,220 L700,220 L712,240 L728,110 L744,300 L758,220 L820,220 L840,195 L865,220 L1200,220"
            fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 flex justify-center">
          <div className="w-full max-w-2xl bg-white/85 backdrop-blur-sm rounded-lg shadow-md border border-white px-6 py-8 md:px-10 md:py-10 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {lang === 'ar' ? 'منصّة التحضير للمسابقات الطبية' : 'Préparez vos concours médicaux'}
            </h1>
            <p className="mt-3 text-gray-600 text-base md:text-lg">
              {lang === 'ar'
                ? 'بنوك أسئلة مصحّحة ومعلّق عليها للإقامة ومسابقات الصحة والوظيفة العمومية في موريتانيا.'
                : 'Des banques de QCM corrigés et commentés pour le Résidanat, les concours de santé et la fonction publique en Mauritanie.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href="#rubriques"
                className="inline-flex items-center px-5 py-2.5 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm transition">
                {lang === 'ar' ? 'اعرف المزيد' : 'En savoir plus'}
              </a>
              <div className="relative">
                <button type="button" onClick={() => setRegOpen((o) => !o)} aria-expanded={regOpen}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition">
                  {lang === 'ar' ? 'سجّل' : "S'inscrire"} <ChevronDown className="w-4 h-4" />
                </button>
                {regOpen && (
                  <div className="absolute z-20 mt-1 end-0 sm:end-auto sm:start-0 min-w-[15rem] bg-white rounded-md shadow-lg border border-gray-200 py-1 text-start">
                    {[
                      { href: '/register?concours=residanat', label: lang === 'ar' ? 'مسابقة الإقامة (Résidanat)' : 'Concours de Résidanat' },
                      { href: '/register?concours=sante', label: lang === 'ar' ? 'المسابقة الوطنية للصحة' : 'Concours de santé' },
                      { href: '/register?concours=fonction-publique', label: lang === 'ar' ? 'الوظيفة العمومية' : 'Recrutement fonction publique' },
                    ].map((o) => (
                      <Link key={o.href} href={o.href} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">{o.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-5 text-sm text-gray-500">
              {lang === 'ar' ? 'لديك حساب؟ ' : 'Déjà inscrit ? '}
              <Link href="/login" className="text-violet-700 font-semibold hover:underline">{t('auth.login.submit')}</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Rubriques : Résidanat, Concours de santé, Fonction publique ── */}
      <div id="rubriques" className="scroll-mt-16">
        <ConcoursCards lang={lang} />
      </div>

      {/* ── Chiffres clés ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHead center
            kicker={lang === 'ar' ? 'الأرقام الرئيسية' : 'Chiffres clés'}
            title={lang === 'ar' ? 'لماذا البورور ؟' : 'Pourquoi Al Bourour ?'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <BookOpen className="w-5 h-5" />, value: '4500+', title: lang === 'ar' ? 'سؤال لا غنى عنه' : 'QCM incontournables', desc: lang === 'ar' ? 'تغطي 100% من البرنامج الرسمي الموريتاني' : 'Couvrant 100 % du programme officiel mauritanien' },
              { icon: <Languages className="w-5 h-5" />, value: 'FR · AR', title: lang === 'ar' ? 'متاح بالعربية والفرنسية' : 'En arabe et en français', desc: lang === 'ar' ? 'غيّر اللغة بنقرة واحدة للفهم الكامل' : 'Changez de langue en un clic pour une compréhension totale' },
              { icon: <CheckCircle2 className="w-5 h-5" />, value: '100%', title: lang === 'ar' ? 'فهم المفاهيم' : 'Comprenez les concepts', desc: lang === 'ar' ? 'كل سؤال مرفق بشرح طبي مفصّل' : "Chaque question est suivie d'une explication médicale" },
              { icon: <Clock className="w-5 h-5" />, value: '10 min', title: lang === 'ar' ? 'تفعيل سريع' : 'Activation express', desc: lang === 'ar' ? 'حسابك جاهز في 10 دقائق بعد الدفع' : 'Votre compte prêt en 10 min après paiement', pay: true },
            ].map((k) => (
              <div key={k.value} className="p-5 rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-md bg-violet-50 text-violet-700 flex items-center justify-center">{k.icon}</span>
                  <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                </div>
                <p className="mt-3 font-semibold text-gray-900 text-sm">{k.title}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{k.desc}</p>
                {k.pay && (
                  <div className="flex gap-2 mt-3">
                    {['bankily', 'masrivi', 'sedad'].map((op) => (
                      <img key={op} src={`/images/${op}.png`} alt={op} className="h-5 w-auto object-contain" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 bg-slate-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <SectionHead kicker={t('landing.features.badge')} title={t('landing.features.h2')} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-lg border border-gray-200 bg-white">
                <span className="w-10 h-10 rounded-md bg-violet-50 text-violet-700 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-1">{f.subtitle}</p>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vidéo démo ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHead center
            kicker={lang === 'ar' ? 'اكتشف المنصة' : 'Découvrez la plateforme'}
            title={lang === 'ar' ? 'شاهد كيف يعمل البورور' : 'Voyez Al Bourour en action'}
            desc={lang === 'ar'
              ? 'جولة سريعة في المنصة — من التدريب إلى نتائجك في دقائق'
              : "Tour rapide de la plateforme — de l'entraînement à vos résultats en quelques minutes"} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[{ src: '/demo-fr.mp4', label: '🇫🇷 Français' }, { src: '/demo-ar.mp4', label: '🇲🇷 العربية' }].map((v) => (
              <div key={v.src}>
                <p className="text-sm font-semibold text-gray-600 mb-2">{v.label}</p>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <video src={v.src} controls playsInline preload="metadata" className="w-full aspect-video bg-gray-900" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Essai gratuit ── */}
      <section className="py-16 px-4 sm:px-6 bg-violet-50 border-y border-violet-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            {lang === 'ar' ? 'ابدأ بهذه الفصول المجانية' : 'Commencez par ces chapitres offerts'}
          </h2>
          <p className="text-gray-600 mt-2">
            {lang === 'ar' ? '300 سؤالاً مجانياً — بدون بطاقة بنكية' : '300 QCM gratuits — sans carte bancaire'}
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FREE_CHAPTERS.map((ch) => (
              <Link key={ch.name} href={`/free-practice${lang === 'ar' ? '?lang=ar' : ''}`}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-violet-500 transition text-start">
                <span className="font-semibold text-gray-900 text-sm">{ch.name}</span>
                <span className="text-xs font-semibold text-violet-700">{lang === 'ar' ? 'مجاناً' : 'Gratuit'} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Témoignages ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHead kicker={t('landing.testi.badge')} title={t('landing.testi.h2')} />
          <div className="mb-10 flex items-start gap-4 rounded-lg border border-violet-200 bg-violet-50 px-5 py-4">
            <GraduationCap className="hidden sm:block w-8 h-8 text-violet-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-lg font-bold text-violet-900">
                {lang === 'ar' ? 'لقد نجحوا.' : "Ils l'ont fait."}
              </p>
              <p className="text-sm text-violet-800 leading-relaxed mt-0.5">
                {lang === 'ar'
                  ? 'بفضل الله أولًا، ثم بفضل اجتهادهم. ونفخر بأن منصة البُرور كانت جزءًا من قصة نجاحهم.'
                  : "Grâce à Allah puis grâce à leur travail. Et nous sommes fiers d'avoir participé à leur réussite."}
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="flex w-max gap-6 animate-marquee items-start">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) =>
              item.type === 'chat' ? (
                <img key={`${item.src}-${i}`} src={item.src} alt="Témoignage"
                  className="w-72 h-auto max-h-[28rem] object-cover object-top rounded-lg border border-gray-200 flex-shrink-0" />
              ) : (
                <div key={`${item.name}-${i}`} className="flex flex-col items-center text-center flex-shrink-0">
                  <img src={item.img} alt={item.name} className="w-72 h-auto max-h-[28rem] object-cover object-top rounded-lg border border-gray-200 mb-3" />
                  <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.role}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Tarifs ── */}
      <section id="tarifs" className="py-16 md:py-20 px-4 sm:px-6 bg-slate-50 border-t border-gray-100 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <SectionHead center kicker={t('landing.pricing.badge')} title={t('landing.pricing.h2')} />
          <p className="-mt-4 mb-8 text-center text-sm text-gray-600">
            {lang === 'ar' ? 'هذه العروض خاصة بالمسابقة الوطنية للصحة. ' : 'Formules du concours national de santé. '}
            <Link href="/residanat#tarifs" className="font-semibold text-violet-700 hover:underline">
              {lang === 'ar' ? 'عروض مسابقة الإقامة ←' : 'Tarifs du Résidanat →'}
            </Link>
          </p>

          <div className="mb-8 rounded-lg px-6 py-7 text-center text-white" style={{ background: 'linear-gradient(135deg,#b91c1c 0%,#dc2626 40%,#f97316 100%)' }}>
            {promoActive && (
              <>
                <p className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                  {prices.upTo
                    ? (lang === 'ar' ? `خصم حتى ${prices.maxPct}% !` : `Jusqu'à -${prices.maxPct}% !`)
                    : prices.onGroup
                      ? (lang === 'ar' ? `-${prices.maxPct}% على جميع الخطط !` : `-${prices.maxPct}% sur tous les plans !`)
                      : (lang === 'ar' ? `-${prices.soloPct}% على الخطة الفردية !` : `-${prices.soloPct}% sur l'offre Solo !`)}
                </p>
                {formattedEndDate && (
                  <p className="text-white/85 text-base mb-3">
                    {lang === 'ar' ? `صالح حتى ${formattedEndDate}` : `valable jusqu'au ${formattedEndDate}`}
                  </p>
                )}
              </>
            )}
            {isNursesDay ? (
              <>
                <p className="text-2xl md:text-3xl font-black mb-1">
                  {lang === 'ar' ? 'عيد الممرضين العالمي السعيد !' : 'Bonne Journée Internationale des Infirmiers !'}
                </p>
                <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto">
                  {lang === 'ar'
                    ? 'احتفالاً بهذا اليوم، استفد من عرض خاص سارٍ اليوم فقط.'
                    : "Pour célébrer cette journée, profitez d'une offre spéciale valable aujourd'hui seulement."}
                </p>
              </>
            ) : (
              <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto">
                {lang === 'ar'
                  ? 'سجّل مرة واحدة، وذاكر حتى النهاية. آل بورور يرافقكم حتى باب قاعة الامتحان'
                  : "Inscrivez-vous une fois, révisez jusqu'au bout. Al Bourour vous accompagne jusqu'à la porte de la salle d'examen."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">

            {/* Solo */}
            <div className="flex flex-col bg-white rounded-lg border border-gray-200 p-6">
              <Target className="w-6 h-6 text-violet-700 mb-4" />
              <h3 className="font-bold text-lg text-gray-900">{t('landing.pricing.solo1.name')}</h3>
              <p className="text-gray-500 text-sm mb-5">{t('landing.pricing.solo1.desc')}</p>
              <div className="mb-6 flex-1">
                {/* Prix barré d'affichage uniquement (le prix de base en base reste inchangé) */}
                {promoActive && <p className="text-lg font-semibold text-gray-400 line-through">1500 MRU {lang === 'ar' ? 'سنوياً' : 'par an'}</p>}
                <p className="text-3xl font-bold text-gray-900">
                  {prices.solo}<span className="text-base font-medium text-gray-500 ms-1">MRU</span>
                </p>
                {promoActive && prices.soloPct > 0 && <span className="inline-block mt-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">-{prices.soloPct}%</span>}
              </div>
              <Link href="/register?plan=SOLO_1M"
                className="block w-full text-center py-2.5 rounded-md font-semibold text-sm text-violet-700 border border-violet-600 hover:bg-violet-50 transition">
                {t('landing.pricing.start')}
              </Link>
            </div>

            {/* Pack spécial jusqu'au concours (recommandé) */}
            <div className="relative flex flex-col bg-white rounded-lg border-2 border-violet-600 p-6">
              <span className="absolute -top-3 start-6 bg-violet-600 text-white text-xs font-semibold px-2.5 py-1 rounded">
                {lang === 'ar' ? 'موصى به' : 'Recommandé'}
              </span>
              <Trophy className="w-6 h-6 text-violet-700 mb-4" />
              <h3 className="font-bold text-lg text-gray-900">{lang === 'ar' ? 'باك خاص' : 'Pack spécial'}</h3>
              <p className="text-gray-500 text-sm mb-5">{lang === 'ar' ? 'حتى المسابقة · سنة على الأقل' : "Jusqu'au concours · 1 an minimum"}</p>
              <div className="mb-6 flex-1">
                {/* Prix barré d'affichage uniquement */}
                <p className="text-lg font-semibold text-gray-400 line-through">1500 MRU</p>
                <p className="text-3xl font-bold text-gray-900">
                  {pricing?.concours?.price ?? 1000}<span className="text-base font-medium text-gray-500 ms-1">MRU</span>
                </p>
              </div>
              <Link href="/register?plan=CONCOURS"
                className="block w-full text-center py-2.5 rounded-md font-semibold text-sm text-white bg-violet-600 hover:bg-violet-700 transition">
                {t('landing.pricing.start')}
              </Link>
            </div>

            {/* Pack Amis */}
            <div className="flex flex-col bg-white rounded-lg border border-gray-200 p-6">
              <Users className="w-6 h-6 text-violet-700 mb-4" />
              <h3 className="font-bold text-lg text-gray-900">{t('landing.pricing.group.name')}</h3>
              <p className="text-gray-500 text-sm">{lang === 'ar' ? 'لمدة 6 أشهر' : 'Accès pendant 6 mois'}</p>
              <p className="text-violet-700 text-sm font-semibold mb-4 mt-1">
                {lang === 'ar' ? 'ادفع لـ 2، وتعالوا 3!' : 'Payez pour 2, venez à 3 !'}
              </p>
              <div className="mb-6 flex-1">
                {promoActive && promoIncludesGroup && (
                  <p className="text-lg font-semibold text-gray-400 line-through">
                    3000 MRU {lang === 'ar' ? 'سنوياً' : 'par an'}
                  </p>
                )}
                <p className="text-3xl font-bold text-gray-900">
                  {prices.group}<span className="text-base font-medium text-gray-500 ms-1">MRU</span>
                </p>
                {promoActive && promoIncludesGroup && (
                  <span className="inline-block mt-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">-{prices.groupPct}%</span>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  {lang === 'ar'
                    ? `بطاقة بـ ${prices.groupPerPerson} MRU للشخص وأنتم مسجلون!`
                    : `Un billet de ${prices.groupPerPerson} MRU chacun et vous êtes inscrits !`}
                </p>
              </div>
              <Link href="/register?plan=GROUP"
                className="block w-full text-center py-2.5 rounded-md font-semibold text-sm text-violet-700 border border-violet-600 hover:bg-violet-50 transition">
                {t('landing.pricing.group.create')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Citations ── */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <figure className="rounded-lg border border-gray-200 border-s-4 border-s-violet-600 p-6">
            <p className="text-right text-gray-900 leading-loose text-base font-medium mb-4" dir="rtl">
              ولا تكن في كل يوم تاركا <span className="text-gray-300 mx-2 select-none">‖</span> تعلما واعمل به مداركا<br />
              فالعلم يحيي قلب من تعلما <span className="text-gray-300 mx-2 select-none">‖</span> ينوّر النفس يقيها الظّلما
            </p>
            <p className="text-sm text-gray-600 italic leading-relaxed border-t border-gray-100 pt-4">
              Ne cesse chaque jour d'apprendre, puis de mettre en pratique ce que tu as appris.
              Le savoir ranime le cœur de qui l'étudie, éclaire l'âme et la protège des ténèbres.
            </p>
            <figcaption className="text-xs text-violet-700 font-semibold mt-3">— الشيخ أحمد بمب امباكي · Cheikh Ahmedou Bamba Mbacke</figcaption>
          </figure>
          <figure className="rounded-lg border border-gray-200 border-s-4 border-s-violet-600 p-6">
            <p className="text-gray-900 leading-relaxed text-base italic mb-4">
              "Celui qui étudie la médecine sans livres navigue sur une mer inexplorée, mais celui qui étudie la médecine sans patients ne prend pas du tout la mer."
            </p>
            <p className="text-right text-gray-600 text-sm leading-relaxed mb-4" dir="rtl">
              «من يدرس الطب بلا كتب يبحر في بحرٍ مجهولٍ، ومن يدرس الطب بلا مرضى فلا يبحر إطلاقًا»
            </p>
            <figcaption className="text-xs text-violet-700 font-semibold">— Sir William Osler</figcaption>
          </figure>
        </div>
      </section>

      {/* ── Appel final ── */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-5xl mx-auto rounded-lg bg-violet-700 px-6 py-12 md:px-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold">
            {t('landing.cta.h2a')} {t('landing.cta.h2b')}
          </h2>
          <p className="text-violet-50 mt-3 max-w-xl mx-auto leading-relaxed">{t('landing.cta.desc')}</p>
          <Link href="/register"
            className="mt-6 inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-md text-sm bg-white text-violet-800 hover:bg-violet-50 transition">
            {t('landing.cta.button')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-slate-50 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-white" />
              </span>
              <span className="font-bold text-gray-700">{t('app.name')}</span>
              <span className="text-gray-300">·</span>
              <span>{t('landing.footer.tagline')}</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/residanat" className="hover:text-gray-900 transition">Résidanat</Link>
              <Link href="/login" className="hover:text-gray-900 transition">{t('landing.footer.login')}</Link>
              <Link href="/register" className="hover:text-gray-900 transition">{t('landing.footer.register')}</Link>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              {lang === 'ar' ? 'طرق الدفع المقبولة' : 'Paiement accepté via'}
            </p>
            <div className="flex items-center gap-6">
              {['bankily', 'masrivi', 'sedad'].map((op) => (
                <img key={op} src={`/images/${op}.png`} alt={op} className="h-8 w-auto object-contain" />
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

/** Titre de section sobre, commun à toute la page d'accueil */
function SectionHead({ kicker, title, desc, center }: { kicker?: string; title: string; desc?: string; center?: boolean }) {
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''}`}>
      {kicker && <p className="text-violet-700 text-sm font-semibold mb-2">{kicker}</p>}
      <h2 className={`text-2xl md:text-3xl font-bold text-gray-900 ${center ? '' : 'max-w-2xl'}`}>{title}</h2>
      {desc && <p className={`text-gray-600 mt-3 ${center ? 'max-w-xl mx-auto' : 'max-w-2xl'}`}>{desc}</p>}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Stethoscope, ArrowRight, CheckCircle2, ChevronDown, FlaskConical, HeartPulse, Scissors,
  Target, Zap, Lightbulb, Trophy, RefreshCw,
} from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';
import { LanguageSwitcherLight } from '@/components/LanguageSwitcher';
import { publicApi, settingsApi } from '@/lib/api';
import { computePrices, type PromoSettings } from '@/lib/promo';

// Page publique du Résidanat : bilingue (comme l'accueil), contenu des QCM en français uniquement.
const MODULE_ICONS = [FlaskConical, HeartPulse, Scissors];
const REGISTER = '/register?profil=resident';

export default function ResidanatPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const tr = (fr: string, arText: string) => (ar ? arText : fr);

  const [modules, setModules] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [promo, setPromo] = useState<PromoSettings | null>(null);

  useEffect(() => {
    publicApi.themes('fr', 'RESIDENT').then((r) => setModules(r.data)).catch(() => {});
    settingsApi.pricing('resident').then((r) => setPricing(r.data)).catch(() => {});
    settingsApi.promo('resident').then((r) => setPromo(r.data)).catch(() => {});
  }, []);

  const totalQ = modules.reduce((a, m) => a + (m.subThemes ?? []).reduce((b: number, s: any) => b + (s._count?.questions ?? 0), 0), 0);
  const totalChapters = modules.reduce((a, m) => a + (m.subThemes?.length ?? 0), 0);
  const qLabel = totalQ >= 1000 ? `${(Math.floor(totalQ / 1000) * 1000).toLocaleString('fr-FR')}+` : totalQ ? String(totalQ) : '8 000+';

  const groupMin = pricing?.groupMin ?? 3;
  const prices = computePrices({
    soloBase: pricing?.solo1m?.price ?? 1000, perPerson: pricing?.groupPerP?.price ?? 700,
    groupSize: groupMin, promo,
  });
  const concours = pricing?.concours?.price ?? 1000;

  const FEATURES = [
    { icon: Target,    title: tr('Entraînement par chapitre', 'تدريب حسب الفصل'), desc: tr('Ciblez un module ou un chapitre précis et voyez immédiatement vos points faibles.', 'ركّز على وحدة أو فصل محدد واكتشف نقاط ضعفك فوراً.') },
    { icon: Zap,       title: tr('Mode examen chronométré', 'وضع الامتحان الموقّت'), desc: tr("Des séries minutées pour gérer votre temps comme le jour J.", 'سلاسل موقّتة لتتحكم في وقتك كما في يوم المسابقة.') },
    { icon: Lightbulb, title: tr('Correction commentée', 'تصحيح مع تعليق'), desc: tr('Chaque proposition est expliquée : vous comprenez pourquoi elle est vraie ou fausse.', 'كل اقتراح مشروح: تفهم لماذا هو صحيح أو خاطئ.') },
    { icon: RefreshCw, title: tr('Révision de vos erreurs', 'مراجعة أخطائك'), desc: tr('Retravaillez les questions ratées et vos favoris jusqu’à les maîtriser.', 'أعد العمل على الأسئلة التي أخطأت فيها حتى تتقنها.') },
    { icon: Trophy,    title: tr('Classement entre résidents', 'ترتيب بين المقيمين'), desc: tr('Comparez votre niveau uniquement aux autres candidats au Résidanat.', 'قارن مستواك فقط مع باقي مترشحي الإقامة.') },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={ar ? 'rtl' : 'ltr'}>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shadow-violet-200 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm md:text-lg tracking-tight text-gray-900 truncate">Al Bourour</span>
          </Link>
          <div className="flex items-center gap-1 flex-nowrap flex-shrink-0">
            <LanguageSwitcherLight className="!text-gray-500 hover:!bg-gray-100 hover:!text-gray-900 flex-shrink-0" />
            <Link href={REGISTER}
              className="text-sm font-semibold text-white px-3 py-2 rounded-xl transition hover:opacity-90 shadow-md shadow-sky-200 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }}>
              {tr("S'inscrire", 'سجّل')} →
            </Link>
            <Link href="/login" className="hidden sm:inline-flex text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition whitespace-nowrap">
              {tr('Se connecter', 'تسجيل الدخول')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg,#04172b 0%,#08304f 45%,#0b1e3a 100%)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle,#0ea5e9,transparent)' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-20 pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-sky-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
              <Stethoscope className="w-3.5 h-3.5" />
              {tr('Concours du Résidanat — Mauritanie', 'مسابقة الإقامة — موريتانيا')}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white mb-6">
              {tr('Préparez le Résidanat', 'حضّر لمسابقة الإقامة')}<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#7dd3fc,#a5b4fc)' }}>
                {tr('chapitre par chapitre', 'فصلاً بفصل')}
              </span>
            </h1>
            <p className="text-lg text-white/65 max-w-xl mb-10 leading-relaxed">
              {tr(
                'Des QCM corrigés et commentés sur tout le programme : sciences fondamentales, pathologie médicale et pathologie chirurgicale. Vous savez exactement où vous en êtes, chapitre par chapitre.',
                'أسئلة متعددة الخيارات مصحّحة ومعلّق عليها تغطي كامل البرنامج: العلوم الأساسية، الأمراض الباطنية والأمراض الجراحية. تعرف بالضبط مستواك في كل فصل. (المحتوى بالفرنسية)',
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={REGISTER}
                className="inline-flex items-center justify-center gap-2 text-white font-bold px-7 py-4 rounded-2xl text-sm transition hover:opacity-90 shadow-xl shadow-sky-950/50"
                style={{ background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }}>
                {tr('Créer mon compte Résident', 'أنشئ حسابي كمقيم')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
              <a href="#programme" className="inline-flex items-center justify-center gap-2 text-white/75 font-semibold px-7 py-4 rounded-2xl text-sm border border-white/15 hover:bg-white/10 transition">
                {tr('Voir le programme', 'عرض البرنامج')}
              </a>
            </div>
            <div className="flex flex-wrap gap-8 mt-12 pt-10 border-t border-white/10">
              {[
                [qLabel, tr('QCM corrigés', 'سؤال مصحّح')],
                ['3', tr('modules', 'وحدات')],
                [totalChapters ? String(totalChapters) : '110', tr('chapitres', 'فصلاً')],
                ['FR', tr('contenu en français', 'المحتوى بالفرنسية')],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-extrabold text-white">{v}</p>
                  <p className="text-xs text-white/45 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Programme ── */}
      <section id="programme" className="py-20 px-4 sm:px-6 lg:px-10 bg-slate-50 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-sky-700 text-xs font-bold uppercase tracking-widest mb-3">{tr('Programme', 'البرنامج')}</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">{tr('3 modules, tout le programme', '3 وحدات تغطي كامل البرنامج')}</h2>
          </div>
          <div className="space-y-4">
            {(modules.length ? modules : [{ id: 'a', name: 'Sciences fondamentales' }, { id: 'b', name: 'Pathologie médicale' }, { id: 'c', name: 'Pathologie chirurgicale' }]).map((m, i) => {
              const Icon = MODULE_ICONS[i % 3];
              const subs = m.subThemes ?? [];
              const nq = subs.reduce((a: number, s: any) => a + (s._count?.questions ?? 0), 0);
              const isOpen = open === m.id;
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <button type="button" onClick={() => setOpen(isOpen ? null : m.id)} disabled={!subs.length}
                    className="w-full flex items-center gap-4 p-5 text-start">
                    <span className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-gray-900">{m.name}</span>
                      {subs.length > 0 && (
                        <span className="block text-xs text-gray-500 mt-0.5">{subs.length} {tr('chapitres', 'فصلاً')} · {nq.toLocaleString('fr-FR')} QCM</span>
                      )}
                    </span>
                    {subs.length > 0 && <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 flex flex-wrap gap-2" dir="ltr">
                      {subs.map((s: any) => (
                        <span key={s.id} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{s.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-sky-700 text-xs font-bold uppercase tracking-widest mb-3">{tr('Fonctionnalités', 'المميزات')}</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">{tr('Moins de temps perdu, plus de points gagnés', 'وقت أقل ضائع، نقاط أكثر')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-200 p-6">
                <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-4"><f.icon className="w-5 h-5" /></span>
                <p className="font-bold text-gray-900 mb-1.5">{f.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs Résidanat ── */}
      <section id="tarifs" className="py-20 px-4 sm:px-6 lg:px-10 bg-slate-50 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-sky-700 text-xs font-bold uppercase tracking-widest mb-3">{tr('Tarifs Résidanat', 'عروض الإقامة')}</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">{tr('Un investissement pour votre carrière', 'استثمار في مسارك المهني')}</h2>
            {prices.active && (
              <p className="mt-4 inline-block bg-red-50 text-red-700 border border-red-200 rounded-full px-4 py-1.5 text-sm font-bold">
                {prices.upTo ? tr(`Jusqu'à -${prices.maxPct}%`, `خصم حتى ${prices.maxPct}%`) : `-${prices.maxPct}%`}
                {prices.endDate ? tr(` jusqu'au ${new Date(prices.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`, '') : ''}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {[
              { plan: 'SOLO_1M', name: tr('Solo', 'فردي'), sub: tr('Accès pendant 6 mois', 'وصول لمدة 6 أشهر'), price: prices.solo, base: prices.soloPct ? prices.soloBase : null, best: false },
              { plan: 'CONCOURS', name: tr('Pack spécial', 'باك خاص'), sub: tr("Jusqu'au concours · 1 an minimum", 'حتى المسابقة · سنة على الأقل'), price: concours, base: null, best: true },
              { plan: 'GROUP', name: tr(`Groupe de ${groupMin}`, `مجموعة من ${groupMin}`), sub: tr(`${prices.groupPerPerson} MRU par personne`, `${prices.groupPerPerson} أوقية للشخص`), price: prices.group, base: prices.groupPct ? prices.groupBase : null, best: false },
            ].map((p) => (
              <div key={p.plan} className={`relative rounded-3xl bg-white p-6 border-2 ${p.best ? 'border-sky-500 shadow-xl shadow-sky-100' : 'border-gray-200'}`}>
                {p.best && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">⭐ {tr('Recommandé', 'موصى به')}</span>}
                <p className="font-extrabold text-gray-900 text-lg">{p.name}</p>
                <p className="text-sm text-gray-500 mt-1">{p.sub}</p>
                <div className="mt-5 mb-6">
                  {p.base && <p className="text-sm text-gray-400 line-through">{p.base} MRU</p>}
                  <p className="text-4xl font-black text-gray-900">{p.price} <span className="text-base font-semibold text-gray-500">MRU</span></p>
                </div>
                <Link href={`${REGISTER}&plan=${p.plan}`}
                  className={`w-full inline-flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition ${p.best ? 'text-white hover:opacity-90' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'}`}
                  style={p.best ? { background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' } : undefined}>
                  {tr('Commencer', 'ابدأ')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            ))}
          </div>
          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
            {[
              tr('Paiement Bankily, Masrivi ou Sedad', 'الدفع عبر Bankily أو Masrivi أو Sedad'),
              tr('Compte activé en 10 min après paiement', 'تفعيل الحساب خلال 10 دقائق بعد الدفع'),
              tr('Tous les modules et chapitres inclus', 'جميع الوحدات والفصول مشمولة'),
            ].map((x) => (
              <li key={x} className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />{x}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 sm:px-6 lg:px-10 border-t border-gray-100 text-center text-sm text-gray-500">
        <p>
          Al Bourour · {tr('Préparation aux concours de santé mauritaniens', 'التحضير لمسابقات الصحة الموريتانية')} ·{' '}
          <Link href="/" className="font-semibold text-violet-700 hover:underline">{tr('Concours national de santé (infirmiers, sages-femmes, biologistes)', 'المسابقة الوطنية للصحة')}</Link>
        </p>
      </footer>
    </div>
  );
}

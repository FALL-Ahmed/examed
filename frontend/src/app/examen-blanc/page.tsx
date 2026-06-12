'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Clock, FileText, Trophy, Users, ChevronRight, Star, Zap, Shield, MapPin, Loader2, BarChart, CheckCircle2 } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');

function Countdown({ target, label, isAr }: { target: Date; label: string; isAr: boolean }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const units = t.d > 0
    ? [{ v: pad(t.d), l: isAr ? 'يوم' : 'j' }, { v: pad(t.h), l: isAr ? 'س' : 'h' }, { v: pad(t.m), l: isAr ? 'د' : 'm' }]
    : [{ v: pad(t.h), l: isAr ? 'س' : 'h' }, { v: pad(t.m), l: isAr ? 'د' : 'm' }, { v: pad(t.s), l: isAr ? 'ث' : 's' }];

  return (
    <div>
      <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-center gap-2">
        {units.map(({ v, l }, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3 text-center min-w-[60px]">
              <span className="text-3xl font-black text-white tabular-nums">{v}</span>
              <p className="text-white/50 text-xs mt-0.5">{l}</p>
            </div>
            {i < units.length - 1 && <span className="text-white/40 text-2xl font-bold">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h${pad(m)}` : `${pad(m)}:${pad(s)}`;
}

const EB_STATE_KEY = 'examen_blanc_state';
type Target = 'INFIRMIER' | 'SAGE_FEMME' | 'BIOLOGISTE';

export function ExamenBlancPageContent({ target }: { target: Target }) {
  const { lang, setLang } = useLang();
  const isAr = lang === 'ar';
  const isSF = target === 'SAGE_FEMME';
  const isBIO = target === 'BIOLOGISTE';
  const theme = {
    bg: isSF ? 'linear-gradient(145deg,#f48fb1 0%,#f06292 50%,#e91e8c 100%)' : isBIO ? 'linear-gradient(145deg,#052e16 0%,#14532d 50%,#052e16 100%)' : 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)',
    glow1: isSF ? 'radial-gradient(circle,#9f1239,transparent)' : isBIO ? 'radial-gradient(circle,#16a34a,transparent)' : 'radial-gradient(circle,#7c3aed,transparent)',
    glow2: isSF ? 'radial-gradient(circle,#be123c,transparent)' : isBIO ? 'radial-gradient(circle,#15803d,transparent)' : 'radial-gradient(circle,#6366f1,transparent)',
    accent: isSF ? 'linear-gradient(135deg,#9f1239,#be185d)' : isBIO ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#7c3aed,#6366f1)',
    textGrad: isSF ? 'linear-gradient(135deg,#ffffff,#fce7f3)' : isBIO ? 'linear-gradient(135deg,#86efac,#4ade80)' : 'linear-gradient(135deg,#a78bfa,#818cf8)',
    iconCls: isSF ? 'text-white' : isBIO ? 'text-emerald-400' : 'text-violet-400',
    spinnerCls: isSF ? 'border-white' : isBIO ? 'border-emerald-400' : 'border-violet-400',
    timeCls: isSF ? 'text-white' : isBIO ? 'text-emerald-300' : 'text-violet-300',
    btnShadow: isSF ? 'shadow-pink-900/50' : isBIO ? 'shadow-emerald-900/50' : 'shadow-violet-900/50',
    bannerBg: isSF ? 'rgba(255,255,255,0.18)' : isBIO ? 'linear-gradient(to bottom,rgba(22,163,74,0.1),rgba(21,128,61,0.1))' : 'linear-gradient(to bottom,rgba(124,58,237,0.1),rgba(99,102,241,0.1))',
    bannerBorder: isSF ? 'border-white/30' : isBIO ? 'border-emerald-500/30' : 'border-violet-500/30',
    badgeCls: isSF ? 'bg-rose-800' : isBIO ? 'bg-emerald-700' : 'bg-violet-500',
    recoverBorder: isSF ? 'border-white/30' : isBIO ? 'border-emerald-500/30' : 'border-violet-500/30',
    ringCls: isSF ? 'focus:ring-white' : isBIO ? 'focus:ring-emerald-500' : 'focus:ring-violet-500',
    cardBg: isSF ? 'bg-white/35' : 'bg-white/5',
    cardBorder: isSF ? 'border-white/50' : 'border-white/10',
    navBoxBg: isSF ? 'bg-white/15' : 'bg-white/5',
    navBoxBorder: isSF ? 'border-white/30' : 'border-white/10',
    textDim: isSF ? 'text-white/90' : 'text-white/60',
    textMuted: isSF ? 'text-white/75' : 'text-white/40',
    textFaint: isSF ? 'text-white/60' : 'text-white/30',
    textFeature: isSF ? 'text-white' : 'text-white/70',
  };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRecover, setShowRecover] = useState(false);
  const [recoverPhone, setRecoverPhone] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState('');

  const router = useRouter();

  async function handleRecover() {
    if (!recoverPhone.trim()) return;
    setRecoverLoading(true); setRecoverError('');
    try {
      const { data } = await examenBlancApi.recover(recoverPhone.trim());
      localStorage.setItem(EB_STATE_KEY, JSON.stringify({
        sessionId: data.sessionId,
        participantId: data.participantId,
        examenBlancId: data.examenBlancId,
        durationMin: data.durationMin,
        totalQ: data.totalQ,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        resultsAt: data.resultsAt,
        startedAt: data.startedAt,
        isCompleted: data.isCompleted,
        participant: data.participant,
        questions: data.questions,
        answers: data.answers,
      }));
      router.push(data.isCompleted ? '/examen-blanc/results' : '/examen-blanc/exam');
    } catch {
      setRecoverError(isAr ? 'لم يُعثر على أي مشارك بهذا الرقم' : 'Aucun participant trouvé avec ce numéro');
    }
    setRecoverLoading(false);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const curr = await examenBlancApi.current(target);
      setData(curr.data);
    } catch {
      setData({ session: null, stats: { participants: 0, totalAllTime: 0 } });
    } finally {
      setLoading(false);
    }
  }, [target]);

  const [testIdx, setTestIdx] = useState(0);
  const [testFade, setTestFade] = useState(true);

  useEffect(() => { if (isBIO) setLang('fr'); }, [isBIO]);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const testimonials = isAr
      ? [{ name: 'مريم', role: isSF ? 'قابلة' : isBIO ? 'بيولوجية' : 'ممرضة', img: '/images/ar-com-1.jpeg' }, { name: 'سيدي', role: isSF ? 'قابل' : isBIO ? 'بيولوجي' : 'ممرض', img: '/images/ar-com-2.jpeg' }]
      : [{ name: 'Fatimetou', role: isSF ? 'Sage-femme' : isBIO ? 'Biologiste' : 'Infirmière', img: '/images/fr-com-1.jpeg' }, { name: 'Mohamed', role: isSF ? 'Sage-femme' : isBIO ? 'Biologiste' : 'Infirmier', img: '/images/fr-com-2.png' }];
    const id = setInterval(() => {
      setTestFade(false);
      setTimeout(() => { setTestIdx(i => (i + 1) % testimonials.length); setTestFade(true); }, 700);
    }, 7000);
    return () => clearInterval(id);
  }, [isAr, isSF, isBIO]);

  if (loading && !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
      <div className={`w-10 h-10 border-4 ${theme.spinnerCls} border-t-transparent rounded-full animate-spin`} />
    </div>
  );

  const session = data?.session;
  const stats = data?.stats ?? {};
  const now = new Date();
  const isOpen = session?.isOpen;
  const isClosed = session?.isClosed;
  const isResultsReady = session?.isResultsReady;
  const hasSession = !!session;

  const sfBadge = isSF;
  const statusBadge = !hasSession
    ? { text: isAr ? 'لا توجد جلسة نشطة' : 'Aucune session active', color: sfBadge ? 'bg-white/30 text-white border-white/50' : 'bg-gray-500/20 text-gray-300 border-gray-500/30' }
    : isOpen
      ? { text: isAr ? '🟢 مفتوح الآن' : '🟢 Ouvert maintenant', color: sfBadge ? 'bg-emerald-500/40 text-white border-emerald-400/60' : 'bg-green-500/20 text-green-300 border-green-500/30' }
      : isClosed
        ? { text: isAr ? '🔒 التسجيل مغلق' : '🔒 Inscriptions fermées', color: sfBadge ? 'bg-red-600/40 text-white border-red-400/60' : 'bg-red-500/20 text-red-300 border-red-500/30' }
        : { text: isAr ? '⏳ قريباً' : '⏳ Bientôt', color: sfBadge ? 'bg-white/35 text-white border-white/55 font-black' : 'bg-amber-500/20 text-amber-300 border-amber-500/30' };

  return (
    <div className="min-h-screen" dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: theme.bg }}>

      {/* Grid bg */}
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
        <div className="flex items-center gap-3">
          {!isBIO && (
            <div className={`flex items-center gap-1 p-1 ${theme.navBoxBg} border ${theme.navBoxBorder} rounded-xl`}>
              <button onClick={() => setLang('fr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${!isAr ? 'bg-white/15 text-white' : `${theme.textMuted} hover:text-white/90`}`}>
                🇫🇷 Français
              </button>
              <button onClick={() => setLang('ar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${isAr ? 'bg-white/15 text-white' : `${theme.textMuted} hover:text-white/90`}`}>
                🇲🇷 العربية
              </button>
            </div>
          )}
          <Link href="/examen-blanc/leaderboard"
            className={`flex items-center gap-1.5 ${theme.textDim} hover:text-white text-sm font-medium transition`}>
            <Trophy className="w-4 h-4" />
            {isAr ? 'الترتيب' : 'Classement'}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-16">
        <div className="text-center mb-10">

          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold mb-6 ${statusBadge.color}`}>
            {statusBadge.text}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
            {isAr ? 'امتحان تجريبي' : 'Examen Blanc'}
            <span className="block text-5xl sm:text-7xl lg:text-8xl" style={{ background: theme.textGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', paddingBottom: '0.15em' }}>
              {isAr ? (isSF ? 'للقابلات' : isBIO ? 'للبيولوجيين' : 'للممرضين') : (isSF ? 'Sage-femme' : isBIO ? 'Biologiste' : 'Infirmier')}
            </span>
            <span className={`block text-2xl sm:text-3xl lg:text-4xl font-bold mt-2 ${theme.textDim}`}>
              {isAr ? 'على المستوى الوطني' : 'À l\'échelle nationale'}
            </span>
          </h1>

          <p className={`${theme.textDim} text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed`}>
            {isAr
              ? 'اختبر مستواك الحقيقي قبل المسابقة الرسمية. ترتيب وطني. نتائج مفصّلة.'
              : 'Teste ton vrai niveau avant le concours officiel. Analyse détaillée.'}
          </p>

          {/* Stats live */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 mb-10 flex-wrap">
            {[
              { icon: Users, val: stats.participants > 0 ? stats.participants : '—', label: isAr ? 'مشارك' : 'participants' },
              { icon: FileText, val: session?.totalQ ?? 80, label: isAr ? 'سؤال' : 'questions' },
              { icon: Clock, val: `${session?.durationMin ?? 120}min`, label: isAr ? 'مدة' : 'durée' },
            ].map(({ icon: Icon, val, label }, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Icon className={`w-4 h-4 ${theme.iconCls}`} />
                  <span className="text-2xl font-black text-white">{val}</span>
                </div>
                <p className={`${theme.textMuted} text-xs`}>{label}</p>
              </div>
            ))}
          </div>

          {/* Date ouverture */}
          {session && !isOpen && !isClosed && (
            <div className="flex flex-col items-center gap-1 mb-10">
              <span className="text-white font-black text-2xl sm:text-3xl tracking-tight">
                {new Date(session.startsAt).toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <span className={`${theme.timeCls} font-bold text-xl`}>
                {new Date(session.startsAt).toLocaleTimeString(isAr ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {/* CTA */}
          {isOpen ? (
            <Link href={`/examen-blanc/register?id=${session.id}&target=${target}`}
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white hover:opacity-90 transition shadow-2xl ${theme.btnShadow}`}
              style={{ background: theme.accent }}>
              {isAr ? 'المشاركة الآن' : 'Participer maintenant'}
              <ChevronRight className="w-5 h-5" />
            </Link>
          ) : isClosed && isResultsReady ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl animate-bounce">🏆</div>
              <p className="text-white font-black text-3xl sm:text-4xl">
                {isAr ? 'النتائج متاحة الآن !' : 'Résultats disponibles !'}
              </p>
              <p className={`${theme.textDim} text-base`}>
                {isAr ? 'اكتشف ترتيبك الوطني' : 'Découvrez votre classement national'}
              </p>
              <button onClick={() => setShowRecover(true)}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xl text-white hover:opacity-90 transition shadow-2xl animate-pulse"
                style={{ background: theme.accent, boxShadow: isSF ? '0 8px 32px rgba(159,18,57,0.5)' : '0 8px 32px rgba(124,58,237,0.5)' }}>
                <Trophy className="w-6 h-6" />
                {isAr ? 'عرض نتائجي' : 'Voir mes résultats'}
              </button>
            </div>
          ) : (
            <button disabled
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white/40 bg-white/5 border border-white/10 cursor-not-allowed">
              {!hasSession
                ? (isAr ? 'لا توجد جلسة' : 'Aucune session')
                : !isOpen && !isClosed
                  ? (isAr ? 'قريباً…' : 'Bientôt…')
                  : (isAr ? 'مغلق' : 'Fermé')}
            </button>
          )}

          {/* Already registered / Recover */}
          <div className="mt-5 flex flex-col items-center gap-3">
            {!showRecover ? (
              <div className="w-full max-w-xs rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: theme.accent }}>
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
                <p className="font-extrabold text-sm mb-3 text-center">
                  {isAr
                    ? (isSF ? 'هل تريد النجاح في مسابقة القابلات؟ 🎯' : isBIO ? 'هل تريد النجاح في مسابقة البيولوجيا؟ 🎯' : 'هل تريد النجاح في مسابقة التمريض؟ 🎯')
                    : (isSF ? 'Tu veux réussir le concours sage-femme ? 🎯' : isBIO ? 'Tu veux réussir le concours biologiste ? 🎯' : 'Tu veux réussir le concours infirmier ? 🎯')}
                </p>
                <div className="space-y-2 mb-4 text-left">
                  {[
                    { icon: BookOpen,     fr: isSF ? '+700 QCM par thème' : isBIO ? '+400 QCM par thème' : '+600 QCM par thème', ar: isSF ? '+700 سؤال لكل موضوع' : isBIO ? '+400 سؤال لكل موضوع' : '+600 سؤال لكل موضوع' },
                    { icon: BarChart,     fr: 'Statistiques détaillées par thème',         ar: 'إحصائيات مفصّلة حسب الموضوع' },
                    { icon: Trophy,       fr: 'Classement national en temps réel',         ar: 'ترتيب وطني في الوقت الفعلي' },
                    { icon: CheckCircle2, fr: 'Correction complète comme l\'examen blanc', ar: 'تصحيح كامل كالاختبار البيضاء' },
                  ].map(({ icon: Icon, fr, ar }) => (
                    <div key={fr} className={`flex items-center gap-2 text-white text-xs font-medium ${isAr ? 'flex-row-reverse' : ''}`}>
                      <Icon className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />
                      <span>{isAr ? ar : fr}</span>
                    </div>
                  ))}
                </div>
                <Link href="/register"
                  className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-white font-black text-xs transition active:scale-95"
                  style={{ color: isSF ? '#9f1239' : isBIO ? '#047857' : '#7c3aed' }}>
                  🚀 {isAr ? 'فعّل حسابك الآن' : 'Activez votre compte maintenant'}
                </Link>
              </div>
            ) : (
              <div className={`w-full max-w-xs ${theme.cardBg} border ${theme.recoverBorder} rounded-2xl p-5 space-y-3`}>
                <p className="text-white/80 text-sm font-bold text-center">
                  {isAr ? '📱 أدخل رقم هاتفك' : '📱 Ton numéro de téléphone'}
                </p>
                <input
                  type="tel" value={recoverPhone}
                  onChange={e => { setRecoverPhone(e.target.value); setRecoverError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleRecover()}
                  placeholder="+222 XX XX XX XX" dir="ltr"
                  className={`w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 ${theme.ringCls} text-sm`}
                />
                {recoverError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm text-center font-semibold">
                    ❌ {recoverError}
                  </div>
                )}
                <button onClick={handleRecover} disabled={recoverLoading || !recoverPhone.trim()}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition hover:opacity-90"
                  style={{ background: theme.accent }}>
                  {recoverLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? '🔍 بحث' : '🔍 Retrouver')}
                </button>
                <button onClick={() => { setShowRecover(false); setRecoverError(''); setRecoverPhone(''); }}
                  className={`w-full ${theme.textFaint} text-xs hover:text-white/70 transition text-center`}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Banner — Modalité de correction / Barème */}
        <div className={`mb-10 overflow-hidden rounded-2xl border ${theme.bannerBorder}`} style={{ background: theme.bannerBg }}>
          <img src="/correction.png" alt="Modalité de correction" className="w-full h-auto object-contain" />
          <div className={`p-5 flex flex-col gap-3 ${isAr ? 'text-right' : ''}`}>
            <span className={`inline-block w-fit ${theme.badgeCls} text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isAr ? 'self-end' : ''}`}>
              {isAr ? 'جديد' : 'Nouveau'}
            </span>
            <p className="font-black text-white text-base leading-snug">
              {isAr ? 'طريقة تصحيح جديدة مطابقة لمسابقة التوظيف الوطنية' : 'Nouvelle méthode de correction adaptée au concours national'}
            </p>
            <p className={`text-sm ${theme.textDim} leading-relaxed`}>
              {isAr
                ? 'يتم التقييم دون أي تدخل بشري. تُمنح نقطة كاملة لكل إجابة صحيحة تماماً. ويُعتمد نظام التنقيط الجزئي التناسبي مع تطبيق غرامة على كل إجابة خاطئة محددة.'
                : "L'évaluation se fait sans intervention humaine. Un point complet est attribué pour chaque réponse entièrement correcte. Un système de notation partielle proportionnelle est utilisé, avec pénalité pour chaque mauvaise réponse."}
            </p>
            <div className={`grid grid-cols-3 gap-2 mt-1 ${isAr ? 'direction-rtl' : ''}`}>
              {[
                { emoji: '✅', label: isAr ? 'إجابة صحيحة كاملة' : 'Réponse entièrement correcte', val: isAr ? '+ نقطة كاملة' : '+ 1 point complet', color: isSF ? 'bg-emerald-500/30 border-emerald-400/60 text-white' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' },
                { emoji: '🔶', label: isAr ? 'إجابة جزئية' : 'Réponse partielle', val: isAr ? '+ نقطة جزئية' : '+ points partiels', color: isSF ? 'bg-amber-500/30 border-amber-400/60 text-white' : 'bg-amber-500/10 border-amber-500/20 text-amber-300' },
                { emoji: '❌', label: isAr ? 'إجابة خاطئة' : 'Mauvaise réponse', val: isAr ? 'غرامة' : 'Pénalité', color: isSF ? 'bg-red-500/30 border-red-400/60 text-white' : 'bg-red-500/10 border-red-500/20 text-red-300' },
              ].map(({ emoji, label, val, color }, i) => (
                <div key={i} className={`rounded-xl border p-3 text-center ${color}`}>
                  <p className="text-xl mb-1">{emoji}</p>
                  <p className="text-[11px] font-semibold leading-tight mb-1">{label}</p>
                  <p className="text-xs font-black">{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { icon: FileText, title: session?.totalQ ?? 80, sub: isAr ? 'سؤال طبي' : 'Questions médicales' },
            { icon: Clock, title: `${session?.durationMin ?? 120} min`, sub: isAr ? 'مدة الاختبار' : "Durée de l'examen" },
            { icon: Trophy, title: isAr ? 'وطني' : 'Nationale', sub: isAr ? 'ترتيب وطني' : 'À l\'échelle nationale' },
            { icon: Zap, title: isAr ? '24 ساعة' : '24h', sub: isAr ? 'للنتائج المفصّلة' : 'Pour les résultats' },
          ].map(({ icon: Icon, title, sub }, i) => (
            <div key={i} className={`${theme.cardBg} backdrop-blur border ${theme.cardBorder} rounded-2xl p-5 text-center hover:bg-white/25 transition`}>
              <Icon className={`w-6 h-6 ${theme.iconCls} mx-auto mb-3`} />
              <p className="text-2xl font-black text-white mb-1">{title}</p>
              <p className={`${theme.textMuted} text-xs`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Témoignages carousel */}
        {(() => {
          const testimonials = isAr
            ? [{ name: 'مريم', role: isSF ? 'قابلة' : isBIO ? 'بيولوجية' : 'ممرضة', img: '/images/ar-com-1.jpeg' }, { name: isSF ? 'آمنة' : 'سيدي', role: isSF ? 'قابلة' : isBIO ? 'بيولوجي' : 'ممرض', img: '/images/ar-com-2.jpeg' }]
            : [{ name: 'Fatimetou', role: isSF ? 'Sage-femme' : isBIO ? 'Biologiste' : 'Infirmière', img: '/images/fr-com-1.jpeg' }, { name: isSF ? 'Marième' : 'Mohamed', role: isSF ? 'Sage-femme' : isBIO ? 'Biologiste' : 'Infirmier', img: '/images/fr-com-2.png' }];
          const t = testimonials[testIdx % testimonials.length];
          return (
            <div className={`${theme.cardBg} backdrop-blur border ${theme.cardBorder} rounded-3xl p-8 mb-16`}>
              <h2 className="text-xl font-black text-white mb-6 text-center">
                {isAr ? `💬 انضموا إلى +${isSF ? '700' : isBIO ? '400' : '600'} سؤال على Al Bourour` : `💬 Ils ont rejoint les +${isSF ? '700' : isBIO ? '400' : '600'} QCM d'Al Bourour`}
              </h2>
              <div className="flex flex-col items-center text-center" style={{ transition: 'opacity 0.7s ease-in-out', opacity: testFade ? 1 : 0 }}>
                <div className="mb-4 overflow-hidden rounded-2xl w-48 shadow-lg">
                  <img src={t.img} alt={t.name} className="w-full h-auto object-contain" />
                </div>
                <p className="font-black text-white text-base">{t.name}</p>
                <p className={`${theme.textMuted} text-sm mt-1`}>{t.role}</p>
              </div>
              <div className="flex justify-center gap-2 mt-5">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => { setTestFade(false); setTimeout(() => { setTestIdx(i); setTestFade(true); }, 400); }}
                    className={`rounded-full transition-all ${i === testIdx ? 'w-4 h-1.5' : 'w-1.5 h-1.5'}`}
                    style={{ background: i === testIdx ? (isSF ? '#9f1239' : isBIO ? '#047857' : '#7c3aed') : 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* Trust section */}
        <div className="text-center">
          <div className={`flex flex-wrap items-center justify-center gap-6 ${theme.textFaint} text-sm`}>
            {[
              [Shield, isAr ? 'أسئلة رسمية معتمدة' : 'Questions officielles validées'],
              [Star, isAr ? `${stats.totalAllTime}+ مشارك` : `${stats.totalAllTime}+ participants`],
              [MapPin, isAr ? 'كل ولايات موريتانيا' : 'Toutes les wilayas'],
            ].map(([Icon, text]: any, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ExamenBlancPage() {
  return <ExamenBlancPageContent target="INFIRMIER" />;
}

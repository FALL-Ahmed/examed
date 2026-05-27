'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Clock, FileText, Trophy, Users, ChevronRight, Star, Zap, Shield, MapPin, Loader2 } from 'lucide-react';

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
type Target = 'INFIRMIER' | 'SAGE_FEMME';

export function ExamenBlancPageContent({ target }: { target: Target }) {
  const { lang, setLang } = useLang();
  const isAr = lang === 'ar';
  const isSF = target === 'SAGE_FEMME';
  const theme = {
    bg: isSF ? 'linear-gradient(145deg,#f48fb1 0%,#f06292 50%,#e91e8c 100%)' : 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)',
    glow1: isSF ? 'radial-gradient(circle,#9f1239,transparent)' : 'radial-gradient(circle,#7c3aed,transparent)',
    glow2: isSF ? 'radial-gradient(circle,#be123c,transparent)' : 'radial-gradient(circle,#6366f1,transparent)',
    accent: isSF ? 'linear-gradient(135deg,#9f1239,#be185d)' : 'linear-gradient(135deg,#7c3aed,#6366f1)',
    textGrad: isSF ? 'linear-gradient(135deg,#ffffff,#fce7f3)' : 'linear-gradient(135deg,#a78bfa,#818cf8)',
    iconCls: isSF ? 'text-white' : 'text-violet-400',
    spinnerCls: isSF ? 'border-white' : 'border-violet-400',
    timeCls: isSF ? 'text-white' : 'text-violet-300',
    btnShadow: isSF ? 'shadow-pink-900/50' : 'shadow-violet-900/50',
    bannerBg: isSF ? 'rgba(255,255,255,0.18)' : 'linear-gradient(to bottom,rgba(124,58,237,0.1),rgba(99,102,241,0.1))',
    bannerBorder: isSF ? 'border-white/30' : 'border-violet-500/30',
    badgeCls: isSF ? 'bg-rose-800' : 'bg-violet-500',
    recoverBorder: isSF ? 'border-white/30' : 'border-violet-500/30',
    ringCls: isSF ? 'focus:ring-white' : 'focus:ring-violet-500',
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

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { load(); }, [load]);

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
            {isAr ? 'الامتحان التجريبي' : 'Examen Blanc'}
            <span className="block" style={{ background: theme.textGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {isAr ? 'الوطني' : 'À l\'échelle nationale'}
            </span>
          </h1>

          <p className={`${theme.textDim} text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed`}>
            {isAr
              ? 'اختبر مستواك الحقيقي قبل المسابقة الرسمية. ترتيب وطني. نتائج مفصّلة.'
              : 'Teste ton vrai niveau avant le concours officiel. Classement à l\'échelle nationale. Analyse détaillée.'}
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
          {session && isClosed && isResultsReady && (
            <p className="text-green-400 font-bold text-lg mb-10">
              {isAr ? '✅ النتائج متاحة الآن' : '✅ Résultats disponibles'}
            </p>
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
            <button onClick={() => setShowRecover(true)}
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white hover:opacity-90 transition shadow-2xl ${theme.btnShadow}`}
              style={{ background: theme.accent }}>
              <Trophy className="w-5 h-5" />
              {isAr ? 'عرض نتائجي' : 'Voir mes résultats'}
            </button>
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
              <Link href="/free-practice"
                className="w-full max-w-xs py-4 rounded-2xl font-bold text-sm text-white text-center transition active:scale-95"
                style={{ background: theme.accent, boxShadow: isSF ? '0 4px 20px rgba(219,39,119,0.4)' : '0 4px 20px rgba(124,58,237,0.4)' }}>
                {isAr ? '🎯 تدرّب مجاناً قبل الامتحان' : '🎯 Entraînez-vous gratuitement avant l\'examen'}
              </Link>
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

        {/* What you get */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <div className={`${theme.cardBg} backdrop-blur border ${theme.cardBorder} rounded-3xl p-8`}>
            <h2 className="text-xl font-black text-white mb-6">
              {isAr ? '📋 مميزات الامتحان' : "📋 L'examen en détail"}
            </h2>
            <div className="space-y-4">
              {(isAr ? [
                ['🧠', 'أسئلة من جميع المواد الطبية'],
                ['⚖️', 'نفس نظام التقييم الرسمي'],
                ['📱', 'متاح على الهاتف والحاسوب'],
                ['🛡️', 'نظام كشف الغش'],
                ['💾', 'حفظ تلقائي كل سؤال'],
                ['🔒', 'لا يحتاج حساباً'],
              ] : [
                ['🧠', 'Questions de toutes les matières'],
                ['⚖️', 'Barème officiel identique au vrai concours'],
                ['📱', 'Accessible mobile et ordinateur'],
                ['🛡️', 'Système anti-triche intégré'],
                ['💾', 'Sauvegarde automatique à chaque réponse'],
                ['🔒', 'Aucun compte requis'],
              ]).map(([icon, text], i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className={`${theme.textFeature} text-sm`}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${theme.cardBg} backdrop-blur border ${theme.cardBorder} rounded-3xl p-8`}>
            <h2 className="text-xl font-black text-white mb-6">
              {isAr ? '📊 تحصل على بعد 24 ساعة' : '📊 Résultats après 24h'}
            </h2>
            <div className="space-y-4">
              {(isAr ? [
                ['🎯', 'تحليل أداءك بكل مادة'],
                ['✅', 'مراجعة كل سؤال مع التصحيح'],
                ['📉', 'مواد القوة ومواد الضعف'],
                ['📈', 'مقارنة بالمتوسط العام'],
                ['🔐', 'بياناتك سرية — لا أحد يرى معلومات الآخرين'],
              ] : [
                ['🎯', 'Analyse par matière et sous-thème'],
                ['✅', 'Révision de chaque question avec correction'],
                ['📉', 'Points forts et points faibles identifiés'],
                ['📈', 'Comparaison avec la moyenne générale'],
                ['🔐', 'Données confidentielles — personne ne verra les infos des autres'],
              ]).map(([icon, text], i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className={`${theme.textFeature} text-sm`}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

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

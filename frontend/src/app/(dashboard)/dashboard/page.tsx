'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { attemptsApi, userApi, statsApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import {
  BookOpen, Zap, RefreshCw, TrendingUp,
  Clock, ArrowRight, Target, Award, Flame, ChevronRight, AlertTriangle, CalendarCheck, Download, FileText, Trophy,
} from 'lucide-react';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';

function ScoreRing({ value }: { value: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="110" height="110" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
      />
      <text x="50" y="45" textAnchor="middle" fill="white" fontSize="20" fontWeight="800">{value}</text>
      <text x="50" y="59" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="8.5" fontWeight="500">% réussite</text>
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t, lang } = useLang();
  const router = useRouter();
  const isAr = lang === 'ar';
  const [weakThemeLoading, setWeakThemeLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [myRank, setMyRank] = useState<{ rank: number | null; total: number; globalScore: number } | null>(null);
  const [streak, setStreak] = useState(0);
  const [weakTheme, setWeakTheme] = useState<{ themeId: string; name: string; avgScore: number; sessions: number } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    userApi.stats().then((r) => setStats(r.data)).catch(() => {});
    attemptsApi.history().then((r) => {
      setHistory(r.data.slice(0, 5));
      // Calcul streak : jours consécutifs avec au moins 1 session
      const days = [...new Set<number>(
        r.data.map((a: any) => { const d = new Date(a.startedAt); d.setHours(0,0,0,0); return d.getTime(); })
      )].sort((a: number, b: number) => b - a);
      const today = new Date(); today.setHours(0,0,0,0);
      const todayMs = today.getTime();
      if (!days.length || (days[0] !== todayMs && days[0] !== todayMs - 86400000)) { setStreak(0); return; }
      let s = 1;
      for (let i = 1; i < days.length; i++) { if ((days[i-1] as number) - (days[i] as number) === 86400000) s++; else break; }
      setStreak(s);
    }).catch(() => {});
    userApi.me().then((r) => {
      setProfile(r.data);
      if (!r.data.gender) setShowProfileModal(true);
    }).catch(() => {});
    statsApi.myRank().then((r) => setMyRank(r.data)).catch(() => {});
    attemptsApi.weakTheme().then((r) => setWeakTheme(r.data)).catch(() => {});
  }, []);

  async function startWeakThemePractice() {
    if (!weakTheme) return;
    setWeakThemeLoading(true);
    try {
      const { data } = await attemptsApi.start({
        mode: 'PRACTICE',
        themeId: weakTheme.themeId,
        count: 10,
        language: lang.toUpperCase(),
      });
      localStorage.setItem('practice_state', JSON.stringify({
        session: data, currentIndex: 0,
        answers: Array(data.questions.length).fill(null),
      }));
      router.push('/practice');
    } catch {} finally { setWeakThemeLoading(false); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dash.hello.morning') : hour < 18 ? t('dash.hello.afternoon') : t('dash.hello.evening');
  const firstName = user?.fullName?.split(' ')[0];

  const MODES = [
    { href: '/practice', icon: BookOpen, label: t('nav.practice'), desc: t('practice.subtitle'), color: '#0ea5e9', badge: null },
    { href: '/exam',     icon: Zap,      label: t('nav.exam'),     desc: t('exam.title'),      color: '#6366f1', badge: 'Premium' },
    { href: '/review',   icon: RefreshCw, label: t('nav.review'),  desc: t('review.subtitle'), color: '#f59e0b', badge: 'Premium' },
    { href: '/stats',    icon: TrendingUp, label: t('nav.stats'),  desc: t('stats.progress'),  color: '#3b82f6', badge: 'Premium' },
  ];

  const subEnd = profile?.subscriptionEnd ? new Date(profile.subscriptionEnd) : null;
  const daysLeft = subEnd ? Math.ceil((subEnd.getTime() - Date.now()) / 86400000) : null;

  const [slideIdx, setSlideIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => { setSlideIdx(i => (i + 1) % 3); setFadeIn(true); }, 300);
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const SLIDES = [
    {
      badge: 'PDF',
      image: null as string | null,
      title: isAr
        ? 'بطاقة المراجعة — احفظها عن ظهر قلب'
        : 'Fiche mémo — À retenir par cœur',
      desc: isAr
        ? 'كل ما يجب حفظه قبل يوم المسابقة — الصيغ، المعايير البيولوجية، المقاييس. حمّل وراجع !'
        : 'Tout ce que tu dois mémoriser avant le jour J — formules, constantes, scores. Télécharge et révise !',
      download: '/fiche-memo.pdf' as string | null,
    },
    {
      badge: isAr ? 'جديد' : 'Nouveau',
      image: (isAr ? '/2.png' : '/1.png') as string | null,
      title: isAr
        ? 'أكثر من 600 سؤال جديد للمراجعة'
        : 'Plus de 600 nouvelles questions à réviser',
      desc: isAr
        ? 'استعد بشكل أفضل لمسابقة ممرض الدولة. البرور يرافقك حتى قاعة الامتحان.'
        : "Préparez-vous encore mieux au concours national d'infirmier d'État. Al Bourour vous accompagne jusqu'à la salle d'examen.",
      download: null as string | null,
    },
    {
      badge: isAr ? 'جديد' : 'Nouveau',
      image: '/correction.png' as string | null,
      title: isAr
        ? 'طريقة تصحيح جديدة مطابقة لمسابقة التوظيف الوطنية'
        : 'Nouvelle méthode de correction adaptée au concours national',
      desc: isAr
        ? 'يتم التقييم دون أي تدخل بشري. تُمنح نقطة كاملة لكل إجابة صحيحة تماماً. ويُعتمد نظام التنقيط الجزئي التناسبي مع تطبيق غرامة على كل إجابة خاطئة محددة.'
        : "L'évaluation se fait sans intervention humaine. Un point complet est attribué pour chaque réponse entièrement correcte. Un système de notation partielle proportionnelle est utilisé, avec pénalité pour chaque mauvaise réponse.",
      download: null as string | null,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {showProfileModal && (
        <ProfileCompletionModal
          isAr={isAr}
          onClose={() => setShowProfileModal(false)}
          onSaved={() => { setShowProfileModal(false); userApi.me().then((r) => setProfile(r.data)).catch(() => {}); }}
        />
      )}

      {/* ── Hero ── */}
      <div className="rounded-2xl gradient-primary p-6 md:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <p className="text-white/60 text-sm mb-1">{greeting},</p>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{firstName} 👋</h1>
            <p className="text-white/65 text-sm leading-relaxed max-w-sm">
              {stats?.totalAttempts
                ? `${stats.totalAttempts} ${t('dash.stats.series').toLowerCase()} — ${t('dash.start').toLowerCase()}`
                : t('dash.start')}
            </p>
            <Link href="/practice"
              className="inline-flex items-center gap-2 mt-5 bg-white text-violet-700 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-white/90 transition shadow-md">
              {t('dash.practice')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {(myRank || stats) && <ScoreRing value={myRank?.globalScore ?? stats?.globalScore ?? 0} />}
        </div>
      </div>


      {/* ── Annonces cycliques (10s) ── */}
      <div
        className={`overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-500/10 to-indigo-500/10 ${isAr ? 'text-right' : ''}`}
        style={{ transition: 'opacity 0.3s ease', opacity: fadeIn ? 1 : 0 }}
      >
        {SLIDES[slideIdx].image ? (
          <img src={SLIDES[slideIdx].image!} alt="" className="w-full h-auto object-contain" />
        ) : SLIDES[slideIdx].download ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-6 pb-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div className={`flex-1 ${isAr ? 'text-right' : ''}`}>
              <p className="text-white font-bold text-lg leading-tight">
                {isAr ? 'الصيغ الطبية الأساسية' : 'Formules & Constantes'}
              </p>
              <p className="text-white/70 text-xs mt-0.5">
                {isAr ? 'ملف PDF · صفحتان' : 'Fichier PDF · 2 pages'}
              </p>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10" />
          </div>
        ) : null}
        <div className="p-5 flex flex-col gap-2">
          <span className={`inline-block w-fit bg-violet-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isAr ? 'self-end' : ''}`}>
            {SLIDES[slideIdx].badge}
          </span>
          <p className="font-bold text-base leading-snug">{SLIDES[slideIdx].title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{SLIDES[slideIdx].desc}</p>
          {SLIDES[slideIdx].download && (
            <a
              href={SLIDES[slideIdx].download!}
              download
className={`inline-flex items-center gap-2 mt-2 w-fit bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition ${isAr ? 'flex-row-reverse self-end' : ''}`}
            >
              <Download className="w-4 h-4" />
              {isAr ? 'تحميل الملف' : 'Télécharger le PDF'}
            </a>
          )}
          <div className={`flex gap-1.5 mt-1 ${isAr ? 'justify-end' : ''}`}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => { setFadeIn(false); setTimeout(() => { setSlideIdx(i); setFadeIn(true); }, 300); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === slideIdx ? 'bg-violet-500 w-4' : 'bg-violet-300/50'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Subscription expiry banner ── */}
      {subEnd && daysLeft !== null && daysLeft <= 0 && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4 border bg-red-500/10 border-red-500/30 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">{t('dash.sub.expired')}</span>
            <span className="opacity-70 ml-2">— {t('dash.sub.renew')}</span>
          </div>
        </div>
      )}

      {subEnd && daysLeft !== null && daysLeft > 0 && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3">
          <CalendarCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-400">
            {isAr ? 'الاشتراك صالح حتى يوم المسابقة ✓' : 'Compte actif · valable jusqu\'au concours ✓'}
          </p>
        </div>
      )}

      {/* ── Classement global — Premium ── */}
      {myRank && myRank.rank !== null && myRank.total > 0 && (() => {
        const { rank, globalScore: base } = myRank;
        const ordFr = (n: number) => n === 1 ? '1er' : `${n}e`;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

        const aboveShow = Math.min(2, rank - 1);
        const belowShow = Math.min(2, myRank.total - rank);
        const aboveOffsets = [14, 7].slice(0, aboveShow).reverse();
        const belowOffsets = [7, 14].slice(0, belowShow);
        const fakeNames = ['Ahmed B.', 'Fatima M.', 'Mohamed O.', 'Mariem S.', 'Ibrahima D.', 'Aissata K.'];
        const rows: { rank: number; isUser: boolean; score: number; name: string }[] = [
          ...aboveOffsets.map((off, i) => ({ rank: rank - aboveShow + i, isUser: false, score: Math.min(100, Math.round(base + off)), name: fakeNames[i] })),
          { rank, isUser: true, score: base, name: isAr ? 'أنت' : 'Vous' },
          ...belowOffsets.map((off, i) => ({ rank: rank + 1 + i, isUser: false, score: Math.max(5, Math.round(base - off)), name: fakeNames[aboveShow + 1 + i] ?? fakeNames[i] })),
        ];

        return (
          <div className="relative rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%)' }}>

            {/* Décors de fond */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="absolute -bottom-8 -left-6 w-36 h-36 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />

            <div className="relative p-5 space-y-4">

              {/* En-tête */}
              <div className={`flex items-center justify-between ${isAr ? 'flex-row-reverse' : ''}`}>
                <p className="text-white/90 font-bold text-sm tracking-wide uppercase">
                  {isAr ? '🏆 تصنيفك العام' : '🏆 Classement global'}
                </p>
                <span className="text-[10px] font-bold text-white/60 border border-white/20 rounded-full px-2 py-0.5 bg-white/10">
                  {isAr ? 'يتجدد تلقائياً' : 'Temps réel'}
                </span>
              </div>

              {/* Rang central — grand et impactant */}
              <div className="text-center py-2">
                {medal
                  ? <p className="text-6xl mb-1">{medal}</p>
                  : <p className="text-7xl font-black text-white leading-none drop-shadow-lg"
                      style={{ textShadow: '0 0 40px rgba(167,139,250,0.6)' }}>
                      {isAr ? `#${rank}` : ordFr(rank)}
                    </p>
                }
                <p className="text-white/50 text-xs mt-2">
                  {isAr
                    ? `معدّلك الإجمالي : ${base}% · ${rank - 1} مترشح يتفوق عليك`
                    : `Moyenne globale : ${base}% · ${rank - 1} candidat${rank - 1 > 1 ? 's' : ''} devant vous`}
                </p>
              </div>

              {/* Leaderboard */}
              <div className="space-y-1.5">
                {rows.map((row, i) => {
                  const sc = row.score;
                  if (row.isUser) {
                    return (
                      <div key="user" className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{
                          background: 'rgba(99,102,241,0.35)',
                          border: '1px solid rgba(165,180,252,0.45)',
                          boxShadow: '0 0 18px rgba(99,102,241,0.35)',
                        }}>
                        <span className="text-xs font-black text-indigo-200 w-8 flex-shrink-0 text-center">
                          {isAr ? `#${row.rank}` : ordFr(row.rank)}
                        </span>
                        <span className="text-sm font-bold text-white flex-shrink-0 w-16 truncate">{row.name}</span>
                        <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <div className="h-full rounded-full bg-white" style={{ width: `${sc}%` }} />
                        </div>
                        <span className="text-sm font-black text-white w-10 text-right flex-shrink-0">{sc}%</span>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none' }}>
                      <span className="text-xs font-bold text-white/40 w-8 flex-shrink-0 text-center">
                        {isAr ? `#${row.rank}` : ordFr(row.rank)}
                      </span>
                      <span className="text-xs text-white/30 flex-shrink-0 w-16 truncate">{row.name}</span>
                      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${sc}%`, background: 'rgba(255,255,255,0.3)' }} />
                      </div>
                      <span className="text-xs font-bold text-white/30 w-10 text-right flex-shrink-0">{sc}%</span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Streak + Prochain objectif ── */}
      {(streak > 0 || (myRank && myRank.globalScore > 0)) && (() => {
        const base = myRank?.globalScore ?? 0;
        const OBJECTIVES = [
          { score: 50, label: isAr ? 'مستوى مقبول' : 'Niveau correct',      from: '#f59e0b', to: '#d97706' },
          { score: 65, label: isAr ? 'المتوسط الوطني' : 'Moyenne nationale', from: '#f97316', to: '#ea580c' },
          { score: 75, label: isAr ? 'مترشح جيد' : 'Bon candidat',          from: '#22c55e', to: '#16a34a' },
          { score: 85, label: isAr ? 'ممتاز' : 'Excellent',                  from: '#10b981', to: '#059669' },
          { score: 95, label: isAr ? 'النخبة' : 'Élite',                    from: '#6366f1', to: '#4f46e5' },
        ];
        const nextObj = OBJECTIVES.find(o => o.score > base);
        const prevScore = nextObj ? (OBJECTIVES[OBJECTIVES.indexOf(nextObj) - 1]?.score ?? 0) : 95;
        const progress = nextObj ? Math.round(Math.max(0, ((base - prevScore) / (nextObj.score - prevScore)) * 100)) : 100;
        const streakEmoji = streak >= 14 ? '🔥' : streak >= 7 ? '🔥' : streak >= 3 ? '🔥' : streak >= 1 ? '⚡' : '💤';

        return (
          <div className="grid grid-cols-2 gap-3">

            {/* Streak */}
            <div className="rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 text-center border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/30">
              <span className="text-4xl leading-none">{streakEmoji}</span>
              <p className="text-4xl font-black text-orange-600 dark:text-orange-400 leading-none">{streak}</p>
              <p className="text-orange-700 dark:text-orange-300 text-xs font-semibold">
                {isAr ? 'يوم متواصل' : `jour${streak > 1 ? 's' : ''} de suite`}
              </p>
              {streak === 0 && (
                <p className="text-orange-400 text-[10px]">{isAr ? 'ابدأ اليوم!' : 'Commencez aujourd\'hui !'}</p>
              )}
            </div>

            {/* Prochain objectif */}
            {nextObj ? (
              <div className="rounded-2xl p-4 flex flex-col gap-2.5 border border-border bg-card">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {isAr ? 'الهدف التالي' : 'Prochain objectif'}
                  </p>
                  <p className="font-bold text-sm mt-0.5">{nextObj.label}</p>
                </div>
                {/* Barre de progression */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{base}%</span>
                    <span className="font-bold" style={{ color: nextObj.from }}>{nextObj.score}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, background: `linear-gradient(90deg,${nextObj.from},${nextObj.to})` }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAr ? `${nextObj.score - base} نقطة متبقية` : `Encore +${nextObj.score - base} pts`}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl p-4 flex flex-col items-center justify-center gap-1 text-center border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30">
                <span className="text-3xl">🏆</span>
                <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{isAr ? 'مستوى ممتاز!' : 'Niveau élite !'}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Thème le plus faible ── */}
      {weakTheme && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
            {/* Icône + label */}
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📉</span>
            </div>
            <div className={`flex-1 min-w-0 ${isAr ? 'text-right' : ''}`}>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                {isAr ? 'الموضوع الأضعف' : 'Point faible à travailler'}
              </p>
              <p className="font-bold text-sm leading-tight text-foreground truncate">
                {weakTheme.name || (isAr ? 'موضوع بحاجة إلى تحسين' : 'Thème à améliorer')}
              </p>
              {/* Barre + score */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${weakTheme.avgScore}%` }} />
                </div>
                <span className="text-sm font-black text-red-500 flex-shrink-0 w-9 text-right">{weakTheme.avgScore}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {isAr
                  ? `معدّلك على ${weakTheme.sessions} جلسات`
                  : `Moyenne sur ${weakTheme.sessions} session${weakTheme.sessions > 1 ? 's' : ''}`}
              </p>
            </div>
            {/* CTA */}
            <button
              onClick={startWeakThemePractice}
              disabled={weakThemeLoading}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md shadow-violet-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {weakThemeLoading
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : null}
              {isAr ? 'تمرّن الآن' : 'Réviser →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Stats rapides ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Target, label: t('dash.stats.score'), value: `${stats.globalScore ?? 0}%` },
            { icon: Award, label: t('stats.bestScore'), value: `${stats.history?.length ? Math.max(...stats.history.map((h: any) => h.score)) : 0}%` },
            { icon: Flame, label: t('dash.stats.series'), value: stats.totalAttempts ?? 0 },
            { icon: BookOpen, label: t('dash.stats.correct'), value: `${stats.totalCorrect ?? 0}/${stats.totalQuestions ?? 0}` },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <s.icon className="w-4 h-4 text-muted-foreground mb-3" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Modes ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('dash.start')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map((m) => (
            <Link key={m.href} href={m.href}
              className="group bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}>
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{m.label}</span>
                    {m.badge && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-medium">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Historique ── */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('dash.activity')}</h2>
            <Link href="/stats" className="text-xs text-primary font-semibold hover:underline">
              {t('stats.sessions')}
            </Link>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {history.map((a) => {
              const scoreColor = a.score >= 70 ? 'text-emerald-500' : a.score >= 50 ? 'text-amber-500' : 'text-red-500';
              return (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/40 transition">
                  <div className={`text-sm font-bold tabular-nums w-10 flex-shrink-0 ${scoreColor}`}>
                    {a.score}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {a.mode === 'PRACTICE' ? t('nav.practice') : a.mode === 'EXAM' ? t('nav.exam') : t('nav.review')}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.correctQ}/{a.totalQ} {t('results.correct').toLowerCase()}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {Math.floor(a.timeTaken / 60)}m{a.timeTaken % 60 > 0 ? ` ${a.timeTaken % 60}s` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

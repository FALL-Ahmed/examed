'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { attemptsApi, publicApi, statsApi } from '@/lib/api';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, RotateCcw, RefreshCw, Clock, Target, BarChart2, TrendingUp } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';
import { sentenceCase, resolveImageUrl } from '@/lib/utils';

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPractice = searchParams.get('from') === 'practice';
  const practiceThemeId = searchParams.get('themeId') ?? undefined;
  const practiceSubThemeId = searchParams.get('subThemeId') ?? undefined;
  const practiceCount = parseInt(searchParams.get('count') || '10');
  const [review, setReview] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { t, lang } = useLang();
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [natStats, setNatStats] = useState<{ avg: number; percentile: number; total: number; estimated?: boolean; distribution?: { min: number; h: number }[] } | null>(null);
  const [prevAttempts, setPrevAttempts] = useState<{ id: string; score: number; correctQ: number; totalQ: number; completedAt: string }[]>([]);
  const [globalAvg, setGlobalAvg] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<{ rank: number | null; total: number; globalScore: number } | null>(null);

  useEffect(() => {
    attemptsApi.review(attemptId).then((r) => {
      setReview(r.data);
      const s = r.data.score;
      publicApi.nationalStats(s, practiceThemeId, practiceSubThemeId)
        .then((rs) => setNatStats(rs.data))
        .catch(() => setNatStats({ avg: 68, percentile: Math.round((s / 100) * 80), total: 0, estimated: true }));
      if (practiceThemeId) {
        attemptsApi.themeProgress(practiceThemeId, practiceSubThemeId, attemptId)
          .then((rp) => setPrevAttempts(rp.data.attempts))
          .catch(() => {});
      }
      // Vrai rang depuis le backend
      statsApi.myRank()
        .then((rr) => {
          setMyRank(rr.data);
          setGlobalAvg(rr.data.globalScore);
        })
        .catch(() => {});
    }).finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!review) return <p className="text-center text-muted-foreground">{isAr ? 'النتائج غير موجودة' : 'Résultats non trouvés'}</p>;

  const score = review.score;
  const rawScore: number = review.rawScore ?? review.correctQ;
  const total = review.questions.length;
  const noteOn10 = total > 0 ? Math.round((rawScore / total) * 100) / 10 : 0;
  const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 70
    ? (isAr ? 'ممتاز !' : 'Excellent !')
    : score >= 50
    ? (isAr ? 'أحسنت !' : 'Bien joué !')
    : (isAr ? 'واصل المجهود !' : 'Continuez les efforts !');

  const correct = review.questions.filter((q: any) => q.isCorrect).length;
  const wrongIds = review.questions.filter((q: any) => !q.isCorrect).map((q: any) => q.questionId);
  const mins = Math.floor(review.timeTaken / 60);
  const secs = review.timeTaken % 60;

  async function startPracticeRetry() {
    setRetryLoading(true);
    try {
      const { data } = await attemptsApi.start({
        mode: 'PRACTICE',
        themeId: practiceThemeId,
        subThemeId: practiceSubThemeId,
        count: practiceCount,
        language: lang.toUpperCase(),
      });
      localStorage.setItem('practice_state', JSON.stringify({
        session: data,
        currentIndex: 0,
        answers: Array(data.questions.length).fill(null),
      }));
      router.push('/practice');
    } catch {} finally { setRetryLoading(false); }
  }

  async function startSessionReview() {
    if (!wrongIds.length) return;
    setReviewLoading(true);
    try {
      const { data } = await attemptsApi.start({ mode: 'REVIEW', questionIds: wrongIds });
      router.push(`/exam/${data.attemptId}?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erreur lors du démarrage de la révision');
    } finally { setReviewLoading(false); }
  }

  const filtered = review.questions.filter((q: any) =>
    filter === 'all' ? true : filter === 'correct' ? q.isCorrect : !q.isCorrect
  );

  const FILTERS = [
    { key: 'all', label: `${t('stats.total')} (${total})` },
    { key: 'correct', label: `${t('results.correct')} (${correct})` },
    { key: 'wrong', label: `${t('results.incorrect')} (${total - correct})` },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Score card ── */}
      <div className="bg-card border border-border rounded-2xl p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center mb-4 border-4"
            style={{ borderColor: scoreColor, background: `${scoreColor}12` }}>
            <span className="text-2xl font-extrabold leading-tight" style={{ color: scoreColor }}>
              {noteOn10.toFixed(1)}<span className="text-base font-semibold">/10</span>
            </span>
            <span className="text-xs font-medium mt-0.5" style={{ color: scoreColor }}>{score.toFixed(1)}%</span>
          </div>
          <h2 className="text-xl font-bold">{scoreLabel}</h2>
          <p className="text-muted-foreground text-sm mt-1">{correct} {isAr ? 'إجابة صحيحة تامة' : 'réponse(s) parfaite(s)'} / {total}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Target, label: isAr ? 'النقطة' : 'Note', value: `${noteOn10.toFixed(1)}/10`, color: scoreColor },
            { icon: CheckCircle, label: isAr ? 'صحيح تام' : 'Parfaites', value: `${correct}/${total}`, color: '#10b981' },
            { icon: Clock, label: isAr ? 'الوقت المستغرق' : 'Temps utilisé', value: `${mins}m ${secs}s`, color: '#6366f1' },
          ].map((s) => (
            <div key={s.label} className="bg-secondary rounded-xl p-3 text-center">
              <s.icon className="w-4 h-4 mx-auto mb-2" style={{ color: s.color }} />
              <p className="font-bold text-sm">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bloc unifié : Progression & Stats nationales ── */}
      {natStats && (() => {
        const SIMULATED = [
          { min: 20, h: 4 }, { min: 25, h: 7 }, { min: 30, h: 12 },
          { min: 35, h: 20 }, { min: 40, h: 31 }, { min: 45, h: 45 },
          { min: 50, h: 61 }, { min: 55, h: 77 }, { min: 60, h: 89 },
          { min: 65, h: 97 }, { min: 70, h: 100 }, { min: 75, h: 91 },
          { min: 80, h: 75 }, { min: 85, h: 54 }, { min: 90, h: 33 },
          { min: 95, h: 17 }, { min: 100, h: 6 },
        ];
        const bars = natStats.distribution ?? SIMULATED;
        const THRESHOLD = 75;
        const toPct = (v: number) => ((v - 20) / 80) * 100;
        const clamp = (v: number) => toPct(Math.max(20, Math.min(100, v)));
        const barColor = (v: number) => v <= 35 ? '#dc2626' : v <= 45 ? '#ea580c' : v <= 55 ? '#f97316' : v <= 62 ? '#fbbf24' : v <= 68 ? '#a3e635' : v <= 75 ? '#4ade80' : '#16a34a';

        const themeName = review.questions[0]?.theme ?? '';
        const subThemeName = review.questions[0]?.subTheme ?? '';

        const subThemeQs = practiceSubThemeId
          ? review.questions.filter((q: any) => q.subTheme === subThemeName)
          : review.questions;
        const subCorrect = subThemeQs.filter((q: any) => q.isCorrect).length;
        const subTotal = subThemeQs.length;
        const subPct = subTotal > 0 ? Math.round((subCorrect / subTotal) * 100) : 0;
        const subColor = subPct >= 70 ? '#10b981' : subPct >= 50 ? '#f59e0b' : '#ef4444';

        const prev = prevAttempts[0];
        const diff = prev ? Math.round(score - prev.score) : null;

        // Classement simulé autour du score global de l'utilisateur
        const base = globalAvg ?? natStats.avg;
        const pct = natStats.percentile;
        // Combien de candidats simulés au-dessus vs en-dessous (total 5)
        const aboveCount = pct >= 75 ? 1 : pct >= 50 ? 2 : pct >= 25 ? 3 : 4;
        const belowCount = 5 - aboveCount - 1; // -1 pour la ligne "Vous"
        const aboveOffsets = [22, 15, 9, 5].slice(0, aboveCount);
        const belowOffsets = [6, 13, 19, 25].slice(0, belowCount);

        return (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-5">

            {/* En-tête */}
            <div>
              <div className={`flex items-center gap-2 mb-1 ${isAr ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="w-4 h-4 text-violet-600" />
                </div>
                <p className="font-bold text-sm">{isAr ? 'إحصائياتك وتطور مستواك' : 'Votre progression & Statistiques'}</p>
              </div>
              {themeName && (
                <p className="text-xs text-muted-foreground">
                  📚 {themeName}{subThemeName && subThemeName !== themeName ? ` · ${subThemeName}` : ''}
                </p>
              )}
            </div>

            {/* ── 1. Histogramme : cette session uniquement ── */}
            <div>
              <div className="relative h-8 mb-1">
                <div className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                  style={isAr ? { right: `${clamp(score)}%`, transform: 'translateX(50%)' } : { left: `${clamp(score)}%`, transform: 'translateX(-50%)' }}>
                  <span className="text-[9px] font-black text-gray-900 whitespace-nowrap">{isAr ? 'جلستك' : 'Cette session'}</span>
                  <span className="text-[9px] font-black text-gray-900 whitespace-nowrap">{Math.round(score)}%</span>
                </div>
                <div className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                  style={isAr ? { right: `${toPct(THRESHOLD)}%`, transform: 'translateX(50%)' } : { left: `${toPct(THRESHOLD)}%`, transform: 'translateX(-50%)' }}>
                  <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">75%</span>
                  <span className="text-[8px] text-gray-400 whitespace-nowrap">{isAr ? 'عتبة' : 'seuil'}</span>
                </div>
              </div>
              <div className="relative flex items-end gap-[2px]" style={{ height: '100px' }}>
                {bars.map(({ min, h }) => (
                  <div key={min} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: barColor(min), minWidth: 0 }} />
                ))}
                <div className="absolute top-0 bottom-0 w-[2px] bg-gray-900 pointer-events-none z-10"
                  style={isAr ? { right: `${clamp(score)}%` } : { left: `${clamp(score)}%` }} />
                <div className="absolute top-0 bottom-0 w-px pointer-events-none z-10"
                  style={{ background: 'repeating-linear-gradient(to bottom,#9ca3af 0,#9ca3af 4px,transparent 4px,transparent 8px)', ...(isAr ? { right: `${toPct(THRESHOLD)}%` } : { left: `${toPct(THRESHOLD)}%` }) }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span>
              </div>
              <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground ${isAr ? 'flex-row-reverse' : ''}`}>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] inline-block rounded bg-gray-900" />
                  {isAr ? 'هذه الجلسة' : 'Cette session'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] inline-block" style={{ background: 'repeating-linear-gradient(to right,#9ca3af 0,#9ca3af 3px,transparent 3px,transparent 6px)' }} />
                  {isAr ? 'عتبة القبول 75%' : 'Seuil bon candidat 75%'}
                </span>
              </div>
              {/* Texte stats sous l'histogramme */}
              <div className={`flex items-center justify-between mt-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                <p className="text-xs text-muted-foreground">
                  {isAr ? 'المعدل على المستوى الوطني :' : 'Score moyen à l\'échelle nationale :'}{' '}
                  <span className="font-bold text-violet-700">{natStats.avg}%</span>
                  {natStats.estimated && <span className="text-[10px] text-muted-foreground ml-1">{isAr ? '(تقديري)' : '(estimé)'}</span>}
                </p>
                <p className="text-xs font-bold text-violet-700">
                  {isAr ? `أفضل من ${natStats.percentile}%` : `Meilleur que ${natStats.percentile}%`}
                </p>
              </div>
            </div>

            {/* ── 2. Classement global (vrai rang) ── */}
            {myRank && myRank.rank !== null && myRank.total > 0 && (() => {
              const { rank, total: rankTotal, globalScore: base } = myRank;
              const ordFr = (n: number) => n === 1 ? '1er' : `${n}e`;
              const ordinal = (n: number) => isAr ? `#${n}` : ordFr(n);
              const fakeNames = ['Ahmed B.', 'Fatima M.', 'Mohamed O.', 'Mariem S.', 'Ibrahima D.', 'Aissata K.'];
              const aboveShow = Math.min(2, rank - 1);
              const belowShow = Math.min(2, rankTotal - rank);
              const aboveOffsets = [14, 7].slice(0, aboveShow).reverse();
              const belowOffsets = [7, 14].slice(0, belowShow);
              const rows: { rank: number; isUser: boolean; score: number; name: string }[] = [
                ...aboveOffsets.map((off, i) => ({ rank: rank - aboveShow + i, isUser: false, score: Math.min(100, Math.round(base + off)), name: fakeNames[i] })),
                { rank, isUser: true, score: base, name: isAr ? 'أنت' : 'Vous' },
                ...belowOffsets.map((off, i) => ({ rank: rank + 1 + i, isUser: false, score: Math.max(5, Math.round(base - off)), name: fakeNames[aboveShow + 1 + i] ?? fakeNames[i] })),
              ];
              return (
                <>
                  <div className="h-px bg-border" />
                  <div>
                    <div className={`flex items-center justify-between mb-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                      <p className="text-xs font-semibold text-foreground">
                        {isAr ? '🏆 تصنيفك العام' : '🏆 Classement global'}
                      </p>
                      <span className="text-lg font-black" style={{ color: '#6366f1' }}>
                        {isAr ? `#${rank}` : ordFr(rank)}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {rows.map((row, i) => {
                        const sc = row.score;
                        if (row.isUser) return (
                          <div key="user" className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.4)' }}>
                            <span className="text-xs font-black text-indigo-600 w-7 flex-shrink-0 text-center">{ordinal(row.rank)}</span>
                            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0 w-14 truncate">{row.name}</span>
                            <div className="flex-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${sc}%` }} />
                            </div>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 w-9 text-right flex-shrink-0">{sc}%</span>
                          </div>
                        );
                        return (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary"
                            style={{ filter: 'blur(2.5px)', userSelect: 'none', pointerEvents: 'none' }}>
                            <span className="text-[11px] font-bold text-muted-foreground w-7 flex-shrink-0 text-center">{ordinal(row.rank)}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0 w-14 truncate">{row.name}</span>
                            <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${sc}%` }} />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground w-9 text-right flex-shrink-0">{sc}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}


            {/* ── 4. Progression vs session précédente ── */}
            {practiceThemeId && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">
                    {isAr ? 'مقارنة مع الجلسة السابقة' : 'Session précédente vs aujourd\'hui'}
                  </p>
                  {!prev ? (
                    <p className="text-xs text-muted-foreground">
                      🎯 {isAr ? 'أول جلسة على هذا الموضوع' : 'Première session sur ce thème'}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Ligne précédente */}
                      <div className="space-y-1">
                        <div className={`flex items-center justify-between text-xs ${isAr ? 'flex-row-reverse' : ''}`}>
                          <span className="text-muted-foreground">{isAr ? 'الجلسة السابقة' : 'Session précédente'}</span>
                          <span className="font-bold">{Math.round(prev.score)}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div className="h-2 rounded-full bg-muted-foreground/40 transition-all" style={{ width: `${Math.round(prev.score)}%` }} />
                        </div>
                      </div>
                      {/* Ligne aujourd'hui */}
                      <div className="space-y-1">
                        <div className={`flex items-center justify-between text-xs ${isAr ? 'flex-row-reverse' : ''}`}>
                          <span className="text-muted-foreground">{isAr ? 'اليوم' : "Aujourd'hui"}</span>
                          <span className="font-black" style={{ color: scoreColor }}>{Math.round(score)}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${Math.round(score)}%`, background: scoreColor }} />
                        </div>
                      </div>
                      {/* Badge tendance */}
                      <div className={`flex ${isAr ? 'justify-end' : 'justify-start'}`}>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          diff! > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : diff === 0 ? 'bg-secondary text-muted-foreground'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {diff! > 0 ? '▲' : diff === 0 ? '▶' : '▼'}
                          {diff! > 0 ? `+${diff} pts` : diff === 0 ? (isAr ? 'مستقر' : 'Stable') : `${diff} pts`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        );
      })()}

      {/* ── Actions ── */}
      <div className="grid grid-cols-2 gap-3">
        {fromPractice ? (
          <button
            onClick={startPracticeRetry}
            disabled={retryLoading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-secondary transition disabled:opacity-40">
            {retryLoading
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <RotateCcw className="w-4 h-4" />}
            {t('results.retry')}
          </button>
        ) : (
          <Link href={review.mode === 'REVIEW' ? '/review' : '/exam'}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-secondary transition">
            <RotateCcw className="w-4 h-4" /> {t('results.retry')}
          </Link>
        )}
        <button
          onClick={startSessionReview}
          disabled={reviewLoading || !wrongIds.length}
          className="flex items-center justify-center gap-2 py-3 rounded-xl gradient-warning text-white text-sm font-semibold hover:opacity-90 transition shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
          {reviewLoading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
          {t('review.title')}
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition border ${filter === f.key
              ? 'gradient-primary text-white border-transparent shadow-md shadow-violet-500/20'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Légende couleurs ── */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-secondary/40 rounded-xl px-4 py-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />{isAr ? 'إجابة صحيحة اخترتها' : 'Bonne réponse cochée'}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />{isAr ? 'صحيحة لكن فاتتك' : 'À cocher aussi'}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />{isAr ? 'اخترتها لكنها خاطئة' : 'Mauvais choix coché'}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-border inline-block" />{isAr ? 'غير مختارة' : 'Non cochée'}</span>
      </div>

      {/* ── Questions list ── */}
      <div className="space-y-2">
        {filtered.map((q: any) => (
          <div key={q.questionId}
            className={`bg-card border rounded-xl overflow-hidden transition-all ${q.isCorrect ? 'border-emerald-500/30' : 'border-red-500/30'}`}>

            <button
              onClick={() => setExpanded(expanded === q.questionId ? null : q.questionId)}
              className="w-full text-left p-4 flex items-start gap-3 hover:bg-secondary/40 transition"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${q.isCorrect ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                {q.isCorrect
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  : <XCircle className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2 text-left">{q.questionText}</p>
                {q.theme && <p className="text-xs text-muted-foreground mt-1">{sentenceCase(q.theme)}</p>}
              </div>
              {expanded === q.questionId
                ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
            </button>

            {expanded === q.questionId && (
              <div className="border-t border-border p-4 space-y-2 bg-secondary/20">
                {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                  const text = q[`choice${letter}`];
                  if (!text) return null;
                  const correctLetters = q.correctAnswer.split(',').map((s: string) => s.trim());
                  const userLetters = q.userAnswer.split(',').map((s: string) => s.trim());
                  const isInCorrect = correctLetters.includes(letter);
                  const isSelected = userLetters.includes(letter);
                  const isGoodPick = isInCorrect && isSelected;
                  const isMissed = isInCorrect && !isSelected;
                  const isWrongPick = !isInCorrect && isSelected;

                  return (
                    <div key={letter} className={`flex items-start gap-2.5 p-2.5 rounded-lg text-sm
                      ${isGoodPick ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' :
                        isMissed ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' :
                        isWrongPick ? 'bg-red-500/10 text-red-800 dark:text-red-300' :
                        'text-muted-foreground'}`}>
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${isGoodPick ? 'bg-emerald-500 text-white' :
                          isMissed ? 'bg-amber-400 text-white' :
                          isWrongPick ? 'bg-red-400 text-white' :
                          'bg-border text-muted-foreground'}`}>
                        {letter}
                      </span>
                      {text}
                      {isMissed && <span className="ml-auto text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex-shrink-0">manquée</span>}
                    </div>
                  );
                })}

                {q.explanation && (
                  <div className="mt-3 bg-card border border-border rounded-xl p-3 text-sm text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground text-xs mb-1">{t('review.correct')}</p>
                    {q.explanation.includes('\n') ? (
                      <ul className="space-y-1 mt-1">
                        {q.explanation.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                            <span>{line.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{q.explanation}</p>
                    )}
                  </div>
                )}

                {q.imageUrl && (
                  <img
                    src={resolveImageUrl(q.imageUrl)}
                    alt="Schéma"
                    className="w-full rounded-xl max-h-40 object-contain mt-2"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

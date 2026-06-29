'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { attemptsApi, themesApi } from '@/lib/api';
import { NEW_THEME_IDS, NEW_SUBTHEME_IDS } from '@/lib/new-content';
import { useAuthStore } from '@/lib/auth-store';
import { QuestionCard } from '@/components/QuestionCard';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Loader2, Play, Target, ArrowLeft } from 'lucide-react';
import { ThemeSearchInput } from '@/components/ThemeSearchInput';
import { sentenceCase } from '@/lib/utils';
import { BadgeSelect } from '@/components/BadgeSelect';

const PRACTICE_KEY = 'practice_state';

const PREP_COLORS: Record<number, { bg: string; gradient: string }> = {
  1: { bg: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' },
  2: { bg: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  3: { bg: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
};

function PracticePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { t, lang } = useLang();

  const prepMode = searchParams.get('mode') === 'prep';
  const prepDay = parseInt(searchParams.get('day') || '1');
  const prepColor = PREP_COLORS[prepDay] ?? PREP_COLORS[1];
  const [prepCount, setPrepCount] = useState(20);
  const [themes, setThemes] = useState<any[]>([]);
  const [config, setConfig] = useState({ themeId: '', subThemeId: '', count: 10 });
  const [session, setSession] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(false);
  const [answers, setAnswers] = useState<Array<{ correct: boolean; userAnswer: string; result: any } | null>>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    themesApi.all(lang).then((r) => {
      setThemes(r.data);
      setConfig((c) => ({ ...c, themeId: '', subThemeId: '' }));
    }).catch(() => {});
  }, [lang]);

  useEffect(() => {
    if (prepMode) {
      localStorage.removeItem(PRACTICE_KEY);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(PRACTICE_KEY) || 'null');
      if (saved?.session) {
        setSession(saved.session);
        setCurrentIndex(saved.currentIndex || 0);
        setViewIndex(saved.currentIndex || 0);
        setAnswers(saved.answers || Array(saved.session.questions.length).fill(null));
        setConfigured(true);
      }
    } catch {}
  }, [prepMode]);

  // Persist practice session to localStorage
  useEffect(() => {
    if (!session) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify({ session, currentIndex, answers }));
    }, 300);
    return () => {
      if (saveRef.current) clearTimeout(saveRef.current);
    };
  }, [session, currentIndex, answers]);

  const maxAvailable = (() => {
    if (config.subThemeId) {
      const theme = themes.find((t) => t.id === config.themeId);
      const sub = theme?.subThemes?.find((s: any) => s.id === config.subThemeId);
      return sub?._count?.questions ?? 50;
    }
    if (config.themeId) {
      const theme = themes.find((t) => t.id === config.themeId);
      return theme?.subThemes?.reduce((sum: number, s: any) => sum + (s._count?.questions ?? 0), 0) ?? 50;
    }
    return 50;
  })();

  async function startSession() {
    setLoading(true);
    setError('');
    try {
      const { data } = await attemptsApi.start({
        mode: 'PRACTICE',
        themeId: config.themeId || undefined,
        subThemeId: config.subThemeId || undefined,
        count: Math.min(config.count, maxAvailable),
        language: lang.toUpperCase(),
      });
      setSession(data);
      setCurrentIndex(0);
      setViewIndex(0);
      setAnswers(Array(data.questions.length).fill(null));
      setConfigured(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du démarrage');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(answer: string) {
    const q = session.questions[viewIndex];
    const { data } = await attemptsApi.answer(session.attemptId, { questionId: q.id, answer });
    setAnswers((prev) => {
      const next = [...prev];
      next[viewIndex] = { correct: data.isCorrect, userAnswer: answer, result: data };
      return next;
    });
    return data;
  }

  function handleNext() {
    if (answers[viewIndex] && viewIndex !== currentIndex) {
      // Reviewing old answer → back to sequential progress
      setViewIndex(currentIndex);
      return;
    }
    // Find next unanswered question
    const nextUnanswered = answers.findIndex((a, i) => i > viewIndex && a === null);
    // Check if all questions answered
    const allAnswered = answers.every((a, i) => i === viewIndex || a !== null);
    if (allAnswered || nextUnanswered === -1) {
      if (saveRef.current) clearTimeout(saveRef.current);
      localStorage.removeItem(PRACTICE_KEY);
      attemptsApi.finish(session.attemptId).catch(() => {});
      const params = new URLSearchParams({ from: 'practice' });
      if (config.themeId) params.set('themeId', config.themeId);
      if (config.subThemeId) params.set('subThemeId', config.subThemeId);
      params.set('count', String(Math.min(config.count, maxAvailable)));
      router.push(`/exam/${session.attemptId}/results?${params}`);
    } else {
      setCurrentIndex(nextUnanswered);
      setViewIndex(nextUnanswered);
    }
  }

  if (!configured) {
    // Mode préparation : afficher les thèmes du jour + bouton Lancer
    if (prepMode) {
      // Diviser au niveau SOUS-THÈME (pas thème entier) pour une coupe fine équilibrée :
      // un seul thème peut contenir plusieurs centaines de questions et fausser la répartition.
      const sorted = [...themes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const flat = sorted.flatMap((th: any) => {
        const subs = [...(th.subThemes ?? [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        return subs.map((st: any) => ({
          themeId: th.id, themeName: th.name, subThemeId: st.id, q: st._count?.questions ?? 0,
        }));
      });
      const cumQ = flat.reduce((acc: number[], item) => {
        acc.push((acc[acc.length - 1] ?? 0) + item.q); return acc;
      }, [] as number[]);
      const totalQAll = cumQ[cumQ.length - 1] ?? 0;
      let split1 = 1, minDiff1 = Infinity;
      for (let i = 0; i < flat.length - 2; i++) {
        const d = Math.abs(cumQ[i] - totalQAll / 3);
        if (d < minDiff1) { minDiff1 = d; split1 = i + 1; }
      }
      let split2 = split1 + 1, minDiff2 = Infinity;
      for (let i = split1; i < flat.length - 1; i++) {
        const d = Math.abs(cumQ[i] - (2 * totalQAll) / 3);
        if (d < minDiff2) { minDiff2 = d; split2 = i + 1; }
      }
      const splits = [0, split1, split2, flat.length];
      const dayItems = flat.slice(splits[prepDay - 1], splits[prepDay]);
      const daySubThemeIds = dayItems.map((it) => it.subThemeId);
      const totalQDay = dayItems.reduce((s, it) => s + it.q, 0);

      // Regrouper par thème pour l'affichage (un thème peut être partiellement couvert ce jour-là)
      const dayThemesMap = new Map<string, { id: string; name: string; qCount: number }>();
      for (const it of dayItems) {
        const existing = dayThemesMap.get(it.themeId);
        if (existing) existing.qCount += it.q;
        else dayThemesMap.set(it.themeId, { id: it.themeId, name: it.themeName, qCount: it.q });
      }
      const dayThemes = Array.from(dayThemesMap.values());

      async function startPrepSession() {
        setLoading(true);
        setError('');
        try {
          const { data } = await attemptsApi.start({
            mode: 'PRACTICE',
            subThemeIds: daySubThemeIds,
            count: prepCount,
            language: lang.toUpperCase(),
            excludeAnsweredToday: true,
          });
          setSession(data);
          setCurrentIndex(0);
          setViewIndex(0);
          setAnswers(Array(data.questions.length).fill(null));
          setConfigured(true);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Erreur lors du démarrage');
        } finally {
          setLoading(false);
        }
      }

      return (
        <div className="space-y-5 max-w-2xl mx-auto">
          {/* Header */}
          <div className="rounded-2xl p-6 text-white" style={{ background: prepColor.gradient }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-white/70 font-medium uppercase tracking-wide">{t('prep.prepBanner')}</div>
                <h1 className="text-xl font-bold">{t('prep.dayN')} {prepDay} — {dayThemes.length} {t('prep.themesDay')}</h1>
                <p className="text-white/70 text-sm mt-0.5">{totalQDay.toLocaleString()} {t('prep.questionsProgram')}</p>
              </div>
              <Link href="/preparation-concours" className="text-white/70 hover:text-white transition flex items-center gap-1 text-sm flex-shrink-0">
                <ArrowLeft size={16} /> {lang === 'ar' ? 'رجوع' : 'Retour'}
              </Link>
            </div>
          </div>

          {/* Liste des thèmes */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wide">{t('prep.themesDay')} — {t('prep.dayN')} {prepDay}</h2>
            {themes.length === 0 ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {dayThemes.map((th) => (
                  <div key={th.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/50">
                    <span className="text-sm font-medium">{sentenceCase(th.name)}</span>
                    <span className="text-xs text-muted-foreground font-semibold">{th.qCount} Q</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slider nombre de questions */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{t('prep.chooseCount')}</span>
              <span className="text-2xl font-bold text-primary">{prepCount}</span>
            </div>
            <input
              type="range" min={5} max={50} step={5} value={prepCount}
              onChange={e => setPrepCount(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-secondary"
            />
            <div className="flex gap-2">
              {[10, 20, 30, 50].map(n => (
                <button key={n} onClick={() => setPrepCount(n)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${prepCount === n ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:text-foreground'}`}
                  style={prepCount === n ? { background: prepColor.bg } : {}}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {/* Bouton lancer */}
          <button
            onClick={startPrepSession}
            disabled={loading || dayThemes.length === 0}
            className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
            style={{ background: prepColor.gradient }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
            {loading ? (lang === 'ar' ? 'جاري التحميل...' : 'Chargement...') : `${t('prep.launch')} — ${prepCount} ${t('prep.questionsProgram')}`}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Header banner */}
        <div className="rounded-2xl p-6 md:p-8 text-white"
          style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{t('practice.title')}</h1>
                <p className="text-white/70 text-sm mt-0.5">{t('practice.subtitle')}</p>
              </div>
            </div>
            <div className="w-72 hidden sm:block text-foreground">
              <ThemeSearchInput
                themes={themes}
                themeId={config.themeId}
                subThemeId={config.subThemeId}
                withSubThemes
                allLabel={t('practice.allThemes')}
                onSelect={(themeId, subThemeId) => setConfig({ ...config, themeId, subThemeId: subThemeId ?? '' })}
              />
            </div>
          </div>
        </div>

        {/* Config grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main config */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-6">
            <h2 className="font-bold text-lg">{t('practice.title')}</h2>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('practice.selectTheme')}</label>
              <BadgeSelect
                value={config.themeId}
                onChange={(v) => setConfig({ ...config, themeId: v, subThemeId: '' })}
                placeholder={t('practice.allThemes')}
                newBadgeLabel={lang === 'ar' ? 'جديد' : 'Nouveau'}
                options={[
                  { value: '', label: t('practice.allThemes') },
                  ...themes.map((th) => ({ value: th.id, label: sentenceCase(th.name), isNew: NEW_THEME_IDS.has(th.id) })),
                ]}
              />
            </div>

            {config.themeId && (() => {
              const selectedTheme = themes.find((th) => th.id === config.themeId);
              const subThemes = selectedTheme?.subThemes ?? [];
              if (!subThemes.length) return null;
              return (
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('upload.subthemes')}</label>
                  <BadgeSelect
                    value={config.subThemeId}
                    onChange={(v) => setConfig({ ...config, subThemeId: v })}
                    placeholder={t('practice.allThemes')}
                    newBadgeLabel={lang === 'ar' ? 'جديد' : 'Nouveau'}
                    options={[
                      { value: '', label: t('practice.allThemes') },
                      ...subThemes.map((s: any) => ({ value: s.id, label: sentenceCase(s.name), count: s._count.questions, isNew: NEW_SUBTHEME_IDS.has(s.id) })),
                    ]}
                  />
                </div>
              );
            })()}

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold">{t('practice.questions')}</label>
                <span className="text-2xl font-bold text-primary">{config.count}</span>
              </div>
              <input
                type="range" min={1} max={Math.min(50, maxAvailable)} value={Math.min(config.count, maxAvailable)}
                onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-secondary"
              />
              <div className="flex gap-2 flex-wrap mt-4">
                {[5, 10, 20, 30, 50].filter((n) => n <= maxAvailable).map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig({ ...config, count: n })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${config.count === n
                      ? 'gradient-primary text-white border-transparent'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              onClick={startSession} disabled={loading}
              className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-violet-500/20"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}</> : <><Play className="w-4 h-4 fill-white" />{t('practice.start')}</>}
            </button>
          </div>

          {/* Side info */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">{t('practice.howTitle')}</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                {[
                  t('practice.how1'),
                  t('practice.how2'),
                  t('practice.how3'),
                  t('practice.how4'),
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-secondary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  const currentQ = session.questions[viewIndex];
  const answered = answers.filter(Boolean).length;
  const correctCount = answers.filter((a) => a?.correct).length;
  const isReviewing = answers[viewIndex] !== null && answers[viewIndex] !== undefined && viewIndex !== currentIndex;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" style={{ gridTemplateRows: prepMode ? 'auto 1fr' : undefined }}>
      {prepMode && (
        <div className="xl:col-span-3 rounded-2xl px-4 py-3 text-white flex items-center justify-between gap-4"
          style={{ background: prepColor.gradient }}>
          <div className="flex items-center gap-3 min-w-0">
            <Target size={16} className="text-white/70 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-white/70 font-medium">{t('prep.prepBanner')} {prepDay} · {answered}/{session.questions.length}</div>
              <div className="text-sm font-bold truncate">{currentQ.theme}</div>
              {currentQ.subTheme && currentQ.subTheme !== currentQ.theme && (
                <div className="text-xs text-white/70 truncate">{currentQ.subTheme}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main question area ── */}
      <div className="xl:col-span-2">
        <div className="flex justify-end gap-2 mb-3 xl:hidden">
          {prepMode ? (
            <button
              onClick={() => { if (saveRef.current) clearTimeout(saveRef.current); localStorage.removeItem(PRACTICE_KEY); attemptsApi.finish(session.attemptId).catch(() => {}); router.push('/preparation-concours'); }}
              className="flex items-center gap-1.5 text-xs font-bold text-white rounded-lg px-3 py-1.5 hover:opacity-90 transition"
              style={{ background: prepColor.gradient }}
            >
              <ArrowLeft size={12} /> Terminer
            </button>
          ) : (
            <button
              onClick={() => { if (saveRef.current) clearTimeout(saveRef.current); localStorage.removeItem(PRACTICE_KEY); setSession(null); setConfigured(false); setAnswers([]); setCurrentIndex(0); }}
              className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:text-red-500 hover:border-red-300 transition"
            >
              {t('practice.stopSession')}
            </button>
          )}
        </div>
        {isReviewing && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3 text-sm">
            <span className="text-amber-700 font-medium">👁 Consultation — Q{viewIndex + 1}</span>
            <button onClick={() => setViewIndex(currentIndex)}
              className="text-xs font-semibold text-amber-600 hover:text-amber-800 underline underline-offset-2">
              Reprendre →
            </button>
          </div>
        )}
        <QuestionCard
          key={currentQ.id}
          question={currentQ}
          questionNumber={viewIndex + 1}
          totalQuestions={session.questions.length}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLast={!isReviewing && currentIndex + 1 === session.questions.length}
          savedAnswer={isReviewing && answers[viewIndex] ? { userAnswer: answers[viewIndex]!.userAnswer, result: answers[viewIndex]!.result } : undefined}
        />
      </div>

      {/* ── Right sidebar ── */}
      <div className="space-y-4">
        {/* Progress overview */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">{t('practice.progress')}</h3>
          <div className="space-y-3 mb-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Questions</span>
                <span>{answered}/{session.questions.length}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full">
                <div className="h-1.5 gradient-primary rounded-full transition-all"
                  style={{ width: `${(answered / session.questions.length) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('practice.correct')}</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-red-500">{answered - correctCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('practice.errors')}</p>
            </div>
          </div>
        </div>

        {/* Abandon */}
        {prepMode ? (
          <button
            onClick={() => { if (saveRef.current) clearTimeout(saveRef.current); localStorage.removeItem(PRACTICE_KEY); attemptsApi.finish(session.attemptId).catch(() => {}); router.push('/preparation-concours'); }}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition hover:opacity-90"
            style={{ background: prepColor.gradient }}
          >
            <ArrowLeft size={14} /> Terminer
          </button>
        ) : (
          <button
            onClick={() => { if (saveRef.current) clearTimeout(saveRef.current); localStorage.removeItem(PRACTICE_KEY); setSession(null); setConfigured(false); setAnswers([]); setCurrentIndex(0); }}
            className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            {t('practice.newSession')}
          </button>
        )}

        {/* Question dots grid */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">{t('practice.navigation')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {session.questions.map((_: any, i: number) => {
              const ans = answers[i];
              const isView = i === viewIndex;
              return (
                <button
                  key={i}
                  onClick={() => setViewIndex(i)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                    ${isView
                      ? 'gradient-primary text-white shadow-md ring-2 ring-violet-400 ring-offset-1'
                      : ans === null
                      ? 'bg-secondary text-muted-foreground hover:bg-primary/10 cursor-pointer'
                      : ans.correct
                      ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 cursor-pointer'
                      : 'bg-red-500/15 text-red-500 hover:bg-red-500/25 cursor-pointer'
                    }`}
                >
                  {ans === null ? i + 1 : ans.correct ? '✓' : '✗'}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PracticePageInner />
    </Suspense>
  );
}

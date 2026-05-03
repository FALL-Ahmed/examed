'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { attemptsApi, themesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { QuestionCard } from '@/components/QuestionCard';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Loader2, Play, ChevronDown } from 'lucide-react';
import { sentenceCase } from '@/lib/utils';

const PRACTICE_KEY = 'practice_state';

export default function PracticePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, lang } = useLang();
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
    // Restore saved practice session
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
  }, []);

  // Persist practice session to localStorage
  useEffect(() => {
    if (!session) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify({ session, currentIndex, answers }));
    }, 300);
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
    return (
      <div className="space-y-8">
        {/* Header banner */}
        <div className="rounded-2xl p-6 md:p-8 text-white"
          style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{t('practice.title')}</h1>
              <p className="text-white/70 text-sm mt-0.5">{t('practice.subtitle')}</p>
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
              <div className="relative">
                <select
                  value={config.themeId}
                  onChange={(e) => setConfig({ ...config, themeId: e.target.value, subThemeId: '' })}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm cursor-pointer"
                >
                  <option value="">{t('practice.allThemes')}</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>{sentenceCase(t.name)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {config.themeId && (() => {
              const selectedTheme = themes.find((t) => t.id === config.themeId);
              const subThemes = selectedTheme?.subThemes ?? [];
              if (!subThemes.length) return null;
              return (
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('upload.subthemes')}</label>
                  <div className="relative">
                    <select
                      value={config.subThemeId}
                      onChange={(e) => setConfig({ ...config, subThemeId: e.target.value })}
                      className="w-full appearance-none px-4 py-3 pr-10 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm cursor-pointer"
                    >
                      <option value="">{t('practice.allThemes')}</option>
                      {subThemes.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {sentenceCase(s.name)} ({s._count.questions} q.)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      {/* ── Main question area ── */}
      <div className="xl:col-span-2">
        <div className="flex justify-end mb-3 xl:hidden">
          <button
            onClick={() => { localStorage.removeItem(PRACTICE_KEY); setSession(null); setConfigured(false); setAnswers([]); setCurrentIndex(0); }}
            className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:text-red-500 hover:border-red-300 transition"
          >
            {t('practice.stopSession')}
          </button>
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
        <button
          onClick={() => { localStorage.removeItem(PRACTICE_KEY); setSession(null); setConfigured(false); setAnswers([]); setCurrentIndex(0); }}
          className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        >
          {t('practice.newSession')}
        </button>

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

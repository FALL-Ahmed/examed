'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { attemptsApi, themesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { QuestionCard } from '@/components/QuestionCard';
import { BookOpen, Loader2, Play, ChevronDown, Crown, CheckCircle, XCircle } from 'lucide-react';
import { sentenceCase } from '@/lib/utils';

export default function PracticePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [themes, setThemes] = useState<any[]>([]);
  const [config, setConfig] = useState({ themeId: '', count: 10 });
  const [session, setSession] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(false);
  const [answers, setAnswers] = useState<Array<{ correct: boolean } | null>>([]);

  useEffect(() => {
    themesApi.all().then((r) => setThemes(r.data)).catch(() => {});
  }, []);

  async function startSession() {
    setLoading(true);
    setError('');
    try {
      const { data } = await attemptsApi.start({
        mode: 'PRACTICE',
        themeId: config.themeId || undefined,
        count: config.count,
      });
      setSession(data);
      setCurrentIndex(0);
      setAnswers(Array(data.questions.length).fill(null));
      setConfigured(true);
    } catch (err: any) {
      const code = err.response?.data?.code;
      setError(code === 'QUOTA_EXCEEDED'
        ? 'Limite journalière atteinte (3 questions). Activez Premium pour un accès illimité.'
        : err.response?.data?.message || 'Erreur lors du démarrage');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(answer: string) {
    const q = session.questions[currentIndex];
    const { data } = await attemptsApi.answer(session.attemptId, { questionId: q.id, answer });
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = { correct: data.isCorrect };
      return next;
    });
    return data;
  }

  function handleNext() {
    if (currentIndex + 1 >= session.questions.length) {
      attemptsApi.finish(session.attemptId).catch(() => {});
      router.push(`/exam/${session.attemptId}/results`);
    } else {
      setCurrentIndex((i) => i + 1);
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
              <h1 className="text-xl md:text-2xl font-bold">Mode Pratique</h1>
              <p className="text-white/70 text-sm mt-0.5">Réponse immédiate après chaque question</p>
            </div>
          </div>
        </div>

        {/* Config grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main config */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-6">
            <h2 className="font-bold text-lg">Configurer la session</h2>

            <div>
              <label className="block text-sm font-semibold mb-2">Thématique</label>
              <div className="relative">
                <select
                  value={config.themeId}
                  onChange={(e) => setConfig({ ...config, themeId: e.target.value })}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm cursor-pointer"
                >
                  <option value="">Toutes les thématiques</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>{sentenceCase(t.name)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold">Nombre de questions</label>
                <span className="text-2xl font-bold text-primary">{config.count}</span>
              </div>
              <input
                type="range" min={1} max={50} value={config.count}
                onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-secondary"
              />
              <div className="flex gap-2 flex-wrap mt-4">
                {[5, 10, 20, 30, 50].map((n) => (
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
                {error}{' '}
                {error.includes('Premium') && (
                  <Link href="/payment" className="underline font-semibold">Activer →</Link>
                )}
              </div>
            )}

            <button
              onClick={startSession} disabled={loading}
              className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-violet-500/20"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Démarrage...</> : <><Play className="w-4 h-4 fill-white" />Commencer</>}
            </button>
          </div>

          {/* Side info */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">Comment ça marche ?</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                {[
                  "Chaque question s'affiche une par une",
                  'La correction est immédiate après votre réponse',
                  'Une explication vous aide à comprendre',
                  'Progressez thème par thème',
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

            {user?.role !== 'PREMIUM' && (
              <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 flex items-start gap-3">
                <Crown className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Plan gratuit : <strong className="text-foreground">3 questions/jour</strong>.{' '}
                  <Link href="/payment" className="text-amber-600 dark:text-amber-400 font-semibold">
                    Passer Premium
                  </Link>{' '}
                  pour un accès illimité.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = session.questions[currentIndex];
  const answered = answers.filter(Boolean).length;
  const correctCount = answers.filter((a) => a?.correct).length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      {/* ── Main question area ── */}
      <div className="xl:col-span-2">
        <QuestionCard
          question={currentQ}
          questionNumber={currentIndex + 1}
          totalQuestions={session.questions.length}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLast={currentIndex + 1 === session.questions.length}
        />
      </div>

      {/* ── Right sidebar ── */}
      <div className="space-y-4">
        {/* Progress overview */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Progression</h3>
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
              <p className="text-xs text-muted-foreground mt-0.5">Correctes</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-red-500">{answered - correctCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Erreurs</p>
            </div>
          </div>
        </div>

        {/* Question dots grid */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">Navigation</h3>
          <div className="flex flex-wrap gap-1.5">
            {session.questions.map((_: any, i: number) => {
              const ans = answers[i];
              return (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    i === currentIndex
                      ? 'gradient-primary text-white shadow-md'
                      : ans === null
                      ? 'bg-secondary text-muted-foreground'
                      : ans.correct
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-red-500/15 text-red-500'
                  }`}
                >
                  {ans === null ? i + 1 : ans.correct ? '✓' : '✗'}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

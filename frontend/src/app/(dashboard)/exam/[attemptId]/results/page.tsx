'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { attemptsApi } from '@/lib/api';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, RotateCcw, RefreshCw, Trophy, Clock, Target } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';
import { sentenceCase } from '@/lib/utils';

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [review, setReview] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all');

  useEffect(() => {
    attemptsApi.review(attemptId).then((r) => setReview(r.data)).finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!review) return <p className="text-center text-muted-foreground">Résultats non trouvés</p>;

  const score = review.score;
  const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 70 ? 'Excellent !' : score >= 50 ? 'Bien joué !' : 'Continuez les efforts !';

  const correct = review.questions.filter((q: any) => q.isCorrect).length;
  const total = review.questions.length;
  const mins = Math.floor(review.timeTaken / 60);
  const secs = review.timeTaken % 60;

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
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 border-4"
            style={{ borderColor: scoreColor, background: `${scoreColor}12` }}>
            <span className="text-3xl font-extrabold" style={{ color: scoreColor }}>{score}%</span>
          </div>
          <h2 className="text-xl font-bold">{scoreLabel}</h2>
          <p className="text-muted-foreground text-sm mt-1">{correct} {t('results.correct').toLowerCase()} / {total}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Target, label: t('results.score'), value: `${score}%`, color: scoreColor },
            { icon: CheckCircle, label: t('results.correct'), value: `${correct}/${total}`, color: '#10b981' },
            { icon: Clock, label: t('exam.timeLeft'), value: `${mins}m ${secs}s`, color: '#6366f1' },
          ].map((s) => (
            <div key={s.label} className="bg-secondary rounded-xl p-3 text-center">
              <s.icon className="w-4 h-4 mx-auto mb-2" style={{ color: s.color }} />
              <p className="font-bold text-sm">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/exam"
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-secondary transition">
          <RotateCcw className="w-4 h-4" /> {t('results.retry')}
        </Link>
        <Link href="/review"
          className="flex items-center justify-center gap-2 py-3 rounded-xl gradient-warning text-white text-sm font-semibold hover:opacity-90 transition shadow-md shadow-amber-500/20">
          <RefreshCw className="w-4 h-4" /> {t('review.title')}
        </Link>
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
                  const isCorrect = correctLetters.includes(letter);
                  const isWrongPick = userLetters.includes(letter) && !isCorrect;

                  return (
                    <div key={letter} className={`flex items-start gap-2.5 p-2.5 rounded-lg text-sm
                      ${isCorrect ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' :
                        isWrongPick ? 'bg-red-500/10 text-red-800 dark:text-red-300' :
                        'text-muted-foreground'}`}>
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${isCorrect ? 'bg-emerald-500 text-white' :
                          isWrongPick ? 'bg-red-400 text-white' :
                          'bg-border text-muted-foreground'}`}>
                        {letter}
                      </span>
                      {text}
                    </div>
                  );
                })}

                {q.explanation && (
                  <div className="mt-3 bg-card border border-border rounded-xl p-3 text-sm text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground text-xs mb-1">{t('review.correct')}</p>
                    {q.explanation}
                  </div>
                )}

                {q.imageUrl && (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${q.imageUrl}`}
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

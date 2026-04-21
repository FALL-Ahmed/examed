'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { attemptsApi } from '@/lib/api';
import { ExamTimer } from '@/components/ExamTimer';
import { resolveImageUrl } from '@/lib/utils';
import { CheckCircle, Bookmark, ChevronLeft, ChevronRight, Send, Pause, Grid } from 'lucide-react';

type AnswerState = Record<string, string>;
type MarkedState = Record<string, boolean>;

const STORAGE_KEY = 'exam_state';

export default function ExamPage() {
  const router = useRouter();
  const { attemptId } = useParams<{ attemptId: string }>();
  const searchParams = useSearchParams();

  const [session, setSession] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [marked, setMarked] = useState<MarkedState>({});
  const [submitting, setSubmitting] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Load session: from localStorage first, then from URL param
  useEffect(() => {
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
    })();

    if (saved && saved.attemptId === attemptId) {
      setSession(saved.session);
      setAnswers(saved.answers || {});
      setMarked(saved.marked || {});
      setCurrentIndex(saved.currentIndex || 0);
      setRemainingSeconds(saved.remainingSeconds ?? null);
      return;
    }

    const raw = searchParams.get('data');
    if (raw) {
      try {
        const data = JSON.parse(decodeURIComponent(raw));
        setSession(data);
        setRemainingSeconds(data.timeLimit ?? null);
      } catch {}
    }
  }, []);

  // Persist to localStorage whenever state changes
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!session) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        attemptId,
        session,
        answers,
        marked,
        currentIndex,
        remainingSeconds,
      }));
    }, 300);
  }, [session, answers, marked, currentIndex, remainingSeconds]);

  function handleTick(remaining: number) {
    setRemainingSeconds(remaining);
  }

  function handlePause() {
    const mode = session?.mode;
    if (mode === 'REVIEW') router.push('/review');
    else router.push('/exam');
  }

  const finishExam = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    localStorage.removeItem(STORAGE_KEY);

    const questions = session?.questions || [];
    for (const question of questions) {
      if (answers[question.id]) {
        try {
          await attemptsApi.answer(attemptId, {
            questionId: question.id,
            answer: answers[question.id],
          });
        } catch {}
      }
    }

    try { await attemptsApi.finish(attemptId); } catch {}
    router.push(`/exam/${attemptId}/results`);
  }, [submitting, session, answers, attemptId]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const q = session.questions[currentIndex];
  const allChoiceLabels: Record<string, string> = {
    A: q.choiceA, B: q.choiceB, C: q.choiceC, D: q.choiceD, E: q.choiceE ?? '',
  };
  const choices = ['A', 'B', 'C', 'D', 'E'].filter((l) => allChoiceLabels[l]?.trim());
  const choiceLabels = allChoiceLabels;

  const BADGE: Record<string, string> = {
    A: 'bg-violet-100 text-violet-700 border-violet-200',
    B: 'bg-sky-100 text-sky-700 border-sky-200',
    C: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    D: 'bg-amber-100 text-amber-700 border-amber-200',
    E: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const BADGE_SELECTED: Record<string, string> = {
    A: 'bg-violet-600 text-white border-violet-600',
    B: 'bg-sky-600 text-white border-sky-600',
    C: 'bg-emerald-600 text-white border-emerald-600',
    D: 'bg-amber-500 text-white border-amber-500',
    E: 'bg-rose-600 text-white border-rose-600',
  };

  function selectAnswer(letter: string) {
    setAnswers((prev) => {
      const current = (prev[q.id] || '').split(',').filter(Boolean);
      const next = current.includes(letter)
        ? current.filter((l) => l !== letter)
        : [...current, letter].sort();
      return { ...prev, [q.id]: next.join(',') };
    });
  }

  function toggleMark() {
    setMarked((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
  }

  const answered = Object.values(answers).filter(Boolean).length;
  const total = session.questions.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {session.timeLimit && remainingSeconds !== null && (
        <ExamTimer
          durationSeconds={session.timeLimit}
          initialRemaining={remainingSeconds}
          onExpire={finishExam}
          onTick={handleTick}
        />
      )}

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="flex items-center gap-2 text-sm text-primary font-medium px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition"
          >
            <Grid className="w-4 h-4" />
            {answered}/{total} répondues
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
            <button
              onClick={finishExam}
              disabled={submitting}
              className="flex items-center gap-1.5 gradient-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Envoi…' : 'Terminer'}
            </button>
          </div>
        </div>

        {/* Grid navigation */}
        {showGrid && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-sm font-semibold mb-3 text-gray-700">Navigation rapide</p>
            <div className="flex flex-wrap gap-2">
              {session.questions.map((_: any, i: number) => {
                const qid = session.questions[i].id;
                return (
                  <button
                    key={i}
                    onClick={() => { setCurrentIndex(i); setShowGrid(false); }}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition
                      ${i === currentIndex ? 'bg-violet-600 text-white' :
                        answers[qid] ? 'bg-emerald-100 text-emerald-700' :
                        marked[qid] ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" /> Répondue</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Marquée</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Non répondue</span>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <p className="text-xs text-gray-400 font-medium">Question {currentIndex + 1} / {total}</p>
            <button onClick={toggleMark} className={`flex-shrink-0 transition ${marked[q.id] ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}>
              <Bookmark className="w-5 h-5" fill={marked[q.id] ? 'currentColor' : 'none'} />
            </button>
          </div>
          {q.subTheme && (
            <p className="text-xs text-violet-500 font-medium mb-2">{q.subTheme}</p>
          )}
          <p className="font-medium text-gray-800 leading-relaxed">{q.text}</p>
          {q.imageUrl && (
            <img
              src={resolveImageUrl(q.imageUrl)}
              alt="Schéma"
              className="w-full rounded-xl object-contain max-h-48 mt-4 border border-gray-100"
            />
          )}
        </div>

        {/* Multiple answers indicator */}
        {q.isMultiple && (
          <span className="inline-flex items-center text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium border border-violet-200">
            Plusieurs réponses possibles
          </span>
        )}

        {/* Choices */}
        <div className="space-y-2.5">
          {choices.map((letter) => {
            const selectedLetters = (answers[q.id] || '').split(',').filter(Boolean);
            const isSelected = selectedLetters.includes(letter);
            return (
              <button
                key={letter}
                onClick={() => selectAnswer(letter)}
                className={`w-full text-left rounded-xl border-2 transition-all duration-150
                  ${isSelected
                    ? 'border-violet-300 bg-violet-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                    ${isSelected ? (BADGE_SELECTED[letter] || 'bg-violet-600 text-white border-violet-600') : BADGE[letter]}`}>
                    {isSelected ? <CheckCircle className="w-4 h-4" /> : letter}
                  </span>
                  <span className="text-sm text-gray-700">{choiceLabels[letter]}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 font-medium text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-xs text-gray-400">{currentIndex + 1} / {total}</span>
          <button
            onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
            disabled={currentIndex === total - 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 font-medium text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { attemptsApi } from '@/lib/api';
import { ExamTimer } from '@/components/ExamTimer';
import { CheckCircle, Circle, Bookmark, ChevronLeft, ChevronRight, Send } from 'lucide-react';

type AnswerState = Record<string, string>;
type MarkedState = Record<string, boolean>;

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

  useEffect(() => {
    const raw = searchParams.get('data');
    if (raw) {
      try { setSession(JSON.parse(decodeURIComponent(raw))); } catch {}
    }
  }, []);

  const finishExam = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    // Soumettre toutes les réponses non encore soumises
    const q = session?.questions || [];
    for (const question of q) {
      if (answers[question.id]) {
        try {
          await attemptsApi.answer(attemptId, {
            questionId: question.id,
            answer: answers[question.id],
          });
        } catch {}
      }
    }

    try {
      await attemptsApi.finish(attemptId);
    } catch {}

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
  const choices = ['A', 'B', 'C', 'D'];
  const choiceLabels: Record<string, string> = {
    A: q.choiceA, B: q.choiceB, C: q.choiceC, D: q.choiceD,
  };

  function selectAnswer(letter: string) {
    setAnswers((prev) => ({ ...prev, [q.id]: letter }));
  }

  function toggleMark() {
    setMarked((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
  }

  const answered = Object.keys(answers).length;
  const total = session.questions.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {session.timeLimit && (
        <ExamTimer durationSeconds={session.timeLimit} onExpire={finishExam} />
      )}

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="text-sm text-primary font-medium"
          >
            {answered}/{total} répondues
          </button>
          <button
            onClick={finishExam}
            disabled={submitting}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Envoi...' : 'Terminer'}
          </button>
        </div>

        {/* Grille navigation */}
        {showGrid && (
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-sm font-medium mb-3">Navigation</p>
            <div className="flex flex-wrap gap-2">
              {session.questions.map((_: any, i: number) => {
                const qid = session.questions[i].id;
                return (
                  <button
                    key={i}
                    onClick={() => { setCurrentIndex(i); setShowGrid(false); }}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition
                      ${i === currentIndex ? 'bg-primary text-white' :
                        answers[qid] ? 'bg-green-100 text-green-700' :
                        marked[qid] ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-muted-foreground'}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Question {currentIndex + 1} / {total}</p>
              <p className="font-medium leading-relaxed">{q.text}</p>
            </div>
            <button onClick={toggleMark} className={marked[q.id] ? 'text-amber-500' : 'text-muted-foreground'}>
              <Bookmark className="w-5 h-5" fill={marked[q.id] ? 'currentColor' : 'none'} />
            </button>
          </div>

          {q.imageUrl && (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}${q.imageUrl}`}
              alt="Schéma"
              className="w-full rounded-xl object-contain max-h-48"
            />
          )}
        </div>

        {/* Choix */}
        <div className="space-y-3">
          {choices.map((letter) => (
            <button
              key={letter}
              onClick={() => selectAnswer(letter)}
              className={`choice-btn border-2 transition-all duration-150 text-left
                ${answers[q.id] === letter ? 'border-primary bg-blue-50 text-primary' : 'border-border'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0
                  ${answers[q.id] === letter ? 'border-primary bg-primary text-white' : 'border-border'}`}>
                  {letter}
                </span>
                <span>{choiceLabels[letter]}</span>
                {answers[q.id] === letter && <CheckCircle className="ml-auto w-4 h-4 text-primary" />}
              </div>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border font-medium text-sm disabled:opacity-40 hover:bg-secondary transition"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <button
            onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
            disabled={currentIndex === total - 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border font-medium text-sm disabled:opacity-40 hover:bg-secondary transition"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

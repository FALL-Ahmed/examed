'use client';
import { useState } from 'react';
import { CheckCircle, XCircle, ChevronRight, Lightbulb } from 'lucide-react';
import { sentenceCase } from '@/lib/utils';

interface Question {
  id: string;
  text: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  choiceE?: string;
  imageUrl?: string;
  theme?: string;
  subTheme?: string;
}

interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  imageUrl?: string;
}

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => Promise<AnswerResult>;
  onNext: () => void;
  isLast?: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

const LETTER_COLORS: Record<string, { base: string; selected: string; correct: string; wrong: string }> = {
  A: { base: 'border-border bg-card', selected: 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300', correct: 'border-emerald-500 bg-emerald-500/10', wrong: 'border-red-400 bg-red-400/10' },
  B: { base: 'border-border bg-card', selected: 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300', correct: 'border-emerald-500 bg-emerald-500/10', wrong: 'border-red-400 bg-red-400/10' },
  C: { base: 'border-border bg-card', selected: 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300', correct: 'border-emerald-500 bg-emerald-500/10', wrong: 'border-red-400 bg-red-400/10' },
  D: { base: 'border-border bg-card', selected: 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300', correct: 'border-emerald-500 bg-emerald-500/10', wrong: 'border-red-400 bg-red-400/10' },
  E: { base: 'border-border bg-card', selected: 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300', correct: 'border-emerald-500 bg-emerald-500/10', wrong: 'border-red-400 bg-red-400/10' },
};

export function QuestionCard({ question, questionNumber, totalQuestions, onAnswer, onNext, isLast }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [loading, setLoading] = useState(false);

  const choices = LETTERS.filter((l) => {
    const text = question[`choice${l}` as keyof Question] as string;
    return text && text.trim().length > 0;
  });

  function toggleLetter(letter: string) {
    if (result || loading) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0 || result || loading) return;
    setLoading(true);
    const answer = [...selected].sort().join(',');
    try {
      const res = await onAnswer(answer);
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    setSelected(new Set());
    setResult(null);
    onNext();
  }

  const correctLetters = result ? result.correctAnswer.split(',').map((s) => s.trim()) : [];
  const pct = (questionNumber / totalQuestions) * 100;

  function getChoiceClass(letter: string): string {
    const c = LETTER_COLORS[letter];
    if (!result) {
      return selected.has(letter)
        ? `border-2 ${c.selected} cursor-pointer`
        : `border-2 ${c.base} hover:border-primary/40 hover:bg-primary/5 cursor-pointer`;
    }
    const isCorrect = correctLetters.includes(letter);
    const isWrong = [...selected].map((s) => s.trim()).includes(letter) && !isCorrect;
    if (isCorrect) return `border-2 ${c.correct}`;
    if (isWrong) return `border-2 ${c.wrong}`;
    return `border-2 ${c.base} opacity-40`;
  }

  function getBadgeClass(letter: string): string {
    if (!result) {
      return selected.has(letter)
        ? 'bg-violet-500 text-white border-violet-500'
        : 'bg-secondary text-muted-foreground border-border';
    }
    const isCorrect = correctLetters.includes(letter);
    const isWrong = [...selected].map((s) => s.trim()).includes(letter) && !isCorrect;
    if (isCorrect) return 'bg-emerald-500 text-white border-emerald-500';
    if (isWrong) return 'bg-red-500 text-white border-red-500';
    return 'bg-secondary text-muted-foreground border-border';
  }

  return (
    <div className="space-y-5 animate-slide-in">

      {/* ── Progress bar ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground truncate pr-4">{sentenceCase(question.theme)}</span>
          <span className="flex-shrink-0 tabular-nums text-muted-foreground">
            {questionNumber} <span className="text-border">/</span> {totalQuestions}
          </span>
        </div>
        <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 gradient-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Question card ── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            Q
          </div>
          {choices.length > 4 && (
            <span className="ml-auto text-xs bg-violet-500/10 text-violet-600 dark:text-violet-300 px-2.5 py-1 rounded-full font-medium border border-violet-500/20 flex-shrink-0">
              Plusieurs réponses
            </span>
          )}
        </div>
        {question.imageUrl && (
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}${question.imageUrl}`}
            alt="Schéma"
            className="w-full rounded-xl object-contain max-h-48 mb-4"
          />
        )}
        <p className="text-base font-medium leading-relaxed">{question.text}</p>
      </div>

      {/* ── Choices ── */}
      <div className="space-y-2.5">
        {choices.map((letter) => {
          const text = question[`choice${letter}` as keyof Question] as string;
          const isCorrect = correctLetters.includes(letter);
          const isWrongSel = result && [...selected].map((s) => s.trim()).includes(letter) && !isCorrect;

          return (
            <button
              key={letter}
              onClick={() => toggleLetter(letter)}
              disabled={!!result || loading}
              className={`w-full text-left rounded-xl transition-all duration-200 text-sm disabled:cursor-default ${getChoiceClass(letter)}`}
            >
              <div className="flex items-start gap-3 p-4">
                <span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${getBadgeClass(letter)}`}>
                  {result && isCorrect ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : result && isWrongSel ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    letter
                  )}
                </span>
                <span className="flex-1 leading-relaxed pt-0.5">{text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Submit button ── */}
      {!result && (
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0 || loading}
          className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
        >
          {loading ? 'Vérification...' : 'Valider ma réponse'}
        </button>
      )}

      {/* ── Result feedback ── */}
      {result && (
        <div className={`rounded-2xl border-2 overflow-hidden animate-slide-in
          ${result.isCorrect ? 'border-emerald-500/30' : 'border-red-500/30'}`}>

          {/* Result header */}
          <div className={`flex items-center gap-3 px-5 py-4
            ${result.isCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            {result.isCorrect ? (
              <>
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Excellente réponse !</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  Réponse correcte : {result.correctAnswer.split(',').join(', ')}
                </span>
              </>
            )}
          </div>

          {/* Explanation */}
          {result.explanation && (
            <div className="px-5 py-4 bg-card border-t border-border">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{result.explanation}</p>
              </div>
            </div>
          )}

          {result.imageUrl && (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}${result.imageUrl}`}
              alt="Schéma explicatif"
              className="w-full object-contain max-h-40 border-t border-border"
            />
          )}

          {/* Next button */}
          <div className="px-5 py-4 bg-card border-t border-border">
            <button
              onClick={handleNext}
              className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md shadow-violet-500/20"
            >
              {isLast ? 'Voir les résultats' : 'Question suivante'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

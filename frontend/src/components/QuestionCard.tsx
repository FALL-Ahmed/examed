'use client';
import { useState } from 'react';
import { CheckCircle2, XCircle, ChevronRight, Lightbulb } from 'lucide-react';
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

const ROW_SELECTED: Record<string, string> = {
  A: 'border-violet-300 bg-violet-50',
  B: 'border-sky-300 bg-sky-50',
  C: 'border-emerald-300 bg-emerald-50',
  D: 'border-amber-300 bg-amber-50',
  E: 'border-rose-300 bg-rose-50',
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
    try {
      const res = await onAnswer([...selected].sort().join(','));
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

  function rowClass(letter: string) {
    if (!result) {
      return selected.has(letter)
        ? `border-2 ${ROW_SELECTED[letter]} cursor-pointer`
        : 'border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 cursor-pointer';
    }
    const isCorrect = correctLetters.includes(letter);
    const isWrong = [...selected].includes(letter) && !isCorrect;
    if (isCorrect) return 'border-2 border-emerald-400 bg-emerald-50';
    if (isWrong)   return 'border-2 border-red-400 bg-red-50';
    return 'border-2 border-gray-100 bg-white opacity-50';
  }

  function badgeClass(letter: string) {
    if (!result) {
      return selected.has(letter) ? BADGE_SELECTED[letter] : BADGE[letter];
    }
    const isCorrect = correctLetters.includes(letter);
    const isWrong = [...selected].includes(letter) && !isCorrect;
    if (isCorrect) return 'bg-emerald-500 text-white border-emerald-500';
    if (isWrong)   return 'bg-red-500 text-white border-red-500';
    return 'bg-gray-100 text-gray-400 border-gray-200';
  }

  return (
    <div className="space-y-4">

      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 flex-shrink-0">
          {questionNumber}/{totalQuestions}
        </span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }}
          />
        </div>
        {question.theme && (
          <span className="text-xs text-gray-400 flex-shrink-0 max-w-[130px] truncate">
            {sentenceCase(question.theme)}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        {choices.length > 4 && (
          <span className="inline-flex items-center mb-3 text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium border border-violet-200">
            Plusieurs réponses possibles
          </span>
        )}
        {question.imageUrl && (
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}${question.imageUrl}`}
            alt="Schéma"
            className="w-full rounded-xl object-contain max-h-48 mb-4 border border-gray-100"
          />
        )}
        <p className="text-gray-800 font-medium leading-relaxed text-base">{question.text}</p>
      </div>

      {/* Choices */}
      <div className="space-y-2">
        {choices.map((letter) => {
          const text = question[`choice${letter}` as keyof Question] as string;
          const isCorrect = result && correctLetters.includes(letter);
          const isWrong = result && [...selected].includes(letter) && !isCorrect;

          return (
            <button
              key={letter}
              onClick={() => toggleLetter(letter)}
              disabled={!!result || loading}
              className={`w-full text-left rounded-xl transition-all duration-150 disabled:cursor-default ${rowClass(letter)}`}
            >
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${badgeClass(letter)}`}>
                  {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : isWrong ? <XCircle className="w-4 h-4" /> : letter}
                </span>
                <span className="flex-1 text-sm text-gray-700 leading-snug">{text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Submit */}
      {!result && (
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0 || loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-violet-200"
          style={{ background: selected.size === 0 ? '#d1d5db' : 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
        >
          {loading ? 'Vérification…' : 'Valider ma réponse'}
        </button>
      )}

      {/* Feedback */}
      {result && (
        <div className={`rounded-2xl border overflow-hidden ${result.isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>

          <div className={`flex items-center gap-3 px-5 py-4 ${result.isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
            {result.isCorrect ? (
              <>
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-emerald-700">Bonne réponse !</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-red-700">
                  Réponse : {result.correctAnswer.split(',').join(', ')}
                </span>
              </>
            )}
          </div>

          {result.explanation && (
            <div className="px-5 py-4 bg-white border-t border-gray-100 flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{result.explanation}</p>
            </div>
          )}

          {result.imageUrl && (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}${result.imageUrl}`}
              alt="Schéma"
              className="w-full object-contain max-h-40 border-t border-gray-100"
            />
          )}

          <div className="px-5 py-4 bg-white border-t border-gray-100">
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 shadow-md shadow-violet-200 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
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

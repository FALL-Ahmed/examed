'use client';
import { useState } from 'react';
import { CheckCircle2, XCircle, ChevronRight, Lightbulb, Heart } from 'lucide-react';
import { questionsApi } from '@/lib/api';
import { sentenceCase, resolveImageUrl } from '@/lib/utils';

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
  isMultiple?: boolean;
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
  isFavorited?: boolean;
  onFavoriteToggle?: (id: string, favorited: boolean) => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

const BADGE: Record<string, string> = {
  A: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700',
  B: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700',
  C: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  D: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  E: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700',
};

const BADGE_SELECTED: Record<string, string> = {
  A: 'bg-violet-600 text-white border-violet-600',
  B: 'bg-sky-600 text-white border-sky-600',
  C: 'bg-emerald-600 text-white border-emerald-600',
  D: 'bg-amber-500 text-white border-amber-500',
  E: 'bg-rose-600 text-white border-rose-600',
};

const ROW_SELECTED: Record<string, string> = {
  A: 'border-violet-400 bg-violet-50 dark:bg-violet-900/30 dark:border-violet-500',
  B: 'border-sky-400 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-500',
  C: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-500',
  D: 'border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-500',
  E: 'border-rose-400 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-500',
};

export function QuestionCard({ question, questionNumber, totalQuestions, onAnswer, onNext, isLast, isFavorited = false, onFavoriteToggle }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [favorited, setFavorited] = useState(isFavorited);
  const [favLoading, setFavLoading] = useState(false);

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

  async function handleFavorite() {
    if (favLoading) return;
    setFavLoading(true);
    try {
      const { data } = await questionsApi.toggleFavorite(question.id);
      setFavorited(data.favorited);
      onFavoriteToggle?.(question.id, data.favorited);
    } finally {
      setFavLoading(false);
    }
  }

  const correctLetters = result ? result.correctAnswer.split(',').map((s) => s.trim()) : [];
  const pct = (questionNumber / totalQuestions) * 100;

  function rowClass(letter: string) {
    if (!result) {
      return selected.has(letter)
        ? `border-2 ${ROW_SELECTED[letter]} cursor-pointer`
        : 'border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer';
    }
    const isCorrect = correctLetters.includes(letter);
    const isWrong = [...selected].includes(letter) && !isCorrect;
    if (isCorrect) return 'border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-500';
    if (isWrong)   return 'border-2 border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-500';
    return 'border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 opacity-50';
  }

  function badgeClass(letter: string) {
    if (!result) {
      return selected.has(letter) ? BADGE_SELECTED[letter] : BADGE[letter];
    }
    const isCorrect = correctLetters.includes(letter);
    const isWrong = [...selected].includes(letter) && !isCorrect;
    if (isCorrect) return 'bg-emerald-500 text-white border-emerald-500';
    if (isWrong)   return 'bg-red-500 text-white border-red-500';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600';
  }

  return (
    <div className="space-y-4">

      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">
          {questionNumber}/{totalQuestions}
        </span>
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }}
          />
        </div>
        {question.theme && (
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 max-w-[130px] truncate">
            {sentenceCase(question.theme)}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1">
            {(question.isMultiple || (result && correctLetters.length > 1)) && (
              <span className="inline-flex items-center mb-3 text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 px-2.5 py-1 rounded-full font-medium border border-violet-200 dark:border-violet-700">
                Plusieurs réponses possibles
              </span>
            )}
            {question.imageUrl && (
              <img
                src={resolveImageUrl(question.imageUrl)}
                alt="Schéma"
                className="w-full rounded-xl object-contain max-h-48 mb-4 border border-gray-100 dark:border-gray-700"
              />
            )}
          </div>
          <button
            onClick={handleFavorite}
            disabled={favLoading}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition hover:scale-110 disabled:opacity-50"
            title={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={`w-5 h-5 transition-colors ${favorited ? 'fill-rose-500 text-rose-500' : 'text-gray-300 dark:text-gray-600 hover:text-rose-400'}`} />
          </button>
        </div>
        <p className="text-gray-800 dark:text-gray-100 font-medium leading-relaxed text-base">{question.text}</p>
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
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 leading-snug">{text}</span>
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
          style={{ background: selected.size === 0 ? '#9ca3af' : 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
        >
          {loading ? 'Vérification…' : 'Valider ma réponse'}
        </button>
      )}

      {/* Feedback */}
      {result && (
        <div className={`rounded-2xl border overflow-hidden ${result.isCorrect ? 'border-emerald-300 dark:border-emerald-700' : 'border-red-300 dark:border-red-700'}`}>

          <div className={`flex items-center gap-3 px-5 py-4 ${result.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
            {result.isCorrect ? (
              <>
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">Bonne réponse !</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-red-700 dark:text-red-300">
                  Réponse : {result.correctAnswer.split(',').join(', ')}
                </span>
              </>
            )}
          </div>

          {result.explanation && (
            <div className="px-5 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {result.explanation.includes('\n') ? (
                  <ul className="space-y-1">
                    {result.explanation.split('\n').filter(l => l.trim()).map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                        <span>{line.trim()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{result.explanation}</p>
                )}
              </div>
            </div>
          )}

          {result.imageUrl && (
            <img
              src={resolveImageUrl(result.imageUrl)}
              alt="Schéma"
              className="w-full object-contain max-h-40 border-t border-gray-100 dark:border-gray-700"
            />
          )}

          <div className="px-5 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
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

'use client';
import { useEffect, useState } from 'react';
import { questionsApi, attemptsApi } from '@/lib/api';
import { Heart, BookOpen, Loader2, ArrowLeft } from 'lucide-react';
import { QuestionCard } from '@/components/QuestionCard';

export default function FavoritesPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Practice state
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [favsRes, idsRes] = await Promise.all([
      questionsApi.favorites(),
      questionsApi.favoriteIds(),
    ]);
    setQuestions(favsRes.data);
    setFavoriteIds(new Set(idsRes.data));
    setLoading(false);
  }

  async function openQuestion(q: any) {
    const { data } = await attemptsApi.start({ mode: 'FAVORITES', questionIds: [q.id] });
    setAttemptId(data.id);
    setPracticeQuestions([q]);
    setCurrent(0);
  }

  async function startAll() {
    if (!questions.length) return;
    const { data } = await attemptsApi.start({ mode: 'FAVORITES', questionIds: questions.map((q: any) => q.id) });
    setAttemptId(data.id);
    setPracticeQuestions([...questions]);
    setCurrent(0);
  }

  async function handleAnswer(answer: string) {
    if (!attemptId) return { isCorrect: false, correctAnswer: '', explanation: '' };
    const q = practiceQuestions[current];
    const { data } = await attemptsApi.answer(attemptId, { questionId: q.id, answer });
    return { isCorrect: data.isCorrect, correctAnswer: data.correctAnswer, explanation: data.explanation || '' };
  }

  function handleNext() {
    if (current + 1 < practiceQuestions.length) {
      setCurrent(current + 1);
    } else {
      if (attemptId) attemptsApi.finish(attemptId).catch(() => {});
      setPracticeQuestions([]);
      setAttemptId(null);
      setCurrent(0);
    }
  }

  function handleFavoriteToggle(id: string, favorited: boolean) {
    if (!favorited) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setFavoriteIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      if (practiceQuestions.length === 1) {
        setPracticeQuestions([]);
        setAttemptId(null);
      }
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );

  // Practice mode
  if (practiceQuestions.length > 0) {
    const isSingle = practiceQuestions.length === 1;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { setPracticeQuestions([]); setAttemptId(null); setCurrent(0); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
            <ArrowLeft className="w-4 h-4" /> Retour aux favoris
          </button>
          {!isSingle && (
            <span className="text-xs text-gray-400">{current + 1} / {practiceQuestions.length}</span>
          )}
        </div>
        <QuestionCard
          question={practiceQuestions[current]}
          questionNumber={current + 1}
          totalQuestions={practiceQuestions.length}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLast={current + 1 === practiceQuestions.length}
          isFavorited={favoriteIds.has(practiceQuestions[current]?.id)}
          onFavoriteToggle={handleFavoriteToggle}
        />
      </div>
    );
  }

  // List mode
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            <h1 className="text-2xl font-bold">Mes Favoris</h1>
          </div>
          <p className="text-sm text-gray-400">{questions.length} question{questions.length > 1 ? 's' : ''} enregistrée{questions.length > 1 ? 's' : ''}</p>
        </div>
        {questions.length > 0 && (
          <button onClick={startAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md shadow-violet-200 hover:opacity-90 transition"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <BookOpen className="w-4 h-4" /> Réviser tout
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-rose-300" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">Aucun favori pour l'instant</p>
          <p className="text-sm text-gray-400 mt-1">Appuie sur le ❤️ lors d'une question pour l'ajouter ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q: any) => (
            <button key={q.id} onClick={() => openQuestion(q)}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-start gap-4 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all group">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">
                  {q.subTheme?.theme?.name} › {q.subTheme?.name}
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{q.text}</p>
                {q.explanation?.trim() && (
                  <p className="text-xs text-amber-500 mt-1">💡 Commentaire disponible</p>
                )}
              </div>
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-400 opacity-0 group-hover:opacity-100 transition">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

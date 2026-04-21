'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { attemptsApi } from '@/lib/api';
import { RefreshCw, Loader2, AlertCircle, Play, PlayCircle, Trash2 } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';

export default function ReviewPage() {
  const router = useRouter();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedReview, setSavedReview] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('exam_state') || 'null');
      if (saved?.attemptId && saved?.session?.mode === 'REVIEW') setSavedReview(saved);
    } catch {}
  }, []);

  async function startReview() {
    setLoading(true);
    setError('');
    try {
      const { data } = await attemptsApi.start({ mode: 'REVIEW', count: 20 });
      router.push(`/exam/${data.attemptId}?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message?.includes('Aucune erreur')
          ? "Pas d'erreurs à réviser pour l'instant. Faites des exercices d'abord !"
          : err.response?.data?.message || 'Erreur'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* Resume banner */}
      {savedReview && (
        <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">{t('review.title')}</p>
              <p className="text-xs text-amber-600">
                {Object.keys(savedReview.answers || {}).length} / {savedReview.session?.questions?.length || '?'} répondues
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { localStorage.removeItem('exam_state'); setSavedReview(null); }}
              className="p-2 rounded-lg text-amber-400 hover:text-red-500 hover:bg-red-50 transition"
              title="Abandonner"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push(`/exam/${savedReview.attemptId}`)}
              className="flex items-center gap-1.5 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
            >
              <Play className="w-3.5 h-3.5 fill-white" /> Reprendre
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-6 md:p-8 text-white gradient-warning">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{t('review.title')}</h1>
            <p className="text-white/70 text-sm mt-0.5">{t('review.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex gap-3 items-start p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ce mode reprend toutes les questions auxquelles vous avez répondu incorrectement, classées des plus récentes aux plus anciennes.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          <button
            onClick={startReview} disabled={loading}
            className="w-full gradient-warning text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-amber-500/20"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}</> : <><Play className="w-4 h-4 fill-white" />{t('practice.start')}</>}
          </button>
        </div>

        <div className="bg-card border border-amber-500/20 rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">{t('practice.howTitle')}</h3>
          <div className="space-y-3">
            {[
              t('review.how1'),
              t('review.how2'),
              t('review.how3'),
              t('review.how4'),
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

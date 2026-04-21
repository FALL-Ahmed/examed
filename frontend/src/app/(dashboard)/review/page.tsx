'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { attemptsApi } from '@/lib/api';
import { RefreshCw, Loader2, AlertCircle, Play } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';

export default function ReviewPage() {
  const router = useRouter();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          <h3 className="font-semibold text-sm mb-3">Comment ça marche ?</h3>
          <div className="space-y-3">
            {[
              'Toutes vos erreurs regroupées',
              'Des plus récentes aux plus anciennes',
              'Correction immédiate à chaque question',
              'Progressez sur vos points faibles',
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

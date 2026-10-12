'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { concoursApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { Loader2, Trophy } from 'lucide-react';
import { CONCOURS_STATE_KEY, concoursTheme } from './_shared';

// « Voir mes résultats » : retrouver sa participation avec son numéro, comme pour l'examen blanc
export function ResultsLookup({ target }: { target: 'INFIRMIER' | 'SAGE_FEMME' }) {
  const router = useRouter();
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const th = concoursTheme(target);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function find() {
    if (!phone.trim()) return;
    setLoading(true); setError('');
    try {
      const { data } = await concoursApi.findParticipation(target, phone.trim());
      if (data.isCompleted) {
        localStorage.setItem(CONCOURS_STATE_KEY, JSON.stringify({
          sessionId: data.sessionId, examenBlancId: data.examenBlancId, target, isCompleted: true,
        }));
        router.push('/concours/results');
      } else {
        // Participation commencée : reprise avec les réponses déjà données (chronomètre inchangé)
        const answers: Record<string, string> = {};
        (data.questions ?? []).forEach((q: any) => { if (q.savedAnswer) answers[q.id] = q.savedAnswer; });
        localStorage.setItem(CONCOURS_STATE_KEY, JSON.stringify({
          sessionId: data.sessionId, participantId: data.participantId, examenBlancId: data.examenBlancId,
          durationMin: data.durationMin, totalQ: data.totalQ, startedAt: data.startedAt, endsAt: data.endsAt,
          resultsAt: data.resultsAt, participant: data.participant, questions: data.questions, target, answers,
        }));
        router.push(`/concours/exam?target=${target}`);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || (isAr ? 'لم يُعثر على أي مشاركة بهذا الرقم' : 'Aucune participation trouvée avec ce numéro'));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg text-white hover:opacity-90 transition shadow-2xl ${th.shadow}`}
        style={{ background: th.accent }}>
        <Trophy className="w-5 h-5" /> {isAr ? 'عرض نتائجي' : 'Voir mes résultats'}
      </button>
    );
  }

  return (
    <div className={`w-full max-w-xs mx-auto rounded-2xl border p-5 space-y-3 ${th.card}`}>
      <p className="text-white/90 text-sm font-bold text-center">
        {isAr ? '📱 أدخل رقم الهاتف الذي شاركت به' : '📱 Le numéro utilisé pour participer'}
      </p>
      <input type="tel" inputMode="numeric" value={phone} dir="ltr" placeholder="XX XX XX XX" autoFocus
        onChange={(e) => { setPhone(e.target.value.replace(/[^0-9+\s]/g, '')); setError(''); }}
        onKeyDown={(e) => e.key === 'Enter' && find()}
        className={`w-full px-4 py-3 border rounded-xl text-white focus:outline-none focus:ring-2 text-sm ${th.input}`} />
      {error && (
        <div role="alert" className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-red-100 text-sm text-center font-semibold">
          ❌ {error}
        </div>
      )}
      <button onClick={find} disabled={loading || !phone.trim()}
        className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition hover:opacity-90"
        style={{ background: th.accent }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? '🔍 بحث' : '🔍 Retrouver')}
      </button>
      <button onClick={() => { setOpen(false); setError(''); setPhone(''); }}
        className={`w-full ${th.textFaint} text-xs hover:text-white transition text-center`}>
        {isAr ? 'إلغاء' : 'Annuler'}
      </button>
    </div>
  );
}

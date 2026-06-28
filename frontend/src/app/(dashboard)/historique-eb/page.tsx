'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { examenBlancApi } from '@/lib/api';
import { ClipboardList, Trophy, Clock, Users, Play, RefreshCw, Loader2, ChevronDown, ChevronUp, Eye } from 'lucide-react';

const WILAYAS = ['Nouakchott','Nouadhibou','Rosso','Kaédi','Zouerate','Kiffa','Tidjikja','Atar','Aleg','Sélibaby','Aioun','Néma','Akjoujt','Boutilimit','Autre'];

const TARGET_LABEL: Record<string, string> = {
  INFIRMIER: 'Infirmier',
  SAGE_FEMME: 'Sage-femme',
  BIOLOGISTE: 'Biologiste',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-500 bg-emerald-500/10' : score >= 50 ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold ${color}`}>
      {score.toFixed(1)}%
    </span>
  );
}

interface Attempt { sessionId: string; participantId: string; score: number; rank: number; total: number; date: string }
interface EB {
  id: string; title: string; target: string; startsAt: string; endsAt: string; resultsAt: string;
  totalQ: number; durationMin: number; participantCount: number;
  myBestScore: number | null; myBestRank: number | null; myAttempts: Attempt[];
}

export default function HistoriqueEBPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const profession = (user as any)?.profession || '';
  const target = profession.includes('sage') || profession.includes('femme')
    ? 'SAGE_FEMME'
    : profession.includes('bio')
    ? 'BIOLOGISTE'
    : 'INFIRMIER';

  const userPhone = (user as any)?.phone || '';
  const [ebs, setEbs] = useState<EB[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Modal démarrer/refaire
  const [modal, setModal] = useState<{ eb: EB; mode: 'start' | 'retry' } | null>(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', ville: '', lang: 'fr' });
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState('');

  function loadHistory(phone?: string) {
    setLoading(true);
    examenBlancApi.history(target, phone || undefined)
      .then(r => setEbs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadHistory(userPhone || undefined);
  }, [target, userPhone]);

  function openModal(eb: EB, mode: 'start' | 'retry') {
    setForm({ nom: '', prenom: '', telephone: userPhone || '', ville: '', lang: 'fr' });
    setFormError('');
    setModal({ eb, mode });
  }

  async function handleStart() {
    if (!form.nom.trim() || !form.prenom.trim() || !form.telephone.trim() || !form.ville) {
      setFormError('Tous les champs sont requis');
      return;
    }
    setFormError('');
    setStarting(true);
    try {
      const { data } = await examenBlancApi.registerPast({
        nom: form.nom, prenom: form.prenom, telephone: form.telephone,
        ville: form.ville, examenBlancId: modal!.eb.id, lang: form.lang,
      });
      const state = {
        sessionId: data.sessionId,
        participantId: data.participantId,
        examenBlancId: data.examenBlancId,
        durationMin: data.durationMin,
        totalQ: data.totalQ,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        resultsAt: data.resultsAt,
        startedAt: data.startedAt,
        isCompleted: false,
        isRetry: true,
        target: data.target,
        lang: form.lang,
        participant: data.participant,
        questions: data.questions,
        answers: {},
      };
      localStorage.setItem('examen_blanc_state', JSON.stringify(state));
      router.push(`/examen-blanc/exam?target=${data.target.toLowerCase().replace('_', '-')}`);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Erreur lors du démarrage');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Examens Blancs</h1>
          <p className="text-sm text-muted-foreground">{TARGET_LABEL[target] || target} · {ebs.length} session{ebs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Statut téléphone */}
      {!userPhone && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-600 dark:text-amber-400">
          Ajoutez votre numéro de téléphone dans votre profil pour voir vos résultats personnels.
        </div>
      )}

      {/* Liste des EBs */}
      {ebs.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-12">Aucun examen blanc disponible pour l'instant.</div>
      ) : (
        <div className="space-y-3">
          {ebs.map(eb => {
            const isExpanded = expanded === eb.id;
            const participated = eb.myAttempts.length > 0;
            const now = new Date();
            const endsAt = new Date(eb.endsAt);
            const resultsAt = new Date(eb.resultsAt);
            const isPast = now > endsAt;
            const resultsReady = now >= resultsAt;

            return (
              <div key={eb.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* En-tête */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{eb.title}</p>
                        {isPast ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Terminé</span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">En cours</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(eb.endsAt)}</p>
                    </div>
                    {participated && eb.myBestScore !== null && (
                      <ScoreBadge score={eb.myBestScore} />
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{eb.participantCount} participants</span>
                    <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" />{eb.totalQ} questions</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{eb.durationMin} min</span>
                  </div>

                  {/* Mon meilleur résultat */}
                  {participated && eb.myBestRank !== null && resultsReady && (
                    <div className="mt-3 flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
                      <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs font-semibold">
                        Meilleur classement : <span className="text-amber-500">#{eb.myBestRank}</span> sur {eb.myAttempts[0]?.total}
                        {eb.myAttempts.length > 1 && <span className="text-muted-foreground ml-1">· {eb.myAttempts.length} tentatives</span>}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => openModal(eb, participated ? 'retry' : 'start')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold gradient-primary text-white"
                    >
                      {participated ? <RefreshCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {participated ? 'Refaire' : 'Commencer'}
                    </button>
                    {participated && resultsReady && eb.myAttempts[0] && (
                      <button
                        onClick={() => {
                          const att = eb.myAttempts[0];
                          localStorage.setItem('examen_blanc_state', JSON.stringify({ sessionId: att.sessionId, participantId: att.participantId, isCompleted: true, target: eb.target }));
                          router.push('/examen-blanc/results');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border hover:bg-secondary transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Voir résultats
                      </button>
                    )}
                    {eb.myAttempts.length > 1 && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : eb.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {eb.myAttempts.length} tentatives
                      </button>
                    )}
                  </div>
                </div>

                {/* Historique des tentatives */}
                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {eb.myAttempts.map((att, i) => (
                      <div key={att.sessionId} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs text-muted-foreground w-6">#{i + 1}</span>
                        <ScoreBadge score={att.score ?? 0} />
                        {resultsReady && <span className="text-xs text-muted-foreground">Rang #{att.rank} / {att.total}</span>}
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(att.date).toLocaleDateString('fr-FR')}</span>
                        {resultsReady && (
                          <button
                            onClick={() => {
                              localStorage.setItem('examen_blanc_state', JSON.stringify({ sessionId: att.sessionId, participantId: att.participantId, isCompleted: true, target: eb.target }));
                              router.push('/examen-blanc/results');
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Voir
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal démarrer/refaire */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div>
              <p className="font-bold text-base">{modal.mode === 'retry' ? 'Refaire l\'examen' : 'Commencer l\'examen'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{modal.eb.title}</p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Prénom" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                  className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" placeholder="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <input type="tel" placeholder="Téléphone" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              <select value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Choisir une wilaya</option>
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {target !== 'BIOLOGISTE' && (
                <div className="flex gap-2">
                  {['fr', 'ar'].map(l => (
                    <button key={l} onClick={() => setForm(f => ({ ...f, lang: l }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${form.lang === l ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                      {l === 'fr' ? '🇫🇷 Français' : '🇸🇦 Arabe'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-xl text-sm border border-border hover:bg-secondary transition">
                Annuler
              </button>
              <button onClick={handleStart} disabled={starting}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold gradient-primary text-white disabled:opacity-50">
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Lancer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

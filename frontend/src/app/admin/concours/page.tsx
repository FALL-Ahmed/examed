'use client';
import { useEffect, useState } from 'react';
import { concoursApi } from '@/lib/api';
import { Trophy, Loader2, Plus, MessageCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

const WINNERS_COUNT = 10;
const TARGET_LABEL: Record<string, string> = { INFIRMIER: 'Infirmier', SAGE_FEMME: 'Sage-femme' };

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const note20 = (score?: number | null) => Math.round(((score ?? 0) / 5) * 10) / 10;
const duration = (s?: number | null) => (s == null ? '—' : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`);
// Numéro local à 8 chiffres → indicatif Mauritanie (222) pour WhatsApp
const waNumber = (phone: string) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 8 ? `222${digits}` : digits;
};
// datetime-local (heure locale du navigateur) → ISO
const toIso = (v: string) => (v ? new Date(v).toISOString() : '');

function sessionStatus(s: any) {
  const now = Date.now();
  if (!s.isActive) return { label: 'Désactivé', cls: 'bg-secondary text-muted-foreground' };
  if (now < new Date(s.startsAt).getTime()) return { label: 'À venir', cls: 'bg-amber-100 text-amber-700' };
  if (now <= new Date(s.endsAt).getTime()) return { label: 'En cours', cls: 'bg-emerald-100 text-emerald-700' };
  if (now < new Date(s.resultsAt).getTime()) return { label: 'Terminé · résultats à venir', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'Résultats publiés', cls: 'bg-violet-100 text-violet-700' };
}

export default function AdminConcoursPage() {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<any>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    title: 'Concours de la Rentrée', startsAt: '', endsAt: '', resultsAt: '',
    durationMin: 60, infirmierQ: 60, sageFemmeQ: 40,
  });

  function loadSessions() {
    return concoursApi.adminSessions().then((r) => {
      setSessions(r.data);
      if (!r.data.length) setShowForm(true);
      setSelectedId((id) => id ?? r.data[0]?.id ?? null);
    }).catch(() => setSessions([]));
  }

  function loadRanking(id: string) {
    setRankingLoading(true);
    concoursApi.adminRanking(id).then((r) => setRanking(r.data)).catch(() => setRanking(null)).finally(() => setRankingLoading(false));
  }

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { if (selectedId) loadRanking(selectedId); }, [selectedId]);

  async function create() {
    setMessage(null);
    if (!form.startsAt || !form.endsAt) return setMessage({ ok: false, text: 'Renseignez le début et la fin du concours.' });
    setCreating(true);
    try {
      const { data } = await concoursApi.adminCreate({
        title: form.title.trim() || undefined,
        startsAt: toIso(form.startsAt), endsAt: toIso(form.endsAt),
        resultsAt: form.resultsAt ? toIso(form.resultsAt) : undefined,
        durationMin: Number(form.durationMin), infirmierQ: Number(form.infirmierQ), sageFemmeQ: Number(form.sageFemmeQ),
      });
      setMessage({ ok: true, text: 'Concours créé pour les infirmiers et les sages-femmes.' });
      setShowForm(false);
      setSelectedId(data.infirmier.id);
      await loadSessions();
    } catch (e: any) {
      setMessage({ ok: false, text: e.response?.data?.message || 'Erreur lors de la création' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(s: any) {
    await concoursApi.adminUpdate(s.id, { isActive: !s.isActive });
    loadSessions();
  }

  // Mise à jour immédiate d'une case (contacté / Premium offert)
  async function setFlag(p: any, key: 'contacted' | 'prizeGranted', value: boolean) {
    setRanking((r: any) => ({ ...r, participants: r.participants.map((x: any) => (x.id === p.id ? { ...x, [key]: value } : x)) }));
    try {
      if (key === 'contacted') await concoursApi.setContacted(p.id, value);
      else await concoursApi.setPrize(p.id, value);
    } catch {
      setRanking((r: any) => ({ ...r, participants: r.participants.map((x: any) => (x.id === p.id ? { ...x, [key]: !value } : x)) }));
    }
  }

  if (sessions === null) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const inputCls = 'w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary';
  const labelCls = 'text-xs font-semibold text-muted-foreground space-y-1.5 block';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Concours de la Rentrée</h1>
            <p className="text-sm text-muted-foreground">Top {WINNERS_COUNT} de chaque filière → Premium offert</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Nouveau concours
          </button>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${message.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <p className="font-semibold text-sm">Créer le concours</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crée deux sessions (infirmier et sage-femme) aux mêmes dates. Les questions sont tirées au hasard dans le thème Cas clinique, en FR et en AR.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className={`${labelCls} sm:col-span-2 lg:col-span-3`}>
              <span>Titre</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Ouverture</span>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Clôture des inscriptions</span>
              <input type="datetime-local" value={form.endsAt} min={form.startsAt || undefined} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Publication des résultats (défaut : clôture + 24 h)</span>
              <input type="datetime-local" value={form.resultsAt} min={form.endsAt || undefined} onChange={(e) => setForm({ ...form, resultsAt: e.target.value })} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Durée de l’épreuve (min)</span>
              <input type="number" min={10} max={240} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Questions infirmier</span>
              <input type="number" min={5} max={87} value={form.infirmierQ} onChange={(e) => setForm({ ...form, infirmierQ: Number(e.target.value) })} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Questions sage-femme</span>
              <input type="number" min={5} max={41} value={form.sageFemmeQ} onChange={(e) => setForm({ ...form, sageFemmeQ: Number(e.target.value) })} className={inputCls} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Cas cliniques disponibles aujourd’hui : infirmier 90 FR / 87 AR, sage-femme 59 FR / 41 AR. La création échoue si une langue n’en a pas assez.
          </p>
          <div className="flex gap-2 justify-end">
            {sessions.length > 0 && (
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition">
                Annuler
              </button>
            )}
            <button onClick={create} disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 transition disabled:opacity-60">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />} Créer le concours
            </button>
          </div>
        </div>
      )}

      {/* Sessions */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map((s) => {
            const st = sessionStatus(s);
            const selected = s.id === selectedId;
            return (
              <div key={s.id}
                className={`bg-card border rounded-2xl p-4 transition ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
                <button onClick={() => setSelectedId(s.id)} className="w-full text-start">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{s.title} · {TARGET_LABEL[s.target] ?? s.target}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {fmt(s.startsAt)} → {fmt(s.endsAt)} · résultats {fmt(s.resultsAt)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.totalQ} questions · {s.durationMin} min · <strong className="text-foreground">{s.participantCount}</strong> inscrits
                  </p>
                </button>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  <a href={s.target === 'SAGE_FEMME' ? '/concours/sage-femme' : '/concours'} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> Page publique
                  </a>
                  <button onClick={() => toggleActive(s)} className="text-xs font-semibold text-muted-foreground hover:text-foreground ms-auto">
                    {s.isActive ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Classement */}
      {selectedId && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <div>
              <p className="font-semibold text-sm">
                Classement {ranking?.session ? `· ${TARGET_LABEL[ranking.session.target] ?? ranking.session.target}` : ''}
              </p>
              {ranking && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ranking.participants.length} terminés · {ranking.inProgress} en cours · score puis temps
                </p>
              )}
            </div>
            <button onClick={() => loadRanking(selectedId)} aria-label="Actualiser"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition">
              <RefreshCw className={`w-4 h-4 ${rankingLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {!ranking ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : ranking.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Aucun participant n’a encore terminé.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase tracking-wide">
                    <tr>
                      <th className="text-start px-4 py-3 font-semibold">#</th>
                      <th className="text-start px-4 py-3 font-semibold">Participant</th>
                      <th className="text-start px-4 py-3 font-semibold">Téléphone</th>
                      <th className="text-end px-4 py-3 font-semibold">Note</th>
                      <th className="text-end px-4 py-3 font-semibold">Temps</th>
                      <th className="text-center px-4 py-3 font-semibold">Triche</th>
                      <th className="text-center px-4 py-3 font-semibold">Contacté</th>
                      <th className="text-center px-4 py-3 font-semibold">Premium offert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ranking.participants.map((p: any) => {
                      const winner = p.rank <= WINNERS_COUNT;
                      return (
                        <tr key={p.id} className={winner ? 'bg-amber-500/5' : ''}>
                          <td className="px-4 py-3 font-bold tabular-nums">{winner ? `🏆 ${p.rank}` : p.rank}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{p.prenom} {p.nom}</p>
                            <p className="text-xs text-muted-foreground">{p.ville} · {p.lang === 'ar' ? 'AR' : 'FR'}</p>
                          </td>
                          <td className="px-4 py-3" dir="ltr">
                            <a href={`https://wa.me/${waNumber(p.telephone)}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline">
                              <MessageCircle className="w-3.5 h-3.5" /> {p.telephone}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-end">
                            <p className="font-bold tabular-nums">{note20(p.score)}/20</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{p.correctQ}/{ranking.session.totalQ} justes</p>
                          </td>
                          <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">{duration(p.timeTaken)}</td>
                          <td className="px-4 py-3 text-center">
                            {p.tricherie
                              ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600" title="Sorties de la page pendant l'épreuve"><AlertTriangle className="w-3.5 h-3.5" /> {p.tabSwitches}</span>
                              : p.tabSwitches > 0 ? <span className="text-xs text-muted-foreground">{p.tabSwitches}</span> : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={p.contacted} onChange={(e) => setFlag(p, 'contacted', e.target.checked)}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer" aria-label={`${p.prenom} contacté`} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={p.prizeGranted} onChange={(e) => setFlag(p, 'prizeGranted', e.target.checked)}
                              className="w-4 h-4 accent-amber-500 cursor-pointer" aria-label={`Premium offert à ${p.prenom}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground px-5 py-4 border-t border-border">
                Triche : ⚠ = 5 sorties de page ou plus pendant l’épreuve. Pour offrir le Premium, le gagnant crée son compte sur le site, puis activez-le dans Utilisateurs › Activer Premium, et cochez « Premium offert ».
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '@/lib/api';
import { Loader2, MessageCircle, CheckCircle2, Clock, Gift, XCircle } from 'lucide-react';

const PROFESSION_LABEL: Record<string, string> = {
  etudiant_infirmier: 'Infirmier', etudiant_infirmier_3eme: 'Infirmier 3e', infirmier_diplome: 'Infirmier',
  sage_femme: 'Sage-femme', biologiste: 'Biologiste',
};
// Statut = icône + libellé (jamais la couleur seule)
const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  CONVERTED: { label: 'Passé Premium', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  PAYMENT_PENDING: { label: 'Paiement en attente', cls: 'bg-amber-100 text-amber-700', icon: Clock },
  ACTIVE: { label: 'Essai en cours', cls: 'bg-violet-100 text-violet-700', icon: Gift },
  EXPIRED: { label: 'Essai terminé', cls: 'bg-secondary text-muted-foreground', icon: XCircle },
};
const BAR = '#7c3aed';

const waNumber = (phone: string) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 8 ? `222${digits}` : digits;
};
const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—');
const fmtAgo = (d?: string | null) => {
  if (!d) return 'Jamais';
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
  if (h < 1) return "À l'instant";
  if (h < 24) return `Il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `Il y a ${j} j`;
};

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function DayTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{fmtDay(d.date)}</p>
      <p><span className="tabular-nums font-semibold">{d.answers}</span> questions répondues</p>
      <p className="text-muted-foreground"><span className="tabular-nums">{d.activeUsers}</span> élève{d.activeUsers > 1 ? 's' : ''} actif{d.activeUsers > 1 ? 's' : ''}</p>
      <p className="text-muted-foreground"><span className="tabular-nums">{d.signups}</span> inscription{d.signups > 1 ? 's' : ''} · <span className="tabular-nums">{d.conversions}</span> passage{d.conversions > 1 ? 's' : ''} Premium</p>
    </div>
  );
}

export function FreemiumStats() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<string>('ALL');
  const [sort, setSort] = useState<'active' | 'recent'>('active');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setData(null); setError(false);
    adminApi.freemiumStats(days).then((r) => setData(r.data)).catch(() => setError(true));
  }, [days]);

  const rows = useMemo(() => {
    if (!data) return [];
    const list = status === 'ALL' ? data.users : data.users.filter((u: any) => u.status === status);
    return [...list].sort((a: any, b: any) =>
      sort === 'active' ? b.answered - a.answered : new Date(b.freemiumAt).getTime() - new Date(a.freemiumAt).getTime());
  }, [data, status, sort]);

  if (error) return <p className="text-sm text-destructive text-center py-12">Impossible de charger les statistiques.</p>;
  if (!data) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const k = data.kpis;
  const counts = data.users.reduce((acc: Record<string, number>, u: any) => ({ ...acc, [u.status]: (acc[u.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-6">
      {/* Indicateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Inscrits en essai gratuit" value={k.signups} sub={`${k.neverAnswered} n’ont jamais répondu`} />
        <Kpi label="Passés Premium" value={k.converted} sub={`Taux de conversion ${k.conversionRate.toLocaleString('fr-FR')} %`} />
        <Kpi label="Questions répondues" value={k.totalAnswers.toLocaleString('fr-FR')} sub={`${k.answersToday} aujourd’hui · ${k.avgAnswers} en moyenne / inscrit`} />
        <Kpi label="Actifs sur 7 jours" value={k.active7d} sub={`${k.paymentPending} paiement${k.paymentPending > 1 ? 's' : ''} en attente`} />
      </div>

      {/* Questions par jour */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="font-semibold text-sm">Questions répondues par jour</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tous les comptes inscrits via l’essai gratuit (survolez une barre pour le détail)</p>
          </div>
          <div className="flex gap-1 bg-secondary/50 border border-border rounded-xl p-1">
            {[7, 30, 90].map((n) => (
              <button key={n} onClick={() => setDays(n)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${days === n ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {n} j
              </button>
            ))}
          </div>
        </div>
        {mounted ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.series} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
              <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<DayTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.05 }} />
              <Bar dataKey="answers" name="Questions répondues" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="h-60 bg-secondary rounded-lg animate-pulse" />}
      </div>

      {/* Par élève */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-border">
          <div className="flex gap-1.5 flex-wrap">
            {[['ALL', 'Tous', data.users.length], ...Object.entries(STATUS).map(([id, s]) => [id, s.label, counts[id] ?? 0])].map(([id, label, n]) => (
              <button key={id as string} onClick={() => setStatus(id as string)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${status === id ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {label} <span className="tabular-nums opacity-70">{n as number}</span>
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)}
            className="border border-border rounded-xl px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="active">Les plus actifs</option>
            <option value="recent">Les plus récents</option>
          </select>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Aucun élève dans cette catégorie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase tracking-wide">
                <tr>
                  <th className="text-start px-4 py-3 font-semibold">Élève</th>
                  <th className="text-start px-4 py-3 font-semibold">Téléphone</th>
                  <th className="text-start px-4 py-3 font-semibold">Statut</th>
                  <th className="text-end px-4 py-3 font-semibold">Questions</th>
                  <th className="text-end px-4 py-3 font-semibold">Aujourd’hui</th>
                  <th className="text-end px-4 py-3 font-semibold">Réussite</th>
                  <th className="text-start px-4 py-3 font-semibold">Dernière activité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((u: any) => {
                  const st = STATUS[u.status];
                  return (
                    <tr key={u.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <a href={`/admin/users/${u.id}`} className="font-medium hover:underline">{u.fullName}</a>
                        <p className="text-xs text-muted-foreground">
                          {PROFESSION_LABEL[u.profession] ?? u.profession ?? '—'} · inscrit le {fmtDate(u.freemiumAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3" dir="ltr">
                        {u.phone ? (
                          <a href={`https://wa.me/${waNumber(u.phone)}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline whitespace-nowrap">
                            <MessageCircle className="w-3.5 h-3.5" /> {u.phone}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${st.cls}`}>
                          <st.icon className="w-3 h-3" /> {st.label}
                        </span>
                        {u.convertedAt && <p className="text-[11px] text-muted-foreground mt-0.5">le {fmtDate(u.convertedAt)}</p>}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums font-semibold">{u.answered}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{u.today || '—'}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{u.answered ? `${Math.round((u.correct / u.answered) * 100)} %` : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtAgo(u.lastActivity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

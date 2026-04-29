'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { FlaskConical, Users, TrendingDown, CheckCircle, Globe, Phone } from 'lucide-react';

export default function FreeTrialStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.freeTrialStats().then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <p className="text-center text-muted-foreground">Aucune donnée disponible.</p>;

  const { byTheme, globalFunnel, totalSessions, period, leads } = data;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Analyse Free Trial</h1>
          <p className="text-sm text-muted-foreground">{period} · {totalSessions} sessions au total</p>
        </div>
      </div>

      {/* Global funnel */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Entonnoir global — jusqu'où vont-ils ?</h2>
        <div className="space-y-3">
          {globalFunnel.map((f: any, i: number) => {
            const pct = globalFunnel[0].count > 0 ? Math.round((f.count / globalFunnel[0].count) * 100) : 0;
            const dropped = i > 0 ? globalFunnel[i - 1].count - f.count : 0;
            return (
              <div key={f.q}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">Question {f.q}</span>
                  <div className="flex items-center gap-4">
                    {dropped > 0 && (
                      <span className="text-red-500 text-xs flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> {dropped} abandon{dropped > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="font-bold">{f.count} sessions ({pct}%)</span>
                  </div>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leads WhatsApp */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-4 h-4 text-green-500" />
          <h2 className="font-semibold">Leads WhatsApp ({leads?.length ?? 0})</h2>
        </div>
        {leads?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4">Numéro</th>
                  <th className="pb-2 pr-4">Thème</th>
                  <th className="pb-2 pr-4">Langue</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-2 pr-4 font-mono font-semibold text-green-600">{lead.phone}</td>
                    <td className="py-2 pr-4">{lead.theme}</td>
                    <td className="py-2 pr-4">{lead.lang === 'ar' ? '🇲🇷 AR' : '🇫🇷 FR'}</td>
                    <td className="py-2 text-muted-foreground text-xs">
                      {new Date(lead.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun numéro WhatsApp collecté pour l'instant.</p>
        )}
      </div>

      {/* Par thème */}
      <div className="grid grid-cols-1 gap-6">
        {byTheme.map((t: any) => (
          <div key={t.theme} className="bg-card border border-border rounded-2xl p-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold">{t.theme}</h2>
              <div className="flex flex-wrap gap-3">
                <Stat icon={Users} label="Sessions" value={t.totalSessions} color="#6366f1" />
                <Stat icon={CheckCircle} label="Taux réussite" value={`${t.successRate}%`} color="#10b981" />
                <Stat icon={TrendingDown} label="Complétion" value={`${t.completionRate}%`} color={t.completionRate >= 50 ? '#10b981' : t.completionRate >= 25 ? '#f59e0b' : '#ef4444'} />
                <Stat icon={Globe} label="Moy. questions" value={t.avgQuestions} color="#f59e0b" />
              </div>
            </div>

            {/* Langue */}
            <div className="flex gap-3 mb-5">
              {[
                { key: 'fr', label: '🇫🇷 Français', count: t.langSplit.fr },
                { key: 'ar', label: '🇲🇷 Arabe', count: t.langSplit.ar },
              ].map((l) => (
                <div key={l.key} className="flex-1 bg-secondary rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">{l.label}</p>
                  <p className="font-bold mt-0.5">{l.count} sessions</p>
                  <p className="text-xs text-muted-foreground">
                    {t.totalSessions > 0 ? Math.round((l.count / t.totalSessions) * 100) : 0}%
                  </p>
                </div>
              ))}
            </div>

            {/* Entonnoir par thème */}
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Entonnoir de progression</h3>
            <div className="space-y-2">
              {t.funnel.map((f: any, i: number) => {
                const pct = t.funnel[0].count > 0 ? Math.round((f.count / t.funnel[0].count) * 100) : 0;
                const dropped = i > 0 ? t.funnel[i - 1].count - f.count : 0;
                return (
                  <div key={f.q}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span>Q{f.q}</span>
                      <div className="flex items-center gap-3">
                        {dropped > 0 && (
                          <span className="text-red-500">{dropped} abandon{dropped > 1 ? 's' : ''} ({100 - pct}%)</span>
                        )}
                        <span className="font-semibold">{f.count} · {pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {byTheme.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucune session free trial enregistrée.</p>
            <p className="text-xs mt-1">Les données apparaîtront dès qu'un utilisateur répond à une question.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="bg-secondary rounded-xl px-4 py-2.5 flex items-center gap-2.5 min-w-[110px]">
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <div>
        <p className="font-bold text-sm">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

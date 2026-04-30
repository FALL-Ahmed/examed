'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { FlaskConical, Users, Trophy, TrendingDown, Phone, Globe, Zap } from 'lucide-react';

export default function FreeTrialStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.freeTrialStats().then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return <p className="text-center text-muted-foreground py-16">Aucune donnée.</p>;

  const { byTheme, globalFunnel, totalSessions, period, leads } = data;
  const totalCompleted = globalFunnel.length > 0
    ? globalFunnel[globalFunnel.length - 1].count : 0;
  const completionRate = totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0;
  const q1Count = globalFunnel[0]?.count ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Analyse Free Trial</h1>
          <p className="text-xs text-muted-foreground">{period}</p>
        </div>
      </div>

      {/* ── KPIs globaux ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users,        label: 'Sessions totales', value: totalSessions,     color: '#6366f1', bg: '#6366f115' },
          { icon: Zap,          label: 'Ont commencé',     value: q1Count,            color: '#0ea5e9', bg: '#0ea5e915' },
          { icon: Trophy,       label: 'Ont tout fini',    value: totalCompleted,     color: '#10b981', bg: '#10b98115' },
          { icon: TrendingDown, label: 'Taux complétion',  value: `${completionRate}%`, color: completionRate >= 50 ? '#10b981' : completionRate >= 25 ? '#f59e0b' : '#ef4444', bg: completionRate >= 50 ? '#10b98115' : completionRate >= 25 ? '#f59e0b15' : '#ef444415' },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-2xl font-extrabold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Leads WhatsApp ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-500" />
            <h2 className="font-bold">Leads WhatsApp</h2>
          </div>
          <span className="text-2xl font-extrabold text-green-600">{leads?.length ?? 0}</span>
        </div>
        {leads?.length > 0 ? (
          <div className="divide-y divide-border">
            {leads.map((lead: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <span className="font-mono font-bold text-sm">{lead.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-secondary font-medium">{lead.theme}</span>
                  <span>{lead.lang === 'ar' ? '🇲🇷 AR' : '🇫🇷 FR'}</span>
                  <span>{new Date(lead.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <Phone className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun numéro collecté pour l'instant.</p>
          </div>
        )}
      </div>

      {/* ── Entonnoir global ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-bold">Entonnoir global</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Jusqu'où vont les visiteurs ?</p>
        </div>
        <div className="p-5 space-y-2">
          {globalFunnel.map((f: any, i: number) => {
            const pct = q1Count > 0 ? Math.round((f.count / q1Count) * 100) : 0;
            const dropped = i > 0 ? globalFunnel[i - 1].count - f.count : 0;
            const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
            return (
              <div key={f.q} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">Q{f.q}</span>
                <div className="flex-1 h-7 bg-secondary rounded-lg overflow-hidden relative">
                  <div className="h-full rounded-lg transition-all duration-500 flex items-center px-3"
                    style={{ width: `${Math.max(pct, 2)}%`, background: color }}>
                    {pct >= 20 && <span className="text-white text-xs font-bold">{pct}%</span>}
                  </div>
                  {pct < 20 && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color }}>{pct}%</span>}
                </div>
                <span className="text-xs font-semibold w-16 flex-shrink-0 text-right">{f.count} sess.</span>
                {dropped > 0 && (
                  <span className="text-xs text-red-500 flex-shrink-0 w-20 text-right">-{dropped} ici</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Par thème ── */}
      <div className="space-y-4">
        {byTheme.map((t: any) => (
          <div key={t.theme} className="bg-card border border-border rounded-2xl overflow-hidden">

            {/* Thème header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-500" />
                <h3 className="font-bold text-base">{t.theme}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge value={t.totalSessions} label="sessions" color="#6366f1" />
                <Badge value={`${t.avgQuestions} q.`} label="en moy." color="#f59e0b" />
                <Badge value={`${t.successRate}%`} label="réussite" color="#10b981" />
                <Badge
                  value={`${t.completionRate}%`}
                  label="complétion"
                  color={t.completionRate >= 50 ? '#10b981' : t.completionRate >= 25 ? '#f59e0b' : '#ef4444'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-border">

              {/* Entonnoir */}
              <div className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Entonnoir</p>
                <div className="space-y-1.5">
                  {t.funnel.map((f: any, i: number) => {
                    const base = t.funnel[0].count;
                    const pct = base > 0 ? Math.round((f.count / base) * 100) : 0;
                    const dropped = i > 0 ? t.funnel[i - 1].count - f.count : 0;
                    const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={f.q} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">Q{f.q}</span>
                        <div className="flex-1 h-5 bg-secondary rounded overflow-hidden relative">
                          <div className="h-full rounded transition-all duration-300"
                            style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
                        </div>
                        <span className="text-xs font-bold w-8 flex-shrink-0" style={{ color }}>{pct}%</span>
                        {dropped > 0 && (
                          <span className="text-[10px] text-red-500 w-12 flex-shrink-0">-{dropped}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Droite : source + langue + point de chute */}
              <div className="p-5 space-y-5">

                {/* Sources */}
                {t.sourceSplit?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Source</p>
                    <div className="space-y-2">
                      {t.sourceSplit.map((s: any) => {
                        const pct = t.totalSessions > 0 ? Math.round((s.count / t.totalSessions) * 100) : 0;
                        const srcColor = s.source === 'facebook' ? '#1877f2'
                          : s.source === 'tiktok' ? '#000000'
                          : s.source === 'google' ? '#ea4335'
                          : s.source === 'instagram' ? '#e1306c'
                          : '#6366f1';
                        return (
                          <div key={s.source} className="flex items-center gap-2">
                            <span className="text-xs font-bold w-20 truncate flex-shrink-0" style={{ color: srcColor }}>
                              {s.source}
                            </span>
                            <div className="flex-1 h-4 bg-secondary rounded overflow-hidden">
                              <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: srcColor + '99' }} />
                            </div>
                            <span className="text-xs font-semibold w-16 text-right flex-shrink-0">{s.count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Langue */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Langue</p>
                  <div className="space-y-2">
                    {[
                      { flag: '🇫🇷', label: 'Français', count: t.langSplit.fr },
                      { flag: '🇲🇷', label: 'Arabe',    count: t.langSplit.ar },
                    ].map((l) => {
                      const pct = t.totalSessions > 0 ? Math.round((l.count / t.totalSessions) * 100) : 0;
                      return (
                        <div key={l.label} className="flex items-center gap-2">
                          <span className="text-sm">{l.flag}</span>
                          <div className="flex-1 h-4 bg-secondary rounded overflow-hidden">
                            <div className="h-full rounded bg-violet-500/70" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold w-16 text-right">{l.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Point de chute */}
                {(() => {
                  const biggestDrop = t.funnel.reduce((acc: any, f: any, i: number) => {
                    if (i === 0) return acc;
                    const dropped = t.funnel[i - 1].count - f.count;
                    return dropped > (acc?.dropped ?? 0) ? { q: f.q, dropped } : acc;
                  }, null);
                  if (!biggestDrop || biggestDrop.dropped === 0) return null;
                  return (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <p className="text-xs font-semibold text-red-600">⚠️ Point de chute principal</p>
                      <p className="text-sm font-bold mt-0.5">Question {biggestDrop.q} — {biggestDrop.dropped} abandon{biggestDrop.dropped > 1 ? 's' : ''}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}

        {byTheme.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
            <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Aucune session enregistrée</p>
            <p className="text-xs mt-1">Les données apparaissent dès qu'un visiteur répond à une question.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ value, label, color }: { value: any; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-xl border border-border bg-secondary/50 min-w-[60px]">
      <span className="text-sm font-extrabold" style={{ color }}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

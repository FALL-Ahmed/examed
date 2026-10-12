'use client';
import { useEffect, useState } from 'react';
import { examenBlancApi } from '@/lib/api';
import { AlertTriangle, Loader2, MapPin, TrendingUp, X } from 'lucide-react';

// Statistiques d'une session de test : mêmes données et même présentation que l'onglet Stats
// des examens blancs (bascule FR / AR, distribution, wilayas, questions ratées, top participants)
const pad = (n: number) => String(n).padStart(2, '0');
const formatTime = (sec: number) => { const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h}h${pad(m)}` : `${m}min`; };
const note20 = (score?: number | null) => Math.round(((score ?? 0) / 5) * 10) / 10;
const HIST_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#6366f1', '#8b5cf6'];

export function SessionStatsPanel({ sessionId }: { sessionId: string }) {
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    examenBlancApi.adminGetStats(sessionId, lang).then((r) => setStats(r.data)).catch(() => setStats(null)).finally(() => setLoading(false));
  }, [sessionId, lang]);

  if (loading && !stats) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!stats) return <p className="text-sm text-destructive text-center py-12">Impossible de charger les statistiques.</p>;
  const st = stats.stats;

  return (
    <div className="space-y-6">
      {/* Langue */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">Statistiques par langue des questions</p>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
          {([
            { id: 'fr' as const, label: '🇫🇷 Français', count: stats.langCounts?.fr ?? 0 },
            { id: 'ar' as const, label: '🇲🇷 Arabe', count: stats.langCounts?.ar ?? 0 },
          ]).map((l) => (
            <button key={l.id} onClick={() => setLang(l.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${lang === l.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {l.label} <span className="ms-1 opacity-60">({l.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total inscrits', val: st.total, color: 'bg-blue-500' },
          { label: `Terminé (${st.completionRate}%)`, val: st.completed, color: 'bg-emerald-500' },
          { label: 'Note moyenne', val: `${note20(st.avgScore)}/20`, color: 'bg-violet-500' },
          { label: 'Taux réussite ≥ 10/20', val: `${st.passRate}%`, color: 'bg-amber-500' },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-lg ${k.color} flex items-center justify-center`}><TrendingUp className="w-4 h-4 text-white" /></div>
            <p className="text-2xl font-black text-foreground tabular-nums">{k.val}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {st.tricherieCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm font-semibold">
            {st.tricherieCount} participant(s) détecté(s) pour triche (≥ 5 sorties de la page)
          </p>
        </div>
      )}

      {/* Distribution des notes (FR + AR) */}
      {stats.histogramAll && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-500" /> Distribution des notes</h3>
          <p className="text-xs text-muted-foreground mb-5">FR + AR combinés — {stats.histogramAll.reduce((s: number, b: any) => s + b.count, 0)} participants</p>
          {(() => {
            const maxC = Math.max(...stats.histogramAll.map((b: any) => b.count), 1);
            return (
              <div>
                <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                  {stats.histogramAll.map((bar: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${i * 2}–${(i + 1) * 2}/20 : ${bar.count}`}>
                      {bar.count > 0 && <span className="text-[11px] font-bold text-foreground mb-0.5">{bar.count}</span>}
                      <div className="w-full rounded-t-md" style={{ height: bar.count > 0 ? Math.max(12, Math.round((bar.count / maxC) * 120)) : 3, background: bar.count > 0 ? HIST_COLORS[i] : '#e5e7eb' }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 mt-1">
                  {stats.histogramAll.map((_: any, i: number) => (
                    <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">{i * 2}</div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-end mt-1">note /20</p>
              </div>
            );
          })()}
        </div>
      )}

      {/* Wilayas */}
      {stats.cityBreakdown?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-500" /> Répartition par wilaya</h3>
          <div className="space-y-3">
            {stats.cityBreakdown.map((c: any) => (
              <div key={c.ville} className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm w-40 flex-shrink-0 truncate">{c.ville}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.count / (stats.cityBreakdown[0]?.count || 1)) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                </div>
                <span className="text-muted-foreground text-sm w-6 text-end tabular-nums">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions les plus ratées */}
      {stats.questionStats?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">❌ Questions les plus ratées</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Triées par score partiel moyen croissant — top 30 · cliquez pour voir la question</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>{['#', 'Q°', 'Question', 'Thème', 'Rép.', '✅ Juste', '🔶 Partiel', '❌ Négatif', 'Score moy.'].map((h) => (
                  <th key={h} className="text-start px-4 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {stats.questionStats.map((q: any, i: number) => (
                  <tr key={q.questionId} onClick={() => setQuestion(q)} className="border-t border-border hover:bg-muted/50 cursor-pointer">
                    <td className="px-4 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-violet-600 whitespace-nowrap">{q.numQuestion ? `#${q.numQuestion}` : '—'}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-xs"><p className="line-clamp-2" dir="auto">{q.text}</p></td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap"><p>{q.theme}</p><p className="opacity-60">{q.subTheme}</p></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{q.total}</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-600">{q.fullPct}%</td>
                    <td className="px-4 py-2.5 font-bold text-amber-500">{q.partialPct}%</td>
                    <td className="px-4 py-2.5 font-bold text-red-500">{q.negativePct}%</td>
                    <td className="px-4 py-2.5"><span className={`font-bold ${q.avgPartial < 0.5 ? 'text-amber-500' : 'text-emerald-600'}`}>{q.avgPartial.toFixed(3)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top participants */}
      {stats.topParticipants?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold text-foreground">🏆 Top participants ({lang === 'ar' ? 'arabe' : 'français'})</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>{['#', 'Nom', 'Wilaya', 'Téléphone', 'Note', 'Temps', 'Triche', 'Historique'].map((h) => (
                  <th key={h} className="text-start px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {stats.topParticipants.map((p: any) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-bold text-muted-foreground">{p.rank}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{p.prenom} {p.nom}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.ville}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{p.telephone}</td>
                    <td className="px-4 py-2.5 font-bold text-violet-600 tabular-nums">{note20(p.score)}/20</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatTime(p.timeTaken || 0)}</td>
                    <td className="px-4 py-2.5">{p.tricherie ? <span className="flex items-center gap-1 text-red-500 text-xs"><AlertTriangle className="w-3 h-3" />{p.tabSwitches}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5">
                      {p.previousSessions?.length > 0
                        ? <div className="flex flex-col gap-1">{p.previousSessions.map((s: any) => (
                            <span key={s.id} className="inline-flex px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-semibold whitespace-nowrap">🔄 {s.title}</span>
                          ))}</div>
                        : <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">🆕 Nouveau</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Détail d'une question ratée */}
      {question && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setQuestion(null)}>
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setQuestion(null)} aria-label="Fermer" className="absolute top-4 end-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <p className="text-xs text-muted-foreground">{question.theme} · {question.subTheme}</p>
            <p className="font-semibold mt-2" dir="auto">{question.text}</p>
            <ul className="mt-4 space-y-1.5 text-sm" dir="auto">
              {['A', 'B', 'C', 'D', 'E'].filter((c) => question[`choice${c}`]).map((c) => {
                const ok = question.correctAnswer.split(',').map((x: string) => x.trim()).includes(c);
                return (
                  <li key={c} className={`rounded-lg border px-3 py-2 ${ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-border'}`}>
                    <strong>{c}.</strong> {question[`choice${c}`]}
                  </li>
                );
              })}
            </ul>
            {question.explanation && <p className="text-sm text-muted-foreground mt-4" dir="auto">{question.explanation}</p>}
            <p className="text-xs text-muted-foreground mt-4">{question.total} réponses · ✅ {question.fullPct}% · 🔶 {question.partialPct}% · ❌ {question.negativePct}%</p>
          </div>
        </div>
      )}
    </div>
  );
}

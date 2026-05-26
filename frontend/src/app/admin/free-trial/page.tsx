'use client';
import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { FlaskConical, Users, Trophy, TrendingDown, Phone, Globe, Zap, GitCompare, BookOpen, CheckCircle2, BarChart2, ArrowRight, CreditCard } from 'lucide-react';

const toIso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => toIso(new Date(Date.now() - n * 86400000));
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export default function FreeTrialStatsPage() {
  const [tab, setTab] = useState<'trial' | 'practice' | 'sage-femme'>('trial');
  const today = toIso(new Date());
  const [startDate, setStartDate] = useState(daysAgo(6));
  const [endDate, setEndDate] = useState(today);
  const [compareMode, setCompareMode] = useState(false);
  const [compareStart, setCompareStart] = useState(daysAgo(13));
  const [compareEnd, setCompareEnd] = useState(daysAgo(7));
  const [leadsPage, setLeadsPage] = useState(0);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [practiceData, setPracticeData] = useState<any>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [pStart, setPStart] = useState(daysAgo(6));
  const [pEnd, setPEnd] = useState(today);

  const [sfData, setSfData] = useState<any>(null);
  const [sfLoading, setSfLoading] = useState(false);
  const [sfStart, setSfStart] = useState(daysAgo(6));
  const [sfEnd, setSfEnd] = useState(today);

  const load = useCallback(() => {
    setLoading(true);
    setLeadsPage(0);
    adminApi.freeTrialStats({
      startDate, endDate,
      ...(compareMode ? { compareStart, compareEnd } : {}),
    })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [startDate, endDate, compareMode, compareStart, compareEnd]);

  useEffect(() => { load(); }, [load]);

  const loadPractice = useCallback(() => {
    setPracticeLoading(true);
    adminApi.freePracticeStats({ startDate: pStart, endDate: pEnd, target: 'INFIRMIER' })
      .then((r) => setPracticeData(r.data))
      .finally(() => setPracticeLoading(false));
  }, [pStart, pEnd]);

  const loadSf = useCallback(() => {
    setSfLoading(true);
    adminApi.freePracticeStats({ startDate: sfStart, endDate: sfEnd, target: 'SAGE_FEMME' })
      .then((r) => setSfData(r.data))
      .finally(() => setSfLoading(false));
  }, [sfStart, sfEnd]);

  useEffect(() => {
    if (tab !== 'practice') return;
    loadPractice();
  }, [tab, loadPractice]);

  useEffect(() => {
    if (tab !== 'sage-femme') return;
    loadSf();
  }, [tab, loadSf]);

  if (!data && loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return <p className="text-center text-muted-foreground py-16">Aucune donnée.</p>;

  const { byTheme, globalFunnel, totalSessions, period, leads, dailyStats, compare } = data;
  const totalCompleted = globalFunnel.length > 0 ? globalFunnel[globalFunnel.length - 1].count : 0;
  const completionRate = totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0;
  const q1Count = globalFunnel[0]?.count ?? 0;

  const maxSessions = Math.max(...(dailyStats ?? []).map((d: any) => d.sessions), 1);
  const compareDailyStats: any[] = compare?.dailyStats ?? [];
  const compareTotalSessions: number = compare?.totalSessions ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Essais gratuits</h1>
          <p className="text-xs text-muted-foreground">{tab === 'trial' ? period : tab === 'sage-femme' ? 'Sage-femme — sessions gratuites' : 'Free Pratique — /free-practice'}</p>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab('trial')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${tab === 'trial' ? 'border-violet-500 text-violet-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <FlaskConical className="w-4 h-4" /> Free Trial
        </button>
        <button
          onClick={() => setTab('practice')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${tab === 'practice' ? 'border-violet-500 text-violet-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <BookOpen className="w-4 h-4" /> Free Pratique 🏥
        </button>
        <button
          onClick={() => setTab('sage-femme')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${tab === 'sage-femme' ? 'border-pink-500 text-pink-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <BookOpen className="w-4 h-4" /> Sage-femme 👶
        </button>
      </div>

      {/* ── Contenu Free Pratique ── */}
      {tab === 'practice' && (
        <div className="space-y-6">

          {/* Filtres dates */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Du</label>
              <input type="date" value={pStart} max={pEnd}
                onChange={(e) => setPStart(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-secondary text-sm font-medium focus:outline-none focus:border-violet-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Au</label>
              <input type="date" value={pEnd} min={pStart} max={today}
                onChange={(e) => setPEnd(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-secondary text-sm font-medium focus:outline-none focus:border-violet-400" />
            </div>
            <div className="flex gap-2">
              {[7, 14, 30].map((n) => (
                <button key={n} onClick={() => { setPStart(daysAgo(n - 1)); setPEnd(today); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${pStart === daysAgo(n - 1) && pEnd === today ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:text-foreground hover:border-violet-400'}`}>
                  {n}j
                </button>
              ))}
            </div>
            <button onClick={loadPractice}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition">
              Appliquer
            </button>
          </div>

          {practiceLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!practiceLoading && practiceData && (
            <>
              {/* Funnel */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Entonnoir de conversion — 30 derniers jours</p>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Sessions', value: practiceData.totalSessions, color: 'bg-violet-100 text-violet-700', pct: null },
                    { label: 'Complétées', value: practiceData.totalSessions > 0 ? Math.round((practiceData.totalSessions * practiceData.completionRate) / 100) : 0, color: 'bg-blue-100 text-blue-700', pct: practiceData.completionRate },
                    { label: 'Clic "Activez"', value: practiceData.totalCtaClicks, color: 'bg-orange-100 text-orange-700', pct: practiceData.ctaRate },
                    { label: 'Inscriptions', value: practiceData.registrations, color: 'bg-emerald-100 text-emerald-700', pct: practiceData.registrationRate },
                    { label: 'Paiements validés', value: practiceData.validatedPayments, color: 'bg-pink-100 text-pink-700', pct: practiceData.paymentRate },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <div className={`px-3 py-2 rounded-xl ${step.color} text-center min-w-[90px]`}>
                        <p className="text-xl font-black">{step.value}</p>
                        <p className="text-[10px] font-semibold mt-0.5">{step.label}</p>
                        {step.pct !== null && (
                          <p className="text-[10px] opacity-70">{step.pct}% du précédent</p>
                        )}
                      </div>
                      {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* KPIs détaillés */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Sessions totales</p>
                  <p className="text-3xl font-black text-violet-600">{practiceData.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">{practiceData.completionRate}% complétées</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Inscriptions réelles</p>
                  <p className="text-3xl font-black text-emerald-600">{practiceData.registrations}</p>
                  <p className="text-xs text-muted-foreground">{practiceData.registrationRate}% des clics CTA</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Paiements validés</p>
                  <p className="text-3xl font-black text-pink-600">{practiceData.validatedPayments}</p>
                  <p className="text-xs text-muted-foreground">{practiceData.paymentRate}% des inscrits</p>
                </div>
              </div>

              {/* Entonnoir global Free Pratique */}
              {practiceData.globalFunnel?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="font-bold">Entonnoir global</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Jusqu'à quelle question vont les visiteurs ?</p>
                  </div>
                  <div className="p-5 space-y-2">
                    {practiceData.globalFunnel.map((f: any, i: number) => {
                      const q1 = practiceData.globalFunnel[0]?.count ?? 1;
                      const pct = q1 > 0 ? Math.round((f.count / q1) * 100) : 0;
                      const dropped = i > 0 ? practiceData.globalFunnel[i - 1].count - f.count : 0;
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
                          {dropped > 0 && <span className="text-xs text-red-500 flex-shrink-0 w-20 text-right">-{dropped} ici</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stats par thème + abandon par question */}
              {practiceData.byTheme?.length > 0 ? (
                <div className="space-y-4">
                  {practiceData.byTheme.map((t: any) => (
                    <div key={t.themeName} className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-violet-500" />
                          <h3 className="font-bold text-base">{t.themeName}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge value={t.totalSessions} label="sessions" color="#6366f1" />
                          <Badge value={`${t.successRate}%`} label="réussite" color="#10b981" />
                          <Badge value={`${t.completionRate}%`} label="complétion" color={t.completionRate >= 50 ? '#10b981' : t.completionRate >= 25 ? '#f59e0b' : '#ef4444'} />
                          <Badge value={`${t.ctaClicks}`} label={`CTA (${t.conversionRate}%)`} color="#ec4899" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-border">
                        <div className="p-5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Entonnoir</p>
                          <div className="space-y-1.5">
                            {t.questionFunnel?.map((f: any, i: number) => {
                              const base = t.questionFunnel[0].count;
                              const pct = base > 0 ? Math.round((f.count / base) * 100) : 0;
                              const dropped = i > 0 ? t.questionFunnel[i - 1].count - f.count : 0;
                              const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
                              return (
                                <div key={f.q} className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">Q{f.q}</span>
                                  <div className="flex-1 h-5 bg-secondary rounded overflow-hidden relative">
                                    <div className="h-full rounded transition-all duration-300" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
                                  </div>
                                  <span className="text-xs font-bold w-8 flex-shrink-0" style={{ color }}>{pct}%</span>
                                  {dropped > 0 && <span className="text-[10px] text-red-500 w-12 flex-shrink-0">-{dropped}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="p-5 space-y-5">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Langue</p>
                            <div className="space-y-2">
                              {[{ flag: '🇫🇷', label: 'Français', count: t.langSplit.fr }, { flag: '🇲🇷', label: 'Arabe', count: t.langSplit.ar }].map((l) => {
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
                          {(() => {
                            const biggestDrop = t.questionFunnel?.reduce((acc: any, f: any, i: number) => {
                              if (i === 0) return acc;
                              const dropped = t.questionFunnel[i - 1].count - f.count;
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

                      {/* Sous-thèmes de ce thème */}
                      {t.subThemes?.length > 0 && (
                        <div className="border-t border-border px-5 py-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sous-thèmes</p>
                          <div className="space-y-2">
                            {t.subThemes.map((st: any) => (
                              <div key={st.subThemeName} className="flex items-center gap-3 bg-secondary/40 rounded-xl px-3 py-2">
                                <span className="flex-1 text-sm font-medium truncate">{st.subThemeName}</span>
                                <span className="text-xs font-bold text-violet-600 w-14 text-right flex-shrink-0">{st.totalSessions} sess.</span>
                                <span className="text-xs font-semibold w-12 text-right flex-shrink-0"
                                  style={{ color: st.successRate >= 60 ? '#10b981' : st.successRate >= 40 ? '#f59e0b' : '#ef4444' }}>
                                  {st.successRate}% ✓
                                </span>
                                {st.questionFunnel?.length > 0 && (
                                  <div className="flex items-end gap-0.5 flex-shrink-0" style={{ width: 48, height: 20 }}>
                                    {st.questionFunnel.map((f: any) => {
                                      const pct = st.questionFunnel[0].count > 0 ? (f.count / st.questionFunnel[0].count) * 100 : 0;
                                      return (
                                        <div key={f.q} className="flex-1 rounded-t"
                                          style={{ height: `${Math.max(10, pct)}%`, background: pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444' }} />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune session trackée sur les 30 derniers jours.</p>
                </div>
              )}

              {/* Leads WhatsApp */}
              {practiceData.waLeads?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center gap-2">
                    <span className="text-green-500 text-lg">💬</span>
                    <p className="font-semibold text-sm">Leads WhatsApp ({practiceData.waLeads.length})</p>
                  </div>
                  <div className="divide-y divide-border max-h-64 overflow-y-auto">
                    {practiceData.waLeads.map((l: any, i: number) => (
                      <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                        <span className="font-mono font-semibold text-foreground" dir="ltr">{l.phone}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">{l.theme}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(l.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* UTM source */}
              {practiceData.utmStats?.filter((u: any) => u.source !== 'direct' && u.count > 0).length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Source de trafic (inscrits, 30j)</p>
                  <div className="space-y-2">
                    {practiceData.utmStats.map((u: any) => {
                      const total = practiceData.utmStats.reduce((s: number, x: any) => s + x.count, 0);
                      const pct = total > 0 ? Math.round((u.count / total) * 100) : 0;
                      return (
                        <div key={u.source} className="flex items-center gap-3">
                          <span className="text-xs font-semibold w-24 truncate text-foreground">{u.source}</span>
                          <div className="flex-1 bg-secondary rounded-full h-2">
                            <div className="h-2 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-14 text-right">{u.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lien vers la page */}
              <div className="flex justify-end">
                <a href="/free-practice" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition">
                  Voir la page <Globe className="w-4 h-4" />
                </a>
              </div>
            </>
          )}
          {!practiceLoading && !practiceData && (
            <p className="text-center text-muted-foreground py-12">Erreur de chargement.</p>
          )}
        </div>
      )}

      {/* ── Contenu Sage-femme ── */}
      {tab === 'sage-femme' && (
        <div className="space-y-6">
          {/* Filtres dates */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Du</label>
              <input type="date" value={sfStart} max={sfEnd}
                onChange={(e) => setSfStart(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-secondary text-sm font-medium focus:outline-none focus:border-pink-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Au</label>
              <input type="date" value={sfEnd} min={sfStart} max={today}
                onChange={(e) => setSfEnd(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-secondary text-sm font-medium focus:outline-none focus:border-pink-400" />
            </div>
            <div className="flex gap-2">
              {[7, 14, 30].map((n) => (
                <button key={n} onClick={() => { setSfStart(daysAgo(n - 1)); setSfEnd(today); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${sfStart === daysAgo(n - 1) && sfEnd === today ? 'bg-pink-600 text-white border-pink-600' : 'border-border text-muted-foreground hover:text-foreground hover:border-pink-400'}`}>
                  {n}j
                </button>
              ))}
            </div>
            <button onClick={loadSf}
              className="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold hover:bg-pink-700 transition">
              Appliquer
            </button>
          </div>

          {sfLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!sfLoading && sfData && (() => {
            const sfTheme = sfData.byTheme?.[0];
            return (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Sessions', value: sfData.totalSessions, color: 'text-pink-600', bg: 'bg-pink-50' },
                    { label: 'Complétées (40 Q)', value: sfTheme ? Math.round(sfData.totalSessions * sfData.completionRate / 100) : 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Taux complétion', value: `${sfData.completionRate}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Taux réussite', value: sfTheme ? `${sfTheme.successRate}%` : '—', color: 'text-violet-600', bg: 'bg-violet-50' },
                  ].map((k) => (
                    <div key={k.label} className={`${k.bg} border border-border rounded-2xl p-4 space-y-1`}>
                      <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
                      <p className="text-xs text-muted-foreground font-semibold">{k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Langue */}
                {sfTheme && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">Répartition par langue</p>
                    <div className="space-y-3">
                      {[{ flag: '🇫🇷', label: 'Français', count: sfTheme.langSplit.fr }, { flag: '🇲🇷', label: 'Arabe', count: sfTheme.langSplit.ar }].map((l) => {
                        const pct = sfData.totalSessions > 0 ? Math.round((l.count / sfData.totalSessions) * 100) : 0;
                        return (
                          <div key={l.label} className="flex items-center gap-3">
                            <span className="text-xl">{l.flag}</span>
                            <div className="flex-1 h-5 bg-secondary rounded-lg overflow-hidden">
                              <div className="h-full rounded-lg bg-pink-500/70 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm font-bold w-24 text-right">{l.count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Entonnoir Q1→Q40 */}
                {sfTheme?.questionFunnel?.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                      <h2 className="font-bold">Entonnoir — jusqu'où vont-ils ?</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Session fixe de 40 questions</p>
                    </div>
                    <div className="p-5 space-y-1.5 max-h-96 overflow-y-auto">
                      {sfTheme.questionFunnel.map((f: any, i: number) => {
                        const base = sfTheme.questionFunnel[0].count;
                        const pct = base > 0 ? Math.round((f.count / base) * 100) : 0;
                        const dropped = i > 0 ? sfTheme.questionFunnel[i - 1].count - f.count : 0;
                        const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
                        return (
                          <div key={f.q} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">Q{f.q}</span>
                            <div className="flex-1 h-5 bg-secondary rounded overflow-hidden relative">
                              <div className="h-full rounded transition-all duration-300" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
                            </div>
                            <span className="text-xs font-bold w-8 flex-shrink-0" style={{ color }}>{pct}%</span>
                            {dropped > 0 && <span className="text-[10px] text-red-500 w-12 flex-shrink-0">-{dropped}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stats journalières */}
                {sfData.dailyStats?.length > 0 && (() => {
                  const maxS = Math.max(...sfData.dailyStats.map((d: any) => d.sessions), 1);
                  return (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-border">
                        <h2 className="font-bold">Sessions journalières</h2>
                      </div>
                      <div className="p-5">
                        <div className="flex items-end gap-1.5" style={{ height: '100px' }}>
                          {sfData.dailyStats.map((d: any) => {
                            const h = Math.round((d.sessions / maxS) * 100);
                            return (
                              <div key={d.date} className="flex flex-col items-center flex-1 min-w-[28px] group h-full">
                                <div className="flex-1 flex items-end w-full">
                                  <div className="w-full bg-pink-500 rounded-t hover:bg-pink-600 transition-all cursor-pointer"
                                    style={{ height: `${Math.max(h, 2)}%` }} title={`${d.date}: ${d.sessions}`} />
                                </div>
                                <span className="text-[8px] text-muted-foreground mt-1 whitespace-nowrap">{fmtDay(d.date)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end">
                  <a href="/free-practice?target=SAGE_FEMME" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700 transition">
                    Voir la page 👶 <Globe className="w-4 h-4" />
                  </a>
                </div>
              </>
            );
          })()}

          {!sfLoading && !sfData && (
            <p className="text-center text-muted-foreground py-12">Erreur de chargement.</p>
          )}
          {!sfLoading && sfData && sfData.totalSessions === 0 && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">👶</p>
              <p className="font-semibold text-muted-foreground">Aucune session sage-femme sur cette période.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'trial' && <div className="space-y-6">

      {/* ── Filtres ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground">Du</label>
            <input type="date" value={startDate} max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-secondary text-sm font-medium focus:outline-none focus:border-violet-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground">Au</label>
            <input type="date" value={endDate} min={startDate} max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-secondary text-sm font-medium focus:outline-none focus:border-violet-400" />
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map((n) => (
              <button key={n} onClick={() => { setStartDate(daysAgo(n - 1)); setEndDate(today); }}
                className="px-3 py-2 rounded-xl border border-border bg-secondary text-xs font-semibold hover:border-violet-400 transition">
                {n}j
              </button>
            ))}
          </div>
          <button onClick={() => setCompareMode((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition ${compareMode ? 'border-violet-500 bg-violet-500/10 text-violet-600' : 'border-border bg-secondary hover:border-violet-400'}`}>
            <GitCompare className="w-3.5 h-3.5" />
            Comparer
          </button>
          {loading && <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />}
        </div>

        {compareMode && (
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-border">
            <span className="text-xs font-semibold text-muted-foreground self-center">Période de comparaison :</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Du</label>
              <input type="date" value={compareStart} max={compareEnd}
                onChange={(e) => setCompareStart(e.target.value)}
                className="px-3 py-2 rounded-xl border border-orange-400 bg-orange-500/5 text-sm font-medium focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Au</label>
              <input type="date" value={compareEnd} min={compareStart} max={today}
                onChange={(e) => setCompareEnd(e.target.value)}
                className="px-3 py-2 rounded-xl border border-orange-400 bg-orange-500/5 text-sm font-medium focus:outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users,        label: 'Sessions',      value: totalSessions,        cmp: compareTotalSessions, color: '#6366f1', bg: '#6366f115' },
          { icon: Zap,          label: 'Ont commencé',  value: q1Count,              cmp: compare?.globalFunnel?.[0]?.count ?? 0, color: '#0ea5e9', bg: '#0ea5e915' },
          { icon: Trophy,       label: 'Ont tout fini', value: totalCompleted,       cmp: compare ? compare.globalFunnel?.[compare.globalFunnel.length - 1]?.count ?? 0 : null, color: '#10b981', bg: '#10b98115' },
          { icon: Phone,        label: 'Leads WA',      value: leads?.length ?? 0,   cmp: compare?.leads?.length ?? 0, color: '#22c55e', bg: '#22c55e15' },
        ].map((k) => {
          const diff = compareMode && k.cmp != null ? k.value - k.cmp : null;
          return (
            <div key={k.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
                <k.icon className="w-5 h-5" style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                {compareMode && diff != null && (
                  <p className={`text-xs font-bold mt-0.5 ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {diff > 0 ? `+${diff}` : diff} vs période préc.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Graphique évolution journalière ── */}
      {dailyStats?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-bold">Évolution journalière</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" /> Sessions (période principale)
              </span>
              {compareMode && compareDailyStats.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Sessions (comparaison)
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            <div className="flex gap-2">
              {/* Axe Y */}
              <div className="flex flex-col justify-between items-end pb-6 flex-shrink-0" style={{ height: '160px' }}>
                {[maxSessions, Math.round(maxSessions * 0.5), 0].map((v) => (
                  <span key={v} className="text-[10px] text-muted-foreground font-medium">{v}</span>
                ))}
              </div>
              {/* Barres + axe X */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex items-end gap-1.5" style={{ height: '144px' }}>
                  {dailyStats.map((d: any, i: number) => {
                    const h = Math.round((d.sessions / maxSessions) * 100);
                    const cmpDay = compareDailyStats[i];
                    const cmpH = cmpDay ? Math.round((cmpDay.sessions / maxSessions) * 100) : 0;
                    return (
                      <div key={d.date} className="flex flex-col items-center flex-1 min-w-[36px] group h-full">
                        {/* Valeur au survol */}
                        <div className="h-5 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-violet-600 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                            {d.sessions}{d.leads > 0 ? ` · ${d.leads}💚` : ''}
                          </span>
                        </div>
                        {/* Barres */}
                        <div className="w-full flex items-end gap-0.5 flex-1">
                          <div className="flex-1 bg-violet-500 rounded-t transition-all cursor-pointer hover:bg-violet-600"
                            style={{ height: `${Math.max(h, 2)}%` }} />
                          {compareMode && (
                            <div className="flex-1 bg-orange-400/70 rounded-t transition-all"
                              style={{ height: `${Math.max(cmpH, 2)}%` }} />
                          )}
                        </div>
                        {/* Label date */}
                        <span className="text-[9px] text-muted-foreground mt-1 whitespace-nowrap">{fmtDay(d.date)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Leads WhatsApp ── */}
      {(() => {
        const PAGE = 7;
        const totalLeads = leads?.length ?? 0;
        const totalPages = Math.ceil(totalLeads / PAGE);
        const page = Math.min(leadsPage, Math.max(0, totalPages - 1));
        const pageLeads = (leads ?? []).slice(page * PAGE, page * PAGE + PAGE);
        return (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-500" />
                <h2 className="font-bold">Leads WhatsApp</h2>
              </div>
              <span className="text-2xl font-extrabold text-green-600">{totalLeads}</span>
            </div>
            {totalLeads > 0 ? (
              <>
                <div className="divide-y divide-border">
                  {pageLeads.map((lead: any, i: number) => (
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
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">{page * PAGE + 1}–{Math.min((page + 1) * PAGE, totalLeads)} sur {totalLeads}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setLeadsPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                        className="px-3 py-1 rounded-lg border border-border text-xs font-semibold disabled:opacity-30 hover:border-violet-400 transition">
                        ←
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} onClick={() => setLeadsPage(i)}
                          className={`px-3 py-1 rounded-lg border text-xs font-semibold transition ${i === page ? 'border-violet-500 bg-violet-500/10 text-violet-600' : 'border-border hover:border-violet-400'}`}>
                          {i + 1}
                        </button>
                      ))}
                      <button onClick={() => setLeadsPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                        className="px-3 py-1 rounded-lg border border-border text-xs font-semibold disabled:opacity-30 hover:border-violet-400 transition">
                        →
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-5 py-8 text-center">
                <Phone className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucun numéro collecté sur cette période.</p>
              </div>
            )}
          </div>
        );
      })()}

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
                {dropped > 0 && <span className="text-xs text-red-500 flex-shrink-0 w-20 text-right">-{dropped} ici</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Par thème ── */}
      <div className="space-y-4">
        {byTheme.map((t: any) => (
          <div key={t.theme} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-500" />
                <h3 className="font-bold text-base">{t.theme}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge value={t.totalSessions} label="sessions" color="#6366f1" />
                <Badge value={`${t.avgQuestions} q.`} label="en moy." color="#f59e0b" />
                <Badge value={`${t.successRate}%`} label="réussite" color="#10b981" />
                <Badge value={`${t.completionRate}%`} label="complétion"
                  color={t.completionRate >= 50 ? '#10b981' : t.completionRate >= 25 ? '#f59e0b' : '#ef4444'} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-border">
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
                          <div className="h-full rounded transition-all duration-300" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
                        </div>
                        <span className="text-xs font-bold w-8 flex-shrink-0" style={{ color }}>{pct}%</span>
                        {dropped > 0 && <span className="text-[10px] text-red-500 w-12 flex-shrink-0">-{dropped}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-5 space-y-5">
                {t.sourceSplit?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Source</p>
                    <div className="space-y-2">
                      {t.sourceSplit.map((s: any) => {
                        const pct = t.totalSessions > 0 ? Math.round((s.count / t.totalSessions) * 100) : 0;
                        const srcColor = s.source === 'facebook' ? '#1877f2' : s.source === 'tiktok' ? '#000000'
                          : s.source === 'google' ? '#ea4335' : s.source === 'instagram' ? '#e1306c' : '#6366f1';
                        return (
                          <div key={s.source} className="flex items-center gap-2">
                            <span className="text-xs font-bold w-20 truncate flex-shrink-0" style={{ color: srcColor }}>{s.source}</span>
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
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Langue</p>
                  <div className="space-y-2">
                    {[{ flag: '🇫🇷', label: 'Français', count: t.langSplit.fr }, { flag: '🇲🇷', label: 'Arabe', count: t.langSplit.ar }].map((l) => {
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
            <p className="font-medium">Aucune session sur cette période</p>
          </div>
        )}
      </div>

      </div>}
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

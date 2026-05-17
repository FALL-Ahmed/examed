'use client';
import { useEffect, useState, useCallback } from 'react';
import { examenBlancApi } from '@/lib/api';
import { Trophy, Users, TrendingUp, MapPin, AlertTriangle, Plus, RefreshCw, Eye, CheckCircle, XCircle, Clock, Download, ChevronDown, Pencil } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');
function formatDate(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatTime(sec: number) { const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h}h${pad(m)}` : `${m}min`; }

const defaultForm = { title: 'Examen Blanc National', descriptionFr: '', descriptionAr: '', startsAt: '', endsAt: '', resultsAt: '', totalQ: 80, durationMin: 120 };

export default function AdminExamenBlancPage() {
  const [tab, setTab] = useState<'sessions' | 'create' | 'stats' | 'leads'>('sessions');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLang, setStatsLang] = useState<'fr' | 'ar'>('fr');
  const [form, setForm] = useState(defaultForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [editing, setEditing] = useState<Record<string, any>>({});
  const [expandedEdit, setExpandedEdit] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try { const { data } = await examenBlancApi.adminSessions(); setSessions(data); } catch {}
    setLoading(false);
  }, []);

  const loadLeads = useCallback(async () => {
    try { const { data } = await examenBlancApi.adminParticipants(); setLeads(data); } catch {}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { if (tab === 'leads') loadLeads(); }, [tab, loadLeads]);

  async function loadStats(id: string, lang?: 'fr' | 'ar') {
    setStatsLoading(true); setStats(null);
    try { const { data } = await examenBlancApi.adminGetStats(id, lang); setStats(data); } catch {}
    setStatsLoading(false);
  }

  async function switchStatsLang(lang: 'fr' | 'ar') {
    setStatsLang(lang);
    if (selectedSession) loadStats(selectedSession.id, lang);
  }

  async function handleCreate() {
    setCreateError(''); setCreateSuccess('');
    if (!form.startsAt || !form.endsAt) return setCreateError('Dates de début et fin requises');
    if (new Date(form.endsAt) <= new Date(form.startsAt)) return setCreateError('La date de fin doit être après la date de début');
    setCreating(true);
    try {
      await examenBlancApi.adminCreateSession(form);
      setCreateSuccess(`✅ Session créée avec ${form.totalQ} questions sélectionnées automatiquement`);
      setForm(defaultForm); loadSessions(); setTab('sessions');
    } catch (err: any) { setCreateError(err.response?.data?.message || 'Erreur lors de la création'); }
    setCreating(false);
  }

  async function toggleActive(id: string, current: boolean) {
    try { await examenBlancApi.adminUpdateSession(id, { isActive: !current }); loadSessions(); } catch {}
  }

  async function saveEdit(id: string) {
    const data = editing[id]; if (!data) return;
    try { await examenBlancApi.adminUpdateSession(id, data); setEditing(e => { const n = { ...e }; delete n[id]; return n; }); loadSessions(); } catch {}
  }

  function exportLeadsCsv() {
    const header = 'Prénom,Nom,Téléphone,Wilaya,Langue,Session,Score,Terminé,Créé le';
    const rows = leads.map(l => `${l.prenom},${l.nom},${l.telephone},${l.ville},${l.lang === 'ar' ? 'AR' : 'FR'},"${l.examenBlanc?.title || ''}",${l.score ?? ''},${l.isCompleted ? 'Oui' : 'Non'},${new Date(l.createdAt).toLocaleDateString('fr-FR')}`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'participants_examen_blanc.csv'; a.click();
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-background text-foreground';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1';

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Examen Blanc</h1>
            <p className="text-xs text-muted-foreground">Gestion des sessions d'examen blanc national</p>
          </div>
        </div>
        <button onClick={loadSessions} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:bg-accent transition">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
        {([
          { id: 'sessions', label: `Sessions (${sessions.length})` },
          { id: 'create',   label: '+ Créer' },
          { id: 'stats',    label: 'Statistiques' },
          { id: 'leads',    label: `Leads (${leads.length || '…'})` },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SESSIONS ── */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune session. Créez la première via l'onglet "+ Créer".</p>
            </div>
          ) : sessions.map(s => {
            const now = new Date();
            const isOpen = new Date(s.startsAt) <= now && now <= new Date(s.endsAt);
            const isClosed = now > new Date(s.endsAt);
            const isResultsReady = now >= new Date(s.resultsAt);
            const ed = editing[s.id];

            const statusColor = !s.isActive ? 'bg-slate-400' : isOpen ? 'bg-emerald-500' : isClosed && isResultsReady ? 'bg-violet-500' : isClosed ? 'bg-amber-500' : 'bg-blue-400';
            const statusLabel = !s.isActive ? 'Inactive' : isOpen ? 'Ouverte' : isClosed && isResultsReady ? 'Résultats dispo' : isClosed ? 'En attente résultats' : 'À venir';
            const isEditing = expandedEdit === s.id;

            return (
              <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">

                {/* Colored top bar by status */}
                <div className={`h-1 w-full ${statusColor}`} />

                <div className="p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
                      <h3 className="font-bold text-foreground truncate">{s.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                        !s.isActive ? 'bg-muted text-muted-foreground' :
                        isOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        isClosed && isResultsReady ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                        isClosed ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>{statusLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => { setSelectedSession(s); setTab('stats'); loadStats(s.id, statsLang); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:bg-accent transition">
                        <Eye className="w-3.5 h-3.5" /> Stats
                      </button>
                      <button onClick={() => toggleActive(s.id, s.isActive)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${s.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                        {s.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => setExpandedEdit(isEditing ? null : s.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${isEditing ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                        <Pencil className="w-3.5 h-3.5" />
                        <ChevronDown className={`w-3 h-3 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {(s.descriptionFr || s.descriptionAr) && (
                    <div className="space-y-1">
                      {s.descriptionFr && <p className="text-sm text-muted-foreground leading-relaxed">🇫🇷 {s.descriptionFr}</p>}
                      {s.descriptionAr && <p className="text-sm text-muted-foreground leading-relaxed text-right" dir="rtl">🇲🇷 {s.descriptionAr}</p>}
                    </div>
                  )}

                  {/* Compact metrics row */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Users className="w-3.5 h-3.5 text-violet-500" /> {s.participantCount ?? 0} inscrits
                    </span>
                    <span className="text-muted-foreground">{s.totalQ} questions · {s.durationMin} min</span>
                    <span className="text-muted-foreground">📅 {formatDate(s.startsAt)}</span>
                    <span className="text-muted-foreground">🔒 {formatDate(s.endsAt)}</span>
                    <span className="text-muted-foreground">🏆 {formatDate(s.resultsAt)}</span>
                  </div>

                  {/* Edit panel — collapsible */}
                  {isEditing && (
                    <div className="pt-4 border-t border-border space-y-3">
                      <div>
                        <label className={labelCls}>Titre</label>
                        <input className={inputCls} defaultValue={s.title}
                          onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], title: e.target.value } }))} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Description 🇫🇷</label>
                          <textarea className={inputCls} defaultValue={s.descriptionFr ?? ''}
                            style={{ overflow: 'hidden', resize: 'none' }}
                            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                            onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], descriptionFr: e.target.value } }))} />
                        </div>
                        <div>
                          <label className={labelCls}>Description 🇲🇷</label>
                          <textarea className={inputCls} defaultValue={s.descriptionAr ?? ''} dir="rtl"
                            style={{ overflow: 'hidden', resize: 'none' }}
                            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                            onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], descriptionAr: e.target.value } }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Nb questions</label>
                          <input type="number" min={10} max={200} className={inputCls} defaultValue={s.totalQ}
                            onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], totalQ: Number(e.target.value) } }))} />
                        </div>
                        <div>
                          <label className={labelCls}>Durée (minutes)</label>
                          <input type="number" min={30} max={360} className={inputCls} defaultValue={s.durationMin}
                            onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], durationMin: Number(e.target.value) } }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(['startsAt', 'endsAt', 'resultsAt'] as const).map(field => (
                          <div key={field}>
                            <label className={labelCls}>{field === 'startsAt' ? 'Ouverture' : field === 'endsAt' ? 'Fermeture' : 'Résultats'}</label>
                            <input type="datetime-local" className={inputCls}
                              defaultValue={new Date(s[field]).toISOString().slice(0, 16)}
                              onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], [field]: e.target.value } }))} />
                          </div>
                        ))}
                      </div>
                      {ed && (
                        <button onClick={() => { saveEdit(s.id); setExpandedEdit(null); }}
                          className="px-5 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                          Enregistrer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE ── */}
      {tab === 'create' && (
        <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-500" /> Nouvelle session
          </h2>

          {createError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">{createError}</div>}
          {createSuccess && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm">{createSuccess}</div>}

          <div>
            <label className={labelCls}>Titre</label>
            <input className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Description 🇫🇷 (optionnel)</label>
              <textarea className={inputCls} rows={2} value={form.descriptionFr} onChange={e => setForm(p => ({ ...p, descriptionFr: e.target.value }))} placeholder="Description en français…" />
            </div>
            <div>
              <label className={labelCls}>Description 🇲🇷 (اختياري)</label>
              <textarea className={inputCls} rows={2} value={form.descriptionAr} onChange={e => setForm(p => ({ ...p, descriptionAr: e.target.value }))} placeholder="وصف بالعربية…" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ouverture <span className="text-red-400">*</span></label>
              <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={e => setForm(p => ({ ...p, startsAt: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Fermeture <span className="text-red-400">*</span></label>
              <input type="datetime-local" className={inputCls} value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Révélation résultats (vide = fermeture + 24h)</label>
            <input type="datetime-local" className={inputCls} value={form.resultsAt} onChange={e => setForm(p => ({ ...p, resultsAt: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre de questions</label>
              <input type="number" min={10} max={200} className={inputCls} value={form.totalQ} onChange={e => setForm(p => ({ ...p, totalQ: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={labelCls}>Durée (minutes)</label>
              <input type="number" min={30} max={360} className={inputCls} value={form.durationMin} onChange={e => setForm(p => ({ ...p, durationMin: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 text-sm text-violet-700 dark:text-violet-300">
            <p className="font-semibold mb-1">🧠 Sélection automatique</p>
            <p className="text-xs opacity-80">Les {form.totalQ} questions sont choisies automatiquement : 1 question minimum par sous-thème, uniquement les questions avec commentaire, puis complétées aléatoirement.</p>
          </div>

          <button onClick={handleCreate} disabled={creating}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {creating
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération en cours…</>
              : '🚀 Créer la session'}
          </button>
        </div>
      )}

      {/* ── STATS ── */}
      {tab === 'stats' && (
        <div className="space-y-6">
          {!selectedSession && !statsLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Cliquez sur "Stats" depuis une session pour voir ses statistiques.</p>
            </div>
          ) : statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-bold text-foreground">{stats.session?.title}</h2>
                {/* Language toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                  {([
                    { lang: 'fr' as const, label: '🇫🇷 Français', count: stats.langCounts?.fr ?? 0 },
                    { lang: 'ar' as const, label: '🇲🇷 Arabe',    count: stats.langCounts?.ar ?? 0 },
                  ]).map(({ lang, label, count }) => (
                    <button key={lang} onClick={() => switchStatsLang(lang)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${statsLang === lang ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {label} <span className="ml-1 opacity-60">({count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total inscrits',       val: stats.stats.total,            color: 'bg-blue-500' },
                  { label: `Terminé (${stats.stats.completionRate}%)`, val: stats.stats.completed, color: 'bg-emerald-500' },
                  { label: 'Score moyen',           val: `${stats.stats.avgScore}%`,   color: 'bg-violet-500' },
                  { label: 'Taux réussite ≥50%',   val: `${stats.stats.passRate}%`,   color: 'bg-amber-500' },
                ].map(({ label, val, color }, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-2xl font-black text-foreground">{val}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {stats.stats.tricherieCount > 0 && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-400 text-sm font-semibold">
                    {stats.stats.tricherieCount} participant(s) détecté(s) pour triche (≥5 changements d'onglet)
                  </p>
                </div>
              )}

              {/* Histogram — vertical, FR+AR combinés */}
              {stats.histogramAll && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-500" /> Distribution des notes
                  </h3>
                  <p className="text-xs text-muted-foreground mb-5">FR + AR combinés — {stats.histogramAll.reduce((s: number, b: any) => s + b.count, 0)} participants</p>
                  {(() => {
                    const maxC = Math.max(...stats.histogramAll.map((b: any) => b.count), 1);
                    const MAX_H = 120;
                    const colors = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#6366f1','#8b5cf6'];
                    return (
                      <div>
                        <div className="flex items-end gap-1.5" style={{ height: MAX_H }}>
                          {stats.histogramAll.map((bar: any, i: number) => {
                            const h = bar.count > 0 ? Math.max(12, Math.round((bar.count / maxC) * MAX_H)) : 3;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                                {bar.count > 0 && <span className="text-[11px] font-bold text-foreground mb-0.5">{bar.count}</span>}
                                <div className="w-full rounded-t-md" style={{ height: h, background: bar.count > 0 ? colors[i] : '#e5e7eb' }} />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          {stats.histogramAll.map((_: any, i: number) => (
                            <div key={i} className="flex-1 text-center">
                              <span className="text-[10px] text-muted-foreground">{i * 10}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* City breakdown */}
              {stats.cityBreakdown?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-violet-500" /> Répartition par wilaya
                  </h3>
                  <div className="space-y-3">
                    {stats.cityBreakdown.map((c: any, i: number) => {
                      const max = stats.cityBreakdown[0]?.count || 1;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-muted-foreground text-sm w-40 flex-shrink-0 truncate">{c.ville}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                          </div>
                          <span className="text-muted-foreground text-sm w-6 text-right">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top participants */}
              {stats.topParticipants?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">🏆 Top participants</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {['#', 'Nom', 'Wilaya', 'Téléphone', 'Score', 'Temps', 'Triche'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topParticipants.map((p: any) => (
                          <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                            <td className="px-4 py-2.5 font-bold text-muted-foreground">{p.rank}</td>
                            <td className="px-4 py-2.5 font-semibold text-foreground">{p.prenom} {p.nom}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{p.ville}</td>
                            <td className="px-4 py-2.5 text-muted-foreground font-mono">{p.telephone}</td>
                            <td className="px-4 py-2.5 font-bold text-violet-600">{p.score?.toFixed(1)}%</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{formatTime(p.timeTaken || 0)}</td>
                            <td className="px-4 py-2.5">
                              {p.tricherie
                                ? <span className="flex items-center gap-1 text-red-500 text-xs"><AlertTriangle className="w-3 h-3" />{p.tabSwitches}</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── LEADS ── */}
      {tab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-500" /> Tous les participants ({leads.length})
            </h2>
            <button onClick={exportLeadsCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white hover:opacity-80 transition"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <Download className="w-4 h-4" /> Exporter CSV
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    {['Prénom', 'Nom', 'Téléphone', 'Wilaya', 'Langue', 'Session', 'Score', 'Terminé', 'Triche', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Aucun participant pour l'instant</td></tr>
                  ) : leads.map((l: any) => (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-semibold text-foreground">{l.prenom}</td>
                      <td className="px-4 py-3 text-foreground">{l.nom}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{l.telephone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.ville}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{l.lang === 'ar' ? '🇲🇷 AR' : '🇫🇷 FR'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[120px] truncate">{l.examenBlanc?.title}</td>
                      <td className="px-4 py-3 font-bold text-violet-600">{l.score != null ? `${l.score.toFixed(1)}%` : '—'}</td>
                      <td className="px-4 py-3">
                        {l.isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3">
                        {l.tricherie ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(l.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

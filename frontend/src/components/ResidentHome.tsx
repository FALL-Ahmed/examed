'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Loader2, Play, RefreshCw, TrendingUp, Timer, BookOpen } from 'lucide-react';
import { themesApi, attemptsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Écran d'accueil des résidents (style « banque de questions ») :
 * on coche un ou plusieurs chapitres, on choisit le mode et le nombre de questions, puis on lance la série.
 */
type Sub = { id: string; name: string; order: number; _count?: { questions: number } };
type Theme = { id: string; name: string; order: number; subThemes: Sub[] };
type Stat = { attempted: number; correct: number };

const SEL_KEY = 'res_home_selection';
const COUNTS = [10, 20, 30, 50, 100];

/** Case à cocher avec état « partiel » */
function Check({ checked, partial, onChange, label }: { checked: boolean; partial?: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={partial ? 'mixed' : checked} aria-label={label} onClick={onChange}
      className={`w-[18px] h-[18px] flex-shrink-0 rounded border-2 flex items-center justify-center transition
        ${checked || partial ? 'bg-sky-600 border-sky-600' : 'bg-white border-gray-300 hover:border-sky-400'}`}>
      {checked && <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {!checked && partial && <span className="w-2 h-0.5 bg-white rounded" />}
    </button>
  );
}

/** Pastille « fait X sur Y » */
const Count = ({ done, total }: { done: number; total: number }) => (
  <span className="flex-shrink-0 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{done} sur {total}</span>
);

export function ResidentHome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'standard' | 'timed'>('standard');
  const [source, setSource] = useState<'new' | 'all'>('new');
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(30);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([themesApi.all('fr'), attemptsApi.subThemeStats().catch(() => ({ data: [] }))])
      .then(([t, s]) => {
        const sorted: Theme[] = [...t.data].sort((a: Theme, b: Theme) => a.order - b.order)
          .map((th: Theme) => ({ ...th, subThemes: [...th.subThemes].sort((a, b) => a.order - b.order) }));
        setThemes(sorted);
        setStats(Object.fromEntries((s.data as any[]).map((r) => [r.subThemeId, { attempted: r.attempted, correct: r.correct }])));
        // Sélection mémorisée (confort) ; sinon tout est coché
        let saved: string[] | null = null;
        try { saved = JSON.parse(localStorage.getItem(SEL_KEY) || 'null'); } catch {}
        const allIds = sorted.flatMap((th) => th.subThemes.map((s) => s.id));
        const valid = (saved ?? []).filter((id) => allIds.includes(id));
        setSelected(new Set(valid.length ? valid : allIds));
      })
      .catch(() => setError('Impossible de charger les chapitres.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    try { localStorage.setItem(SEL_KEY, JSON.stringify([...selected])); } catch {}
  }, [selected, loading]);

  const allSubs = useMemo(() => themes.flatMap((t) => t.subThemes), [themes]);
  const total = (s: Sub) => s._count?.questions ?? 0;
  const done = (s: Sub) => Math.min(stats[s.id]?.attempted ?? 0, total(s));
  const sumTotal = (subs: Sub[]) => subs.reduce((a, s) => a + total(s), 0);
  const sumDone = (subs: Sub[]) => subs.reduce((a, s) => a + done(s), 0);

  const chosen = allSubs.filter((s) => selected.has(s.id));
  const found = source === 'new' ? sumTotal(chosen) - sumDone(chosen) : sumTotal(chosen);
  const effectiveCount = Math.min(count, found);

  function toggle(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function start() {
    if (!effectiveCount || starting) return;
    setStarting(true); setError('');
    try {
      const base = { subThemeIds: [...selected], count: effectiveCount, language: 'FR', excludeAnswered: source === 'new' };
      if (mode === 'standard') {
        const { data } = await attemptsApi.start({ mode: 'PRACTICE', ...base });
        localStorage.setItem('practice_state', JSON.stringify({ session: data, currentIndex: 0, answers: Array(data.questions.length).fill(null) }));
        router.push('/practice');
      } else {
        const { data } = await attemptsApi.start({ mode: 'EXAM', ...base, durationMinutes: minutes });
        localStorage.setItem('exam_state', JSON.stringify({ attemptId: data.attemptId, session: data, answers: {}, marked: {}, currentIndex: 0, remainingSeconds: data.timeLimit ?? null, savedAt: Date.now() }));
        router.push(`/exam/${data.attemptId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message === 'Aucune question disponible'
        ? 'Aucune question disponible avec ces critères. Cochez d’autres chapitres ou choisissez « Toutes les questions ».'
        : err.response?.data?.message || 'Impossible de lancer la série.');
      setStarting(false);
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-sky-600" /></div>;

  const allIds = allSubs.map((s) => s.id);
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someOn = allIds.some((id) => selected.has(id));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Bonjour{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 👋</p>
        <h1 className="text-2xl font-bold">Banque de questions — Résidanat</h1>
      </div>

      {/* Barre de lancement */}
      <div className="sticky top-2 z-20 bg-card border border-border rounded-xl shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary">
          <span className="text-xl font-bold tabular-nums">{found.toLocaleString('fr-FR')}</span>
          <span className="text-sm font-medium">question{found > 1 ? 's' : ''} trouvée{found > 1 ? 's' : ''}</span>
        </div>
        <button onClick={start} disabled={!effectiveCount || starting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Commencer {effectiveCount ? `${effectiveCount} question${effectiveCount > 1 ? 's' : ''}` : ''}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        {/* Chapitres */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <h2 className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">Chapitres</h2>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border">
              <Check checked={allOn} partial={!allOn && someOn} onChange={() => toggle(allIds)} label="Tout" />
              <span className="flex-1 font-semibold">Tout le programme</span>
              <span className="text-[11px] font-semibold text-gray-600">Fait {sumDone(allSubs)} sur {sumTotal(allSubs).toLocaleString('fr-FR')}</span>
            </div>

            {themes.map((th) => {
              const ids = th.subThemes.map((s) => s.id);
              const on = ids.filter((id) => selected.has(id)).length;
              const isOpen = open.has(th.id);
              return (
                <div key={th.id} className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-secondary/60">
                    <Check checked={on === ids.length} partial={on > 0 && on < ids.length} onChange={() => toggle(ids)} label={th.name} />
                    <button type="button" onClick={() => setOpen((p) => { const n = new Set(p); n.has(th.id) ? n.delete(th.id) : n.add(th.id); return n; })}
                      className="flex-1 flex items-center gap-2 text-left min-w-0">
                      {isOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />}
                      <span className="font-semibold truncate">{th.name}</span>
                      <span className="hidden sm:inline text-xs text-muted-foreground flex-shrink-0">· {th.subThemes.length} chapitre{th.subThemes.length > 1 ? "s" : ""}</span>
                    </button>
                    <Count done={sumDone(th.subThemes)} total={sumTotal(th.subThemes)} />
                  </div>
                  {isOpen && (
                    <ul>
                      {th.subThemes.map((s, k) => {
                        const t = total(s), d = done(s), ok = Math.min(stats[s.id]?.correct ?? 0, d);
                        return (
                          <li key={s.id} className="relative flex items-center gap-3 px-3 py-2 border-t border-border/70 hover:bg-secondary/40">
                            {/* Barre de progression discrète : vert = réussies, rouge = ratées */}
                            {t > 0 && d > 0 && (
                              <span className="absolute left-0 top-0 bottom-0 flex pointer-events-none opacity-70" style={{ width: `${(d / t) * 100}%` }}>
                                <span className="h-full bg-emerald-100" style={{ width: `${(ok / d) * 100}%` }} />
                                <span className="h-full bg-red-100 flex-1" />
                              </span>
                            )}
                            <span className="relative w-7 text-[11px] font-bold text-sky-700 tabular-nums">{String(k + 1).padStart(2, '0')}</span>
                            <span className="relative"><Check checked={selected.has(s.id)} onChange={() => toggle([s.id])} label={s.name} /></span>
                            <button type="button" onClick={() => toggle([s.id])} className="relative flex-1 text-left text-sm leading-snug min-w-0">{s.name}</button>
                            <span className="relative"><Count done={d} total={t} /></span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Réglages de la série */}
        <aside className="order-first lg:order-none bg-card border border-border rounded-xl overflow-hidden lg:sticky lg:top-24">
          <h2 className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">Mode de la série</h2>
          <div className="p-4 space-y-5">
            <div className="grid grid-cols-2 rounded-lg border border-sky-600 overflow-hidden text-sm font-medium">
              {([['standard', 'Entraînement', BookOpen], ['timed', 'Examen chronométré', Timer]] as const).map(([v, l, Icon]) => (
                <button key={v} type="button" onClick={() => setMode(v)}
                  className={`flex items-center justify-center gap-1.5 py-2 transition ${mode === v ? 'bg-sky-600 text-white' : 'text-sky-700 hover:bg-sky-50'}`}>
                  <Icon className="w-4 h-4" /> {l}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              {mode === 'standard' ? 'Correction et explication immédiates après chaque question.' : 'Toutes les questions d’abord, correction à la fin, comme le jour du concours.'}
            </p>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Questions</p>
              <select value={source} onChange={(e) => setSource(e.target.value as 'new' | 'all')}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30">
                <option value="new">Nouvelles questions uniquement</option>
                <option value="all">Toutes les questions</option>
              </select>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Nombre de questions</p>
              <div className="flex flex-wrap gap-2">
                {COUNTS.map((n) => (
                  <button key={n} type="button" onClick={() => { setCount(n); setMinutes(Math.max(10, Math.round(n * 1.5))); }}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${count === n ? 'bg-sky-600 border-sky-600 text-white' : 'border-border hover:border-sky-400'}`}>{n}</button>
                ))}
              </div>
              {found > 0 && found < count && <p className="text-xs text-amber-700 mt-2">Seulement {found} question{found > 1 ? 's' : ''} disponible{found > 1 ? 's' : ''} avec cette sélection.</p>}
            </div>

            {mode === 'timed' && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Durée</p>
                <select value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30">
                  {[...new Set([10, 15, 20, 30, 45, 60, 75, 90, 120, 150, minutes])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} minutes</option>)}
                </select>
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-2 text-sm">
              <Link href="/review" className="flex items-center gap-2 text-amber-700 hover:underline"><RefreshCw className="w-4 h-4" /> Revoir mes erreurs</Link>
              <Link href="/stats" className="flex items-center gap-2 text-sky-700 hover:underline"><TrendingUp className="w-4 h-4" /> Mes statistiques</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

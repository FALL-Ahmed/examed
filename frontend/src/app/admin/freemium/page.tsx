'use client';
import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { FreemiumStats } from './_stats';
import { Gift, Loader2, ChevronDown, ChevronRight, BarChart3, Save } from 'lucide-react';

const TARGETS = [
  { value: 'INFIRMIER', label: 'Infirmier' },
  { value: 'SAGE_FEMME', label: 'Sage-femme' },
  { value: 'BIOLOGISTE', label: 'Biologiste' },
];
const LANGS = [
  { value: 'FR', label: '🇫🇷 Français' },
  { value: 'AR', label: '🇸🇦 Arabe' },
];

const PROFESSION_LABEL: Record<string, string> = {
  etudiant_infirmier: 'Infirmier', etudiant_infirmier_3eme: 'Infirmier 3e', infirmier_diplome: 'Infirmier',
  sage_femme: 'Sage-femme', biologiste: 'Biologiste',
};

type Sub = { id: string; name: string; isFreemium: boolean; questions: number };
type Theme = { id: string; name: string; language: string; target: string; isPublished: boolean; subThemes: Sub[] };

// Numéro local à 8 chiffres → indicatif Mauritanie (222) pour WhatsApp
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 8 ? `222${digits}` : digits;
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export default function AdminFreemiumPage() {
  const [tab, setTab] = useState<'config' | 'stats'>('config');
  const [loading, setLoading] = useState(true);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ enabled: false, startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [target, setTarget] = useState('INFIRMIER');
  const [lang, setLang] = useState('FR');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());

  function load() {
    return adminApi.freemium().then(({ data }) => {
      setThemes(data.themes);
      setOpen(data.open);
      setForm({
        enabled: data.config.enabled,
        startDate: data.config.startDate ?? '',
        endDate: data.config.endDate ?? '',
      });
    });
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const visible = useMemo(() => themes.filter((t) => t.target === target && t.language === lang), [themes, target, lang]);
  const totals = useMemo(() => {
    let openQ = 0, allQ = 0;
    for (const t of visible) for (const s of t.subThemes) { allQ += s.questions; if (s.isFreemium) openQ += s.questions; }
    return { openQ, allQ };
  }, [visible]);

  async function saveConfig() {
    setMessage(null);
    if (!form.startDate || !form.endDate) return setMessage({ ok: false, text: 'Renseignez les deux dates.' });
    setSaving(true);
    try {
      await adminApi.freemiumUpdateConfig(form);
      await load();
      setMessage({ ok: true, text: 'Campagne enregistrée. Les comptes freemium existants suivent la nouvelle date de fin.' });
    } catch (e: any) {
      setMessage({ ok: false, text: e.response?.data?.message || 'Erreur lors de l’enregistrement' });
    } finally {
      setSaving(false);
    }
  }

  // Ouvre / ferme des sous-thèmes (mise à jour immédiate, annulée en cas d'erreur)
  async function setSubs(ids: string[], value: boolean, key: string) {
    const prev = themes;
    setThemes((ts) => ts.map((t) => ({ ...t, subThemes: t.subThemes.map((s) => (ids.includes(s.id) ? { ...s, isFreemium: value } : s)) })));
    setBusy((b) => new Set(b).add(key));
    try {
      await adminApi.freemiumSetSubThemes(ids, value);
    } catch {
      setThemes(prev);
      setMessage({ ok: false, text: 'Impossible de modifier ce thème.' });
    } finally {
      setBusy((b) => { const n = new Set(b); n.delete(key); return n; });
    }
  }

  const toggleExpand = (id: string) =>
    setExpanded((e) => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const pct = totals.allQ ? Math.round((totals.openQ / totals.allQ) * 100) : 0;
  // Thèmes sans aucun sous-thème ouvert : le compte freemium ne pourrait rien y faire
  const closedThemes = visible.filter((t) => t.subThemes.length && !t.subThemes.some((s) => s.isFreemium));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Gift className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Freemium · essai gratuit</h1>
          <p className="text-sm text-muted-foreground">
            {open
              ? <><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 me-1.5" />Campagne ouverte jusqu’au {fmtDate(form.endDate)}</>
              : <><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50 me-1.5" />Aucune campagne en cours — l’inscription reste payante</>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 border border-border rounded-xl p-1 w-fit">
        {([['config', 'Campagne & contenu', Gift], ['stats', 'Statistiques & élèves', BarChart3]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === id ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${message.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
          {message.text}
        </div>
      )}

      {tab === 'config' ? (
        <>
          {/* Campagne */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">Campagne</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pendant ces dates, l’option « Essai gratuit » apparaît à l’inscription. À la fin, les comptes freemium repassent en attente de paiement.
                </p>
              </div>
              <button onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))} aria-label="Activer la campagne"
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.enabled ? 'bg-emerald-500' : 'bg-secondary border border-border'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <label className="text-xs font-semibold text-muted-foreground space-y-1.5">
                <span>Date de début</span>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </label>
              <label className="text-xs font-semibold text-muted-foreground space-y-1.5">
                <span>Date de fin (incluse)</span>
                <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </label>
              <button onClick={saveConfig} disabled={saving}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 transition disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
              </button>
            </div>
          </div>

          {/* Contenu ouvert */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-sm">Contenu ouvert en freemium</p>
                <p className="text-xs text-muted-foreground mt-0.5">Le compte freemium voit tous les thèmes. Cochez les sous-thèmes ouverts : les autres s’affichent grisés et proposent de passer Premium. Chaque modification est enregistrée immédiatement.</p>
              </div>
              <div className="flex gap-2">
                <select value={target} onChange={(e) => setTarget(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select value={lang} onChange={(e) => setLang(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {/* Compteur */}
            <div className="rounded-xl bg-secondary/50 border border-border p-4">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="text-sm">
                  <span className="text-2xl font-extrabold tabular-nums">{totals.openQ.toLocaleString('fr-FR')}</span>
                  <span className="text-muted-foreground"> questions ouvertes sur {totals.allQ.toLocaleString('fr-FR')}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {(totals.allQ - totals.openQ).toLocaleString('fr-FR')} verrouillées (grisées) · {pct} % ouvert
                </p>
              </div>
              <div className="h-2 bg-secondary rounded-full mt-3 overflow-hidden">
                <div className="h-2 rounded-full transition-all bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              {closedThemes.length > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {closedThemes.length} thème{closedThemes.length > 1 ? 's' : ''} sans aucun sous-thème ouvert : l’élève les voit, mais tous leurs sous-thèmes sont grisés.
                  </p>
                  <button onClick={() => setSubs(closedThemes.map((t) => t.subThemes[0].id), true, 'open-first')}
                    disabled={busy.has('open-first')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition disabled:opacity-50">
                    Ouvrir le 1er sous-thème de chacun
                  </button>
                </div>
              )}
            </div>

            {/* Thèmes */}
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun thème pour cette profession et cette langue.</p>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {visible.map((t) => {
                  const openSubs = t.subThemes.filter((s) => s.isFreemium);
                  const all = t.subThemes.length > 0 && openSubs.length === t.subThemes.length;
                  const some = openSubs.length > 0 && !all;
                  const themeQ = t.subThemes.reduce((n, s) => n + s.questions, 0);
                  const openQ = openSubs.reduce((n, s) => n + s.questions, 0);
                  const isOpen = expanded.has(t.id);
                  return (
                    <div key={t.id}>
                      <div className="flex items-center gap-3 px-4 py-3 bg-background">
                        <input type="checkbox" checked={all} disabled={busy.has(t.id) || !t.subThemes.length}
                          ref={(el) => { if (el) el.indeterminate = some; }}
                          onChange={() => setSubs(t.subThemes.map((s) => s.id), !all, t.id)}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer" aria-label={`Ouvrir ${t.name}`} />
                        <button onClick={() => toggleExpand(t.id)} className="flex-1 min-w-0 flex items-center gap-2 text-start">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 rtl:rotate-180" />}
                          <span className="text-sm font-semibold truncate">{t.name}</span>
                          {!t.isPublished && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground flex-shrink-0">non publié</span>}
                        </button>
                        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                          {openQ > 0 ? <strong className="text-emerald-600">{openQ}</strong> : 0} / {themeQ} Q
                        </span>
                        {busy.has(t.id) && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                      </div>
                      {isOpen && (
                        <div className="bg-secondary/30 py-1">
                          {t.subThemes.map((s) => (
                            <label key={s.id} className="flex items-center gap-3 ps-11 pe-4 py-2 cursor-pointer hover:bg-secondary/60">
                              <input type="checkbox" checked={s.isFreemium} disabled={busy.has(s.id)}
                                onChange={() => setSubs([s.id], !s.isFreemium, s.id)}
                                className="w-4 h-4 accent-emerald-600" />
                              <span className="flex-1 text-sm truncate">{s.name}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">{s.questions} Q</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <FreemiumStats />
      )}
    </div>
  );
}

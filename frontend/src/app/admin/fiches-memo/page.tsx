'use client';
import { useEffect, useRef, useState } from 'react';
import { adminApi, settingsApi } from '@/lib/api';
import { FileText, Upload, Trash2, Plus, Loader2, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';

const TARGETS = [
  { value: 'ALL',        label: 'Toutes professions' },
  { value: 'INFIRMIER',  label: 'Infirmier' },
  { value: 'SAGE_FEMME', label: 'Sage-femme' },
  { value: 'BIOLOGISTE', label: 'Biologiste' },
];

const LANGS = [
  { value: 'FR', label: '🇫🇷 Français' },
  { value: 'AR', label: '🇸🇦 Arabe' },
];

const FILTER_TARGETS = [
  { value: 'ALL_FILTER', label: 'Tous' },
  ...TARGETS,
];

export default function FichesMemoPage() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('ALL');
  const [lang, setLang] = useState('FR');
  const [file, setFile] = useState<File | null>(null);
  const showLang = (t: string) => t === 'INFIRMIER' || t === 'SAGE_FEMME' || t === 'ALL';
  const [error, setError] = useState('');
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [togglingMenu, setTogglingMenu] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; target: string; lang: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterTarget, setFilterTarget] = useState('ALL_FILTER');
  const [filterLang, setFilterLang] = useState('ALL');
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    adminApi.fichesMemo().then(r => setFiches(r.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    settingsApi.features().then(r => setMenuEnabled(r.data.fichesMemoEnabled)).catch(() => {});
  }, []);

  async function toggleMenu() {
    setTogglingMenu(true);
    const next = !menuEnabled;
    try {
      await adminApi.setSetting('FICHES_MEMO_ENABLED', String(next));
      setMenuEnabled(next);
    } catch {} finally { setTogglingMenu(false); }
  }

  async function handleUpload() {
    if (!file || !title.trim()) { setError('Titre et fichier requis'); return; }
    setError('');
    setUploading(true);
    try {
      await adminApi.createFicheMemo(file, title.trim(), target, lang);
      setTitle(''); setFile(null); setTarget('ALL'); setLang('FR');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  }

  async function handleToggle(id: string) {
    const updated = await adminApi.toggleFicheVisibility(id).then(r => r.data).catch(() => null);
    if (updated) setFiches(f => f.map(x => x.id === id ? { ...x, isVisible: updated.isVisible } : x));
  }

  async function handleEdit() {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const updated = await adminApi.updateFicheMemo(editing.id, { title: editing.title, target: editing.target, lang: editing.lang }).then(r => r.data);
      setFiches(f => f.map(x => x.id === editing.id ? { ...x, ...updated } : x));
      setEditing(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette fiche ?')) return;
    await adminApi.deleteFicheMemo(id).catch(() => {});
    setFiches(f => f.filter(x => x.id !== id));
  }

  const filtered = fiches.filter(f => {
    const matchTarget = filterTarget === 'ALL_FILTER' || f.target === filterTarget;
    const matchLang = filterLang === 'ALL' || f.lang === filterLang;
    return matchTarget && matchLang;
  });

  return (
    <div className="space-y-6">
      {/* Header + switch */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Fiches Mémo</h1>
            <p className="text-sm text-muted-foreground">{fiches.length} fiche{fiches.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-2.5">
          <div>
            <p className="text-sm font-semibold">Menu Fiches Mémo</p>
            <p className="text-xs text-muted-foreground">Visible dans la sidebar</p>
          </div>
          <button
            onClick={toggleMenu}
            disabled={togglingMenu}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${menuEnabled ? 'bg-emerald-500' : 'bg-secondary border border-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${menuEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Upload form */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="font-semibold text-sm">Ajouter une fiche</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Titre de la fiche"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={target}
            onChange={e => { setTarget(e.target.value); if (e.target.value === 'BIOLOGISTE') setLang('FR'); }}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {showLang(target) ? (
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          ) : (
            <div className="border border-border rounded-xl px-3 py-2 text-sm bg-secondary text-muted-foreground">🇫🇷 Français uniquement</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:border-primary transition">
            <Upload className="w-4 h-4" />
            {file ? file.name : 'Choisir un fichier (PDF ou image)'}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !title.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary disabled:opacity-50 transition"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Ajouter
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Filtrer :</span>
        <div className="flex gap-1 flex-wrap">
          {FILTER_TARGETS.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterTarget(t.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${filterTarget === t.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/70'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex gap-1">
          {[{ value: 'ALL', label: 'Toutes langues' }, ...LANGS].map(l => (
            <button
              key={l.value}
              onClick={() => setFilterLang(l.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${filterLang === l.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/70'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {(filterTarget !== 'ALL_FILTER' || filterLang !== 'ALL') && (
          <span className="text-xs text-muted-foreground ml-1">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucune fiche pour ce filtre.</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {filtered.map(f => (
            <div key={f.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition ${!f.isVisible ? 'opacity-50' : ''}`}>
              <FileText className="w-5 h-5 text-violet-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{f.title}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${f.lang === 'AR' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}>
                    {f.lang === 'AR' ? 'AR' : 'FR'}
                  </span>
                  {!f.isVisible && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground flex-shrink-0">Masqué</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {TARGETS.find(t => t.value === f.target)?.label ?? f.target} · {new Date(f.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button onClick={() => setEditing({ id: f.id, title: f.title, target: f.target, lang: f.lang ?? 'FR' })} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition flex-shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleToggle(f.id)} className={`p-1.5 rounded-lg transition flex-shrink-0 ${f.isVisible ? 'text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30' : 'text-muted-foreground hover:bg-secondary'}`}>
                {f.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modale édition */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-md space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-base">Modifier la fiche</p>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={editing.title}
              onChange={e => setEditing(ed => ed ? { ...ed, title: e.target.value } : ed)}
              placeholder="Titre"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={editing.target}
                onChange={e => setEditing(ed => ed ? { ...ed, target: e.target.value, lang: e.target.value === 'BIOLOGISTE' ? 'FR' : ed.lang } : ed)}
                className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {showLang(editing.target) ? (
                <select
                  value={editing.lang}
                  onChange={e => setEditing(ed => ed ? { ...ed, lang: e.target.value } : ed)}
                  className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              ) : (
                <div className="border border-border rounded-xl px-3 py-2 text-sm bg-secondary text-muted-foreground">🇫🇷 Français uniquement</div>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-secondary transition">
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={saving || !editing.title.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-primary disabled:opacity-50 transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

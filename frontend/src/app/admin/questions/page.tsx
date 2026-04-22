'use client';
import { useEffect, useRef, useState } from 'react';
import { adminApi, themesApi } from '@/lib/api';
import { resolveImageUrl } from '@/lib/utils';
import {
  Search, Edit2, Trash2, Save, X, Loader2, Eye, Lightbulb,
  AlertTriangle, ImagePlus, Image, ChevronDown, ChevronRight,
  BookOpen, Layers, Hash,
} from 'lucide-react';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
const BADGE_COLORS: Record<string, string> = {
  A: 'bg-violet-100 text-violet-700 border-violet-200',
  B: 'bg-sky-100 text-sky-700 border-sky-200',
  C: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  D: 'bg-amber-100 text-amber-700 border-amber-200',
  E: 'bg-rose-100 text-rose-700 border-rose-200',
};

function InspectModal({ q, onClose }: { q: any; onClose: () => void }) {
  const correct = q.correctAnswer?.split(',').map((s: string) => s.trim()) ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs text-slate-400">{q.subTheme?.theme?.name} › {q.subTheme?.name}</p>
            <p className="font-semibold text-slate-800 text-sm mt-0.5">Aperçu de la question</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {q.imageUrl && (
            <img src={resolveImageUrl(q.imageUrl)} alt="Question" className="w-full rounded-xl object-contain max-h-48 border border-slate-100" />
          )}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Question</p>
            <p className="text-slate-800 font-medium leading-relaxed">{q.text}</p>
          </div>
          <div className="space-y-2">
            {LETTERS.filter(l => q[`choice${l}`]?.trim()).map((l) => {
              const isCorrect = correct.includes(l);
              return (
                <div key={l} className={`flex items-start gap-3 p-3 rounded-xl border-2 ${isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border ${isCorrect ? 'bg-emerald-500 text-white border-emerald-500' : BADGE_COLORS[l]}`}>
                    {l}
                  </span>
                  <p className={`text-sm leading-relaxed ${isCorrect ? 'font-semibold text-emerald-800' : 'text-slate-700'}`}>
                    {q[`choice${l}`]}{isCorrect && <span className="ml-2 text-xs text-emerald-500">✓</span>}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Réponse :</span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">{q.correctAnswer}</span>
          </div>
          {q.explanation?.trim() && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Commentaire</p>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">{q.explanation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditForm({ editing, setEditing, onSave, saving, onImageUpload, uploadingImage, imageInputRef }: any) {
  return (
    <div className="space-y-3 p-5">
      <textarea
        value={editing.text}
        onChange={(e) => setEditing({ ...editing, text: e.target.value })}
        rows={3}
        placeholder="Texte de la question"
        className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="grid grid-cols-2 gap-2">
        {LETTERS.map((l) => (
          <div key={l} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 border ${BADGE_COLORS[l]}`}>{l}</span>
            <input
              value={editing[`choice${l}`] || ''}
              onChange={(e) => setEditing({ ...editing, [`choice${l}`]: e.target.value })}
              className="flex-1 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={l === 'E' ? 'Optionnel' : ''}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Réponse(s) :</span>
        <input
          value={editing.correctAnswer}
          onChange={(e) => setEditing({ ...editing, correctAnswer: e.target.value.toUpperCase() })}
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-28 font-mono"
          placeholder="A ou A,B,C"
        />
      </div>
      <textarea
        value={editing.explanation || ''}
        onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
        rows={2}
        placeholder="Commentaire / Explication (optionnel)"
        className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={editing.imageUrl || ''}
            onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
            placeholder="URL image (optionnel)"
            className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }} />
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
            {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            Upload
          </button>
        </div>
        {editing.imageUrl && (
          <img src={resolveImageUrl(editing.imageUrl)} alt="Aperçu" className="w-full rounded-xl object-contain max-h-36 border border-slate-100" />
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Sauvegarder
        </button>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm hover:bg-slate-50">
          <X className="w-3.5 h-3.5" /> Annuler
        </button>
      </div>
    </div>
  );
}

export default function AdminQuestionsPage() {
  const [langTab, setLangTab] = useState<'FR' | 'AR'>('FR');
  const [themes, setThemes] = useState<any[]>([]);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedSubThemeId, setSelectedSubThemeId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [inspecting, setInspecting] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    themesApi.all(langTab.toLowerCase()).then((r) => {
      setThemes(r.data);
      setSelectedThemeId('');
      setSelectedSubThemeId('');
      setExpandedThemes(r.data.length > 0 ? new Set([r.data[0].id]) : new Set());
    }).catch(() => {});
  }, [langTab]);

  useEffect(() => { setPage(1); }, [selectedThemeId, selectedSubThemeId, search, langTab]);
  useEffect(() => { load(); }, [page, selectedThemeId, selectedSubThemeId, search, langTab]);

  async function load() {
    const params: any = { page, language: langTab };
    if (selectedSubThemeId) params.subThemeId = selectedSubThemeId;
    else if (selectedThemeId) params.themeId = selectedThemeId;
    if (search) params.search = search;
    const { data: d } = await adminApi.questions(params);
    setData(d);
  }

  function selectTheme(themeId: string) {
    setSelectedThemeId(themeId);
    setSelectedSubThemeId('');
    setExpandedThemes((prev) => {
      const next = new Set(prev);
      next.has(themeId) ? next.delete(themeId) : next.add(themeId);
      return next;
    });
  }

  function selectSubTheme(themeId: string, subThemeId: string) {
    setSelectedThemeId(themeId);
    setSelectedSubThemeId(subThemeId);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    await adminApi.updateQuestion(editing.id, {
      text: editing.text, choiceA: editing.choiceA, choiceB: editing.choiceB,
      choiceC: editing.choiceC, choiceD: editing.choiceD, choiceE: editing.choiceE,
      correctAnswer: editing.correctAnswer, explanation: editing.explanation,
      imageUrl: editing.imageUrl || null,
    }).catch(() => {});
    setEditing(null);
    setSaving(false);
    await load();
  }

  async function handleImageUpload(file: File) {
    if (!editing) return;
    setUploadingImage(true);
    try {
      const { data: d } = await adminApi.uploadQuestionImage(editing.id, file);
      setEditing((prev: any) => ({ ...prev, imageUrl: d.imageUrl }));
    } finally {
      setUploadingImage(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette question ?')) return;
    await adminApi.deleteQuestion(id).catch(() => {});
    await load();
  }

  async function deleteAll() {
    if (!confirm(`Supprimer TOUTES les questions (${data?.total ?? 0}) ? Irréversible.`)) return;
    if (!confirm('Confirmation finale ?')) return;
    setDeletingAll(true);
    await adminApi.deleteAllQuestions().catch(() => {});
    setDeletingAll(false);
    await load();
  }

  const activeLabel = selectedSubThemeId
    ? themes.flatMap(t => t.subThemes).find((s: any) => s.id === selectedSubThemeId)?.name
    : selectedThemeId
      ? themes.find(t => t.id === selectedThemeId)?.name
      : 'Toutes les questions';

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Language tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setLangTab('FR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition
            ${langTab === 'FR' ? 'bg-blue-500 border-blue-500 text-white shadow-sm' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
        >
          🇫🇷 Français
        </button>
        <button
          onClick={() => setLangTab('AR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition
            ${langTab === 'AR' ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}
        >
          🇲🇷 العربية
        </button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">

      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 space-y-1">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Thèmes</p>
          </div>
          <div className="py-1 max-h-[calc(100vh-220px)] overflow-y-auto">
            {/* All */}
            <button
              onClick={() => { setSelectedThemeId(''); setSelectedSubThemeId(''); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition text-left
                ${!selectedThemeId ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">Tout</span>
              <span className="text-xs text-slate-400">{themes.reduce((a, t) => a + (t._count?.subThemes ?? 0), 0)}</span>
            </button>

            {themes.map((theme) => (
              <div key={theme.id}>
                <button
                  onClick={() => selectTheme(theme.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition text-left
                    ${selectedThemeId === theme.id && !selectedSubThemeId ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {expandedThemes.has(theme.id)
                    ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />}
                  <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wide">{theme.name}</span>
                </button>

                {expandedThemes.has(theme.id) && theme.subThemes?.map((sub: any) => (
                  <button
                    key={sub.id}
                    onClick={() => selectSubTheme(theme.id, sub.id)}
                    className={`w-full flex items-center gap-2.5 pl-10 pr-4 py-2 text-sm transition text-left
                      ${selectedSubThemeId === sub.id ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Hash className="w-3 h-3 flex-shrink-0 text-slate-300" />
                    <span className="flex-1 truncate text-xs">{sub.name}</span>
                    <span className="text-xs text-slate-300">{sub._count?.questions ?? ''}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold truncate">{activeLabel}</h1>
            {data && <p className="text-sm text-muted-foreground">{data.total} question{data.total > 1 ? 's' : ''}</p>}
          </div>
          {data?.total > 0 && (
            <button onClick={deleteAll} disabled={deletingAll}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50 flex-shrink-0">
              {deletingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Tout supprimer
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une question…"
            className="w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-sm"
          />
        </div>

        {/* Questions */}
        <div className="space-y-2">
          {!data && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {data?.questions?.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">Aucune question trouvée</div>
          )}
          {data?.questions?.map((q: any) => (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {editing?.id === q.id ? (
                <EditForm
                  editing={editing} setEditing={setEditing}
                  onSave={save} saving={saving}
                  onImageUpload={handleImageUpload} uploadingImage={uploadingImage}
                  imageInputRef={imageInputRef}
                />
              ) : (
                <div className="p-4">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs text-slate-400">{q.subTheme?.theme?.name}</span>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="text-xs font-medium text-violet-600">{q.subTheme?.name}</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-snug">{q.text}</p>

                      {/* Choices preview */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {LETTERS.filter(l => q[`choice${l}`]?.trim()).map((l) => {
                          const isCorrect = q.correctAnswer?.split(',').map((s: string) => s.trim()).includes(l);
                          return (
                            <span key={l} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium
                              ${isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                              <span className="font-bold">{l}</span>
                              <span className="font-normal opacity-70">{q[`choice${l}`]?.slice(0, 22)}{q[`choice${l}`]?.length > 22 ? '…' : ''}</span>
                            </span>
                          );
                        })}
                      </div>

                      {/* Badges */}
                      <div className="flex gap-3 mt-2">
                        {q.explanation?.trim() && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Lightbulb className="w-3 h-3" /> Commentaire
                          </span>
                        )}
                        {q.imageUrl && (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <Image className="w-3 h-3" /> Image
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setInspecting(q)} title="Aperçu"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditing({ ...q })} title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(q.id)} title="Supprimer"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 flex-wrap pb-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-2 rounded-xl border text-sm font-medium disabled:opacity-40 hover:bg-secondary transition">
              ←
            </button>
            {Array.from({ length: Math.min(data.totalPages, 8) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition
                  ${p === page ? 'bg-primary text-white shadow-md shadow-primary/20' : 'border hover:bg-secondary'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
              className="px-3 py-2 rounded-xl border text-sm font-medium disabled:opacity-40 hover:bg-secondary transition">
              →
            </button>
          </div>
        )}
      </div>

      {inspecting && <InspectModal q={inspecting} onClose={() => setInspecting(null)} />}
      </div>
    </div>
  );
}

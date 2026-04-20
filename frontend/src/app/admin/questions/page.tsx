'use client';
import { useEffect, useState } from 'react';
import { adminApi, themesApi } from '@/lib/api';
import { Search, Edit2, Trash2, Save, X, Loader2, Eye, Lightbulb, AlertTriangle } from 'lucide-react';

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
            <p className="font-semibold text-slate-800 text-sm mt-0.5">Inspection de la question</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Question text */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Question</p>
            <p className="text-slate-800 font-medium leading-relaxed">{q.text}</p>
          </div>

          {/* Choices */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Propositions</p>
            <div className="space-y-2">
              {LETTERS.filter(l => q[`choice${l}`]?.trim()).map((l) => {
                const isCorrect = correct.includes(l);
                return (
                  <div key={l} className={`flex items-start gap-3 p-3 rounded-xl border-2 ${isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border ${isCorrect ? 'bg-emerald-500 text-white border-emerald-500' : BADGE_COLORS[l]}`}>
                      {l}
                    </span>
                    <p className={`text-sm leading-relaxed ${isCorrect ? 'font-semibold text-emerald-800' : 'text-slate-700'}`}>
                      {q[`choice${l}`]}
                      {isCorrect && <span className="ml-2 text-xs text-emerald-600">✓ Correcte</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Correct answer summary */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Réponse(s) :</p>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
              {q.correctAnswer}
            </span>
          </div>

          {/* Explanation */}
          {q.explanation?.trim() ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Commentaire</p>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">{q.explanation}</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
              Aucun commentaire pour cette question.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminQuestionsPage() {
  const [data, setData] = useState<any>(null);
  const [themes, setThemes] = useState<any[]>([]);
  const [themeId, setThemeId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [inspecting, setInspecting] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    themesApi.all().then((r) => setThemes(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [page, themeId, search]);

  async function load() {
    const { data: d } = await adminApi.questions({ page, themeId, search });
    setData(d);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    await adminApi.updateQuestion(editing.id, {
      text: editing.text,
      choiceA: editing.choiceA,
      choiceB: editing.choiceB,
      choiceC: editing.choiceC,
      choiceD: editing.choiceD,
      choiceE: editing.choiceE,
      correctAnswer: editing.correctAnswer,
      explanation: editing.explanation,
    }).catch(() => {});
    setEditing(null);
    setSaving(false);
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Désactiver cette question ?')) return;
    await adminApi.deleteQuestion(id).catch(() => {});
    await load();
  }

  async function deleteAll() {
    if (!confirm(`Supprimer TOUTES les questions (${data?.total ?? 0}) ? Cette action est irréversible.`)) return;
    if (!confirm('Confirmation finale : supprimer toutes les questions ?')) return;
    setDeletingAll(true);
    await adminApi.deleteAllQuestions().catch(() => {});
    setDeletingAll(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          {data && <p className="text-muted-foreground">{data.total} questions</p>}
        </div>
        {data?.total > 0 && (
          <button onClick={deleteAll} disabled={deletingAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50">
            {deletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Tout supprimer
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher..."
            className="w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-sm"
          />
        </div>
        <select
          value={themeId}
          onChange={(e) => { setThemeId(e.target.value); setPage(1); }}
          className="px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-sm"
        >
          <option value="">Tous les thèmes</option>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {data?.questions?.map((q: any) => (
          <div key={q.id} className="bg-white rounded-2xl border shadow-sm p-5">
            {editing?.id === q.id ? (
              <div className="space-y-3">
                <textarea
                  value={editing.text}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="grid grid-cols-2 gap-2">
                  {LETTERS.map((l) => (
                    <div key={l} className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-muted-foreground">{l}:</span>
                      <input
                        value={editing[`choice${l}`] || ''}
                        onChange={(e) => setEditing({ ...editing, [`choice${l}`]: e.target.value })}
                        className="flex-1 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder={l === 'E' ? 'Optionnel' : ''}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-sm font-medium">Réponse(s) correcte(s) :</label>
                  <input
                    value={editing.correctAnswer}
                    onChange={(e) => setEditing({ ...editing, correctAnswer: e.target.value.toUpperCase() })}
                    className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-32"
                    placeholder="ex: A ou A,B,C"
                  />
                </div>
                <textarea
                  value={editing.explanation}
                  onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                  rows={3}
                  placeholder="Commentaire / Explication..."
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Sauvegarder
                  </button>
                  <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm">
                    <X className="w-3.5 h-3.5" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      {q.subTheme?.theme?.name} › {q.subTheme?.name}
                    </p>
                    <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {LETTERS.filter(l => q[`choice${l}`]?.trim()).map((l) => {
                        const isCorrect = q.correctAnswer?.split(',').map((s: string) => s.trim()).includes(l);
                        return (
                          <span key={l} className={`text-xs px-2 py-0.5 rounded-full border
                            ${isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-300 font-bold' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {l}: {q[`choice${l}`]?.slice(0, 20)}{q[`choice${l}`]?.length > 20 ? '…' : ''}
                          </span>
                        );
                      })}
                    </div>
                    {q.explanation?.trim() && (
                      <div className="flex items-center gap-1 mt-2">
                        <Lightbulb className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-600 font-medium">Commentaire disponible</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => setInspecting(q)}
                      className="p-2 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition" title="Inspecter">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditing({ ...q })}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition" title="Modifier">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(q.id)}
                      className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition" title="Supprimer">
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
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {Array.from({ length: Math.min(data.totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition
                ${p === page ? 'bg-primary text-white' : 'border hover:bg-secondary'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {inspecting && <InspectModal q={inspecting} onClose={() => setInspecting(null)} />}
    </div>
  );
}

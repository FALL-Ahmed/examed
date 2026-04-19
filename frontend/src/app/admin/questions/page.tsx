'use client';
import { useEffect, useState } from 'react';
import { adminApi, themesApi } from '@/lib/api';
import { Search, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';

export default function AdminQuestionsPage() {
  const [data, setData] = useState<any>(null);
  const [themes, setThemes] = useState<any[]>([]);
  const [themeId, setThemeId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Questions</h1>
        {data && <p className="text-muted-foreground">{data.total} questions</p>}
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
              // Mode édition
              <div className="space-y-3">
                <textarea
                  value={editing.text}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="grid grid-cols-2 gap-2">
                  {['A', 'B', 'C', 'D', 'E'].map((l) => (
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
                  <span className="text-xs text-muted-foreground">Séparées par virgule pour réponses multiples</span>
                </div>
                <textarea
                  value={editing.explanation}
                  onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                  rows={2}
                  placeholder="Explication..."
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
              // Mode lecture
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {q.subTheme?.theme?.name} › {q.subTheme?.name}
                    </p>
                    <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['A', 'B', 'C', 'D', 'E'].filter(l => q[`choice${l}`]).map((l) => {
                        const isCorrect = q.correctAnswer.split(',').map((s: string) => s.trim()).includes(l);
                        return (
                          <span key={l} className={`text-xs px-2 py-0.5 rounded-full
                            ${isCorrect ? 'bg-green-100 text-green-700 font-bold' : 'bg-secondary text-muted-foreground'}`}>
                            {l}: {q[`choice${l}`]?.slice(0, 25)}…
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setEditing({ ...q })} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(q.id)} className="p-2 rounded-xl hover:bg-red-50 text-muted-foreground hover:text-red-600 transition">
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
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: Math.min(data.totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition
                ${p === page ? 'bg-primary text-white' : 'border hover:bg-secondary'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

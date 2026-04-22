'use client';
import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Type, Trash2, FileJson } from 'lucide-react';

type Tab = 'pdf' | 'text' | 'json';
type Lang = 'fr' | 'ar';

export default function UploadPage() {
  const [tab, setTab] = useState<Tab>('json');
  const [lang, setLang] = useState<Lang>('fr');

  // PDF state
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);

  // Text state
  const [rawText, setRawText] = useState('');

  // JSON state
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonDrag, setJsonDrag] = useState(false);
  const [jsonData, setJsonData] = useState<any>(null);
  const [jsonError, setJsonError] = useState('');

  // Shared state
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  function handleFile(f: File) {
    if (!f.name.endsWith('.pdf')) { setError('Format PDF uniquement'); return; }
    setFile(f);
    setPreview(null);
    setResult(null);
    setError('');
  }

  function handleJsonFile(f: File) {
    if (!f.name.endsWith('.json')) { setJsonError('Format JSON uniquement'); return; }
    setJsonFile(f);
    setJsonError('');
    setPreview(null);
    setResult(null);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        setJsonData(parsed);
      } catch {
        setJsonError('Fichier JSON invalide');
        setJsonFile(null);
        setJsonData(null);
      }
    };
    reader.readAsText(f);
  }

  function resetAll() {
    setFile(null);
    setJsonFile(null);
    setJsonData(null);
    setJsonError('');
    setRawText('');
    setPreview(null);
    setResult(null);
    setError('');
  }

  async function handlePreview() {
    setPreviewing(true);
    setError('');
    try {
      let data: any;
      if (tab === 'pdf') {
        ({ data } = await adminApi.previewPdf(file!));
      } else if (tab === 'json') {
        ({ data } = await adminApi.previewJson(jsonData));
      } else {
        ({ data } = lang === 'ar'
          ? await adminApi.previewArText(rawText)
          : await adminApi.previewText(rawText));
      }
      setPreview(data);
    } catch (err: any) {
      setError('Erreur analyse : ' + (err.response?.data?.detail || err.message));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setError('');
    try {
      let data: any;
      if (tab === 'pdf') {
        ({ data } = await adminApi.importPdf(file!));
      } else if (tab === 'json') {
        ({ data } = await adminApi.importJson(jsonData));
      } else {
        ({ data } = lang === 'ar'
          ? await adminApi.importArText(rawText)
          : await adminApi.importText(rawText));
      }
      setResult(data);
      setPreview(null);
    } catch (err: any) {
      setError('Erreur import : ' + (err.response?.data?.detail || err.message));
    } finally {
      setImporting(false);
    }
  }

  async function handleDeleteAllThemes() {
    if (!confirm('Supprimer TOUS les thèmes, sous-thèmes et questions ? Cette action est irréversible.')) return;
    setDeleting(true);
    setError('');
    try {
      await adminApi.deleteAllThemes();
      resetAll();
    } catch (err: any) {
      setError('Erreur suppression : ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  }

  const canPreview =
    tab === 'pdf' ? !!file :
    tab === 'json' ? !!jsonData :
    rawText.trim().length > 50;

  const TABS: [Tab, string, any][] = [
    ['json', 'Importer JSON', FileJson],
    ['text', lang === 'ar' ? 'لصق النص' : 'Coller du texte', Type],
    ['pdf', lang === 'ar' ? 'استيراد PDF' : 'Importer un PDF', Upload],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importer des questions</h1>
        <p className="text-muted-foreground mt-1">Via JSON structuré, PDF ou en collant le texte</p>
      </div>

      {/* Langue (only relevant for text tab) */}
      {tab === 'text' && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Langue du contenu :</span>
          <div className="flex rounded-xl border border-border overflow-hidden">
            {([['fr', '🇫🇷 Français'], ['ar', '🇲🇷 العربية']] as const).map(([l, label]) => (
              <button
                key={l}
                onClick={() => { setLang(l); resetAll(); }}
                className={`px-4 py-2 text-sm font-medium transition ${lang === l ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-0">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => { setTab(id); resetAll(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px
              ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* JSON Tab */}
      {tab === 'json' && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setJsonDrag(true); }}
            onDragLeave={() => setJsonDrag(false)}
            onDrop={(e) => { e.preventDefault(); setJsonDrag(false); const f = e.dataTransfer.files[0]; if (f) handleJsonFile(f); }}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition cursor-pointer
              ${jsonDrag ? 'border-primary bg-blue-50' : jsonFile ? 'border-green-400 bg-green-50' : 'border-border hover:border-primary hover:bg-blue-50'}`}
            onClick={() => document.getElementById('json-input')?.click()}
          >
            <input id="json-input" type="file" accept=".json" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleJsonFile(e.target.files[0])} />
            {jsonFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileJson className="w-12 h-12 text-green-500" />
                <p className="font-semibold text-green-700">{jsonFile.name}</p>
                <p className="text-sm text-muted-foreground">{(jsonFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileJson className="w-12 h-12 text-muted-foreground" />
                <p className="font-medium">Glisser-déposer guide_perfect.json ici</p>
                <p className="text-sm text-muted-foreground">ou cliquer pour sélectionner</p>
                <p className="text-xs text-muted-foreground mt-2">Format : Thème → Sous-thème → questions[]</p>
              </div>
            )}
          </div>
          {jsonError && (
            <p className="text-sm text-red-600">{jsonError}</p>
          )}
          {jsonData && (
            <div className="bg-secondary rounded-xl px-4 py-3 text-sm text-muted-foreground">
              {Object.keys(jsonData).length} thèmes détectés dans le fichier
            </div>
          )}
        </div>
      )}

      {/* PDF Tab */}
      {tab === 'pdf' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition cursor-pointer
            ${drag ? 'border-primary bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-border hover:border-primary hover:bg-blue-50'}`}
          onClick={() => document.getElementById('pdf-input')?.click()}
        >
          <input id="pdf-input" type="file" accept=".pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-green-700">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <p className="font-medium">Glisser-déposer votre PDF ici</p>
              <p className="text-sm text-muted-foreground">ou cliquer pour sélectionner</p>
            </div>
          )}
        </div>
      )}

      {/* Text Tab */}
      {tab === 'text' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {lang === 'ar' ? 'الصق محتوى الدليل هنا' : 'Collez le contenu du guide ici'}
          </label>
          <textarea
            value={rawText}
            onChange={(e) => { setRawText(e.target.value); setPreview(null); setResult(null); }}
            rows={16}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            placeholder={lang === 'ar'
              ? 'الأمراض المعدية\n\nداء الكلب\n\n\tما هي خصائص عامل داء الكلب؟\n\tفيروس ARN\n\tعائلة رابدوفيروس\nالإجابات الدقيقة: أ ب\nتعليق: ...'
              : 'La Rage :\n1. Quels sont les animaux vecteurs de la rage ?\nA. Le chien\nB. Le chat\nRéponses exactes : A B\n\nLe Paludisme :\n2. Le paludisme est transmis par :\n...'
            }
            className="w-full px-4 py-3 border rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none bg-white"
          />
          <p className="text-xs text-muted-foreground">
            {rawText.length.toLocaleString()} caractères · {rawText.split('\n').length} lignes
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {canPreview && !result && (
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={previewing || importing}
            className="flex-1 py-3 border rounded-xl font-medium text-sm hover:bg-secondary transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {previewing && <Loader2 className="w-4 h-4 animate-spin" />}
            Analyser (aperçu)
          </button>
          <button
            onClick={handleImport}
            disabled={importing || previewing}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            Importer directement
          </button>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">Aperçu de l&apos;extraction</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Thématiques', value: preview.stats.themes },
              { label: 'Sous-thèmes', value: preview.stats.subThemes },
              { label: 'Questions détectées', value: preview.stats.questions },
            ].map((s) => (
              <div key={s.label} className="bg-secondary rounded-xl p-3">
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {preview.themes.slice(0, 2).map((theme: any) => (
            <div key={theme.name} className="border rounded-xl p-4">
              <p className="font-medium">{theme.name}</p>
              {theme.subThemes.slice(0, 1).map((sub: any) => (
                <div key={sub.name} className="mt-2 ml-4">
                  <p className="text-sm text-muted-foreground">
                    {sub.name}
                    {sub.totalQuestions !== undefined && (
                      <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">
                        {sub.totalQuestions} questions
                      </span>
                    )}
                  </p>
                  {(sub.questions ?? []).slice(0, 2).map((q: any, i: number) => {
                    const isAr = preview.stats.language === 'AR';
                    const arLetters: Record<string,string> = { A:'أ', B:'ب', C:'ج', D:'د', E:'هـ' };
                    const dl = (l: string) => isAr ? arLetters[l] ?? l : l;
                    return (
                      <div key={i} className="mt-2 ml-4 text-xs bg-secondary p-3 rounded-lg" dir={isAr ? 'rtl' : 'ltr'}>
                        <p className="font-medium">{q.text}</p>
                        <div className="mt-1 space-y-0.5">
                          {['A','B','C','D','E'].filter(l => q[`choice${l}`]).map(l => (
                            <p key={l} className="text-muted-foreground">{dl(l)}: {q[`choice${l}`]}</p>
                          ))}
                        </div>
                        {q.correctAnswer && (
                          <p className="text-green-600 mt-1 font-medium">
                            {isAr ? 'الإجابة:' : 'Réponse(s):'} {q.correctAnswer.split(',').map((l: string) => dl(l.trim())).join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmer l&apos;import ({preview.stats.questions} questions)
          </button>
        </div>
      )}

      {/* Zone danger */}
      <div className="border border-red-200 rounded-2xl p-5 space-y-3 bg-red-50/50">
        <p className="text-sm font-semibold text-red-700">Zone dangereuse</p>
        <button
          onClick={handleDeleteAllThemes}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-60"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Supprimer tous les thèmes et questions
        </button>
        <p className="text-xs text-red-500">Supprime définitivement tous les thèmes, sous-thèmes et questions de la base de données.</p>
      </div>

      {/* Succès */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <CheckCircle className="w-6 h-6" />
            Import réussi !
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Thématiques', value: result.imported?.themesCreated ?? result.parsed?.themes },
              { label: 'Sous-thèmes', value: result.imported?.subThemesCreated ?? result.parsed?.subThemes },
              { label: 'Questions', value: result.imported?.questionsCreated ?? result.parsed?.questions },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-3 text-center border border-green-200">
                <p className="text-xl font-bold text-green-700">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {result.imported?.questionsSkipped > 0 && (
            <p className="text-xs text-amber-600">{result.imported.questionsSkipped} questions ignorées (déjà existantes)</p>
          )}
          {result.parsed?.skippedNoOptions > 0 && (
            <p className="text-xs text-amber-600">{result.parsed.skippedNoOptions} questions ignorées (sans choix de réponses dans le JSON)</p>
          )}
          <button onClick={resetAll} className="text-sm text-green-700 underline">
            Importer d&apos;autres questions
          </button>
        </div>
      )}
    </div>
  );
}

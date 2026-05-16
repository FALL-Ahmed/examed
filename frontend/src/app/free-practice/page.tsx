'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { FomoResults } from '@/components/FomoResults';
import { BookOpen, Lock, CheckCircle2, XCircle, ChevronRight, Loader2, Search } from 'lucide-react';
import { sentenceCase, resolveImageUrl } from '@/lib/utils';

// Thèmes accessibles gratuitement (matching partiel, insensible accents)
const FREE_THEME_KEYWORDS = ['maladies infectieuses', 'infectieuses', 'anatomie', 'الأمراض المعدية', 'التشريح'];

function isThemeFree(name: string) {
  const n = name.toLowerCase();
  const nNorm = n.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return FREE_THEME_KEYWORDS.some((k) => {
    const kLow = k.toLowerCase();
    const kNorm = kLow.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return n.includes(kLow) || nNorm.includes(kNorm);
  });
}

type Phase = 'select' | 'session' | 'results';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const AR_LETTERS: Record<string, string> = { A: 'أ', B: 'ب', C: 'ج', D: 'د', E: 'هـ' };

export default function FreePracticePage() {
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const isAr = lang === 'ar';

  const [themes, setThemes] = useState<any[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [premiumModal, setPremiumModal] = useState<string | null>(null); // theme name
  const [search, setSearch] = useState('');

  // Config session
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [selectedSubTheme, setSelectedSubTheme] = useState<any>(null);
  const [count, setCount] = useState(10);

  // Noms capturés au démarrage de la session (persistent pendant les résultats)
  const [sessionThemeName, setSessionThemeName] = useState('');
  const [sessionSubThemeName, setSessionSubThemeName] = useState('');

  // Session
  const [phase, setPhase] = useState<Phase>('select');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);
  const practiceSession = useRef<{ sessionId: string; themeId: string; themeName: string; lang: string } | null>(null);

  function trackPracticeEvent(eventType: string, extra?: { questionN?: number; isCorrect?: boolean; count?: number }) {
    const s = practiceSession.current;
    if (!s) return;
    publicApi.trackFreePracticeEvent({ ...s, eventType, ...extra });
  }

  useEffect(() => {
    setSelectedTheme(null);
    setSelectedSubTheme(null);
    publicApi.themes(lang)
      .then((r) => setThemes(r.data))
      .catch(() => {})
      .finally(() => setLoadingThemes(false));
  }, [lang]);

  async function startSession() {
    if (!selectedTheme) return;
    setLoadingQ(true);
    setSessionThemeName(selectedTheme.name ?? '');
    setSessionSubThemeName(selectedSubTheme?.name ?? '');
    try {
      const { data } = await publicApi.freePractice(selectedTheme.id, selectedTheme.name, count, lang, selectedSubTheme?.id);
      // Init session tracking
      practiceSession.current = {
        sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        themeId: selectedTheme.id ?? '',
        themeName: selectedTheme.name ?? '',
        lang,
      };
      trackPracticeEvent('start', { count: data.length });
      setQuestions(data);
      setResults([]);
      setCurrentIdx(0);
      setSelected([]);
      setRevealed(false);
      setPhase('session');
    } catch { } finally { setLoadingQ(false); }
  }

  function submitAnswer() {
    if (!selected.length) return;
    const q = questions[currentIdx];
    const correct = q.correctAnswer.split(',').map((s: string) => s.trim()).sort().join(',');
    const userAns = [...selected].sort().join(',');
    const isCorrect = userAns === correct;
    setResults((r) => [...r, { correct: isCorrect }]);
    trackPracticeEvent('answer', { questionN: currentIdx + 1, isCorrect });
    setRevealed(true);
  }

  function nextQuestion() {
    if (currentIdx + 1 >= questions.length) {
      trackPracticeEvent('complete', { count: questions.length });
      setPhase('results');
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected([]);
      setRevealed(false);
    }
  }

  function restart() {
    setPhase('select');
    setSelectedTheme(null);
    setSelectedSubTheme(null);
    setSearch('');
    setResults([]);
  }

  // ── Filtrage thèmes ──
  const filtered = themes.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const n = t.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return n.includes(q) || t.subThemes?.some((s: any) => s.name.toLowerCase().includes(q));
  }).sort((a, b) => {
    const af = isThemeFree(a.name) ? 0 : 1;
    const bf = isThemeFree(b.name) ? 0 : 1;
    return af - bf;
  });

  // ── Résultats finals ──
  const correctQ = results.filter((r) => r.correct).length;
  const scorePercent = questions.length > 0 ? Math.round((correctQ / questions.length) * 100) : 0;

  // ── Question courante ──
  const q = questions[currentIdx];

  return (
    <div className="min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Header — identique au topbar mobile du dashboard ── */}
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-4 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md shadow-violet-500/30">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">Al Bourour</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(isAr ? 'fr' : 'ar')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition">
            {isAr ? 'Français' : 'العربية'}
          </button>
          <Link href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition">
            {isAr ? 'تسجيل الدخول' : 'Se connecter'}
          </Link>
          <Link href="/register"
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white gradient-primary transition hover:opacity-90 shadow-sm shadow-violet-500/20">
            {isAr ? 'إنشاء حساب' : "S'inscrire"}
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-up">

        {/* ── Phase SELECT ── */}
        {phase === 'select' && (
          <div className="space-y-6">

            {/* Banner — identique au banner practice du dashboard */}
            <div className="rounded-2xl p-6 text-white gradient-sky">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">
                    {isAr ? 'التدريب المجاني' : 'Entraînement gratuit'}
                  </h1>
                  <p className="text-white/70 text-sm mt-0.5">
                    {isAr ? 'موضوعان مجانيان · المواضيع الأخرى تتطلب اشتراكاً' : '2 thèmes offerts · Les autres nécessitent un abonnement Premium'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Grille thèmes */}
              <div className="lg:col-span-2 space-y-4">

                {/* Barre de recherche */}
                <div className="relative">
                  <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isAr ? 'ابحث عن موضوع...' : 'Rechercher un thème...'}
                    className={`w-full ${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card text-foreground`}
                  />
                </div>

                {loadingThemes ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    {filtered.map((theme) => {
                      const free = isThemeFree(theme.name);
                      const qCount = theme.subThemes?.reduce((s: number, st: any) => s + (st._count?.questions ?? 0), 0) ?? 0;
                      const isSelected = selectedTheme?.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            if (free) {
                              setSelectedTheme(theme); setSelectedSubTheme(null); setPremiumModal(null);
                              setTimeout(() => configRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                            }
                            else setPremiumModal(theme.name);
                          }}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${isAr ? 'text-right' : 'text-left'} ${
                            free
                              ? isSelected
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                              : 'border-border bg-secondary/40 opacity-70 cursor-pointer'
                          }`}
                        >
                          <div className={`absolute top-3 ${isAr ? 'left-3' : 'right-3'}`}>
                            {free ? (
                              <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {isAr ? 'مجاني' : 'GRATUIT'}
                              </span>
                            ) : (
                              <span className="bg-secondary text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Premium
                              </span>
                            )}
                          </div>
                          <p className={`font-semibold text-foreground text-sm mb-1 ${isAr ? 'pl-16' : 'pr-16'}`}>{sentenceCase(theme.name)}</p>
                          <p className="text-xs text-muted-foreground">
                            {theme.subThemes?.length ?? 0} {isAr ? 'فصول' : 'chapitres'} · {qCount} {isAr ? 'سؤال' : 'questions'}
                          </p>
                          {!free && (
                            <div className={`mt-2 flex items-center gap-1 text-xs text-muted-foreground ${isAr ? 'flex-row-reverse justify-end' : ''}`}>
                              <Lock className="w-3 h-3" />
                              {isAr ? 'يتطلب اشتراكاً' : 'Nécessite un abonnement'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Panneau config — identique au side panel du dashboard practice */}
              <div className="space-y-4" ref={configRef}>
                <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
                  <h3 className="font-semibold text-sm text-foreground">
                    {isAr ? 'إعداد الجلسة' : 'Configuration'}
                  </h3>

                  {selectedTheme ? (
                    <>
                      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <p className="text-sm font-semibold text-foreground truncate">{sentenceCase(selectedTheme.name)}</p>
                      </div>

                      {selectedTheme.subThemes?.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                            {isAr ? 'الفصل (اختياري)' : 'Chapitre (optionnel)'}
                          </label>
                          <select
                            value={selectedSubTheme?.id ?? ''}
                            onChange={(e) => {
                              const st = selectedTheme.subThemes.find((s: any) => s.id === e.target.value) ?? null;
                              setSelectedSubTheme(st);
                              if (st) setCount(Math.min(count, st._count?.questions ?? count));
                            }}
                            className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card text-foreground"
                          >
                            <option value="">{isAr ? 'كل الفصول' : 'Tous les chapitres'}</option>
                            {selectedTheme.subThemes.map((st: any) => (
                              <option key={st.id} value={st.id}>
                                {sentenceCase(st.name)} ({st._count?.questions ?? 0} {isAr ? 'سؤال' : 'q'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-semibold text-muted-foreground">
                            {isAr ? 'عدد الأسئلة' : 'Nombre de questions'}
                          </label>
                          <span className="text-lg font-bold text-primary">{count}</span>
                        </div>
                        <input type="range" min={5} max={Math.min(30, selectedSubTheme?._count?.questions ?? 30)} step={5} value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                          className="w-full" />
                        <div className="flex gap-2 mt-3">
                          {[5, 10, 20, 30].map((n) => (
                            <button key={n} onClick={() => setCount(n)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${count === n ? 'gradient-primary text-white border-transparent' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button onClick={startSession} disabled={loadingQ}
                        className="w-full gradient-primary text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-violet-500/20">
                        {loadingQ ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isAr ? 'ابدأ الجلسة ←' : 'Démarrer la session →'}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isAr ? '← اختر موضوعاً من القائمة' : '← Choisissez un thème'}
                    </p>
                  )}
                </div>

                {/* Info card */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-semibold text-sm text-foreground mb-3">
                    {isAr ? 'كيف يعمل ؟' : 'Comment ça marche ?'}
                  </h3>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    {(isAr
                      ? ['اختر موضوعاً مجانياً', 'أجب على الأسئلة', 'اطّلع على شرح كل جواب', 'قارن نتيجتك بالمعدل الوطني']
                      : ['Choisissez un thème gratuit', 'Répondez aux questions', 'Consultez les explications', 'Comparez votre score à la moyenne nationale']
                    ).map((step, i) => (
                      <div key={i} className={`flex items-start gap-2.5 ${isAr ? 'flex-row-reverse' : ''}`}>
                        <span className="w-5 h-5 rounded-full bg-secondary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 text-foreground">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase SESSION ── */}
        {phase === 'session' && q && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-secondary rounded-full h-1.5">
                <div className="gradient-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{currentIdx + 1}/{questions.length}</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                {sentenceCase(q.subTheme?.theme?.name ?? '')} · {sentenceCase(q.subTheme?.name ?? '')}
              </p>
              {q.imageUrl && (
                <img src={resolveImageUrl(q.imageUrl)} alt="" className="w-full rounded-xl max-h-48 object-contain" />
              )}
              <p className="font-semibold text-foreground leading-relaxed">{q.text}</p>

              {q.correctAnswer.includes(',') && (
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  ⚠️ {isAr ? 'أجوبة متعددة — اختر كل الإجابات الصحيحة' : 'Plusieurs réponses correctes — sélectionnez toutes les bonnes réponses'}
                </p>
              )}

              <div className="space-y-2">
                {LETTERS.filter((l) => q[`choice${l}`]).map((letter) => {
                  const correctArr = q.correctAnswer.split(',').map((s: string) => s.trim());
                  const isCorrect = correctArr.includes(letter);
                  const isSelected = selected.includes(letter);

                  let cls = 'border-border text-foreground hover:border-primary/40 hover:bg-primary/5';
                  if (revealed) {
                    if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
                    else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
                    else cls = 'border-border text-muted-foreground opacity-50';
                  } else if (isSelected) {
                    cls = 'border-primary bg-primary/5 text-primary';
                  }

                  return (
                    <button key={letter} disabled={revealed}
                      onClick={() => {
                        if (q.correctAnswer.includes(',')) {
                          setSelected((s) => s.includes(letter) ? s.filter((x) => x !== letter) : [...s, letter]);
                        } else {
                          setSelected([letter]);
                        }
                      }}
                      className={`w-full ${isAr ? 'text-right' : 'text-left'} flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${cls}`}>
                      <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 border-current">
                        {isAr ? AR_LETTERS[letter] : letter}
                      </span>
                      <span className="text-sm leading-relaxed flex-1">{q[`choice${letter}`]}</span>
                      {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
                      {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              {revealed && q.explanation && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-foreground">
                  💡 {q.explanation}
                </div>
              )}

              <div className="pt-1">
                {!revealed ? (
                  <button onClick={submitAnswer} disabled={!selected.length}
                    className="w-full gradient-primary text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition hover:opacity-90 shadow-lg shadow-violet-500/20">
                    {isAr ? 'تحقق من الإجابة' : 'Vérifier'}
                  </button>
                ) : (
                  <button onClick={nextQuestion}
                    className="w-full gradient-primary text-white py-3 rounded-xl font-semibold text-sm transition hover:opacity-90 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                    {currentIdx + 1 >= questions.length
                      ? (isAr ? 'عرض النتائج' : 'Voir mes résultats')
                      : (isAr ? 'السؤال التالي' : 'Question suivante')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {isAr ? `صحيح: ${results.filter((r) => r.correct).length}/${results.length}` : `Correct : ${results.filter((r) => r.correct).length}/${results.length}`}
            </p>
          </div>
        )}

        {/* ── Phase RESULTS ── */}
        {phase === 'results' && (
          <FomoResults
            score={scorePercent}
            totalQ={questions.length}
            correctQ={correctQ}
            themeName={sentenceCase(sessionThemeName)}
            subThemeName={sessionSubThemeName ? sentenceCase(sessionSubThemeName) : undefined}
            themeId={selectedTheme?.id}
            subThemeId={selectedSubTheme?.id}
            lang={lang}
            onRestart={restart}
          />
        )}
      </div>

      {/* Modal Premium */}
      {premiumModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPremiumModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{sentenceCase(premiumModal)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAr ? 'هذا الموضوع متاح للمشتركين فقط' : 'Ce thème est réservé aux abonnés Premium'}
                </p>
              </div>
              <Link href="/register"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm transition hover:opacity-90 gradient-primary shadow-lg shadow-violet-500/20">
                {isAr ? 'أنشئ حسابك الآن' : 'Activer mon compte Premium'}
              </Link>
              <button onClick={() => setPremiumModal(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition">
                {isAr ? 'ربما لاحقاً' : 'Plus tard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

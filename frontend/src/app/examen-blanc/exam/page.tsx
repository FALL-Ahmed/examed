'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Send, Flag } from 'lucide-react';

const EB_STATE_KEY = 'examen_blanc_state';
const EB_TEST_KEY = 'examen_blanc_test_state';
const pad = (n: number) => String(n).padStart(2, '0');

function Timer({ endTime, onExpire, isAr }: { endTime: number; onExpire: () => void; isAr: boolean }) {
  const getRemaining = () => Math.max(0, Math.floor((endTime - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(getRemaining);
  const cbRef = useRef(onExpire);
  cbRef.current = onExpire;

  useEffect(() => {
    if (endTime <= Date.now()) { cbRef.current(); return; }
    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0) { clearInterval(id); cbRef.current(); }
    }, 500);
    return () => clearInterval(id);
  }, [endTime]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const urgent = remaining < 600;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg tabular-nums transition-colors
      ${urgent ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white border border-white/20'}`}>
      <Clock className="w-4 h-4" />
      {h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}
    </div>
  );
}

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTestMode = searchParams.get('mode') === 'test';
  const stateKey = isTestMode ? EB_TEST_KEY : EB_STATE_KEY;

  const { lang, setLang } = useLang();
  const isAr = lang === 'ar';

  const [state, setState] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [examEndTime, setExamEndTime] = useState(0);
  const tabSwitchesRef = useRef(0);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(stateKey);
    if (!raw) { router.replace('/examen-blanc'); return; }
    try {
      const s = JSON.parse(raw);
      if (!s.sessionId || !s.questions?.length) { router.replace('/examen-blanc'); return; }
      if (s.isCompleted) {
        router.replace(isTestMode ? '/examen-blanc/results?mode=test' : '/examen-blanc/results');
        return;
      }
      setState(s);
      setAnswers(s.answers || {});
      startTimeRef.current = new Date(s.startedAt);
      const limit = (s.durationMin || 120) * 60;
      const startTs = s.startedAt ? new Date(s.startedAt).getTime() : Date.now();
      setExamEndTime(startTs + limit * 1000);
    } catch { router.replace('/examen-blanc'); }
  }, [router, stateKey, isTestMode]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        tabSwitchesRef.current++;
        setTabWarnings(w => w + 1);
        setShowTabWarning(true);
        setTimeout(() => setShowTabWarning(false), 4000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const saveAnswer = useCallback((questionId: string, answer: string, sessionId: string) => {
    examenBlancApi.submitAnswer(sessionId, { questionId, reponse: answer });
    const raw = localStorage.getItem(stateKey);
    if (raw) {
      const s = JSON.parse(raw);
      s.answers = { ...s.answers, [questionId]: answer };
      localStorage.setItem(stateKey, JSON.stringify(s));
    }
  }, [stateKey]);

  function toggleAnswer(questionId: string, choice: string, isMultiple: boolean) {
    if (!state) return;
    const current = answers[questionId] || '';
    const selected = current ? current.split(',') : [];
    let next: string[];
    if (isMultiple) {
      next = selected.includes(choice) ? selected.filter(c => c !== choice) : [...selected, choice];
    } else {
      next = [choice];
    }
    const answer = next.sort().join(',');
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    saveAnswer(questionId, answer, state.sessionId);
  }

  async function handleFinish() {
    if (!state || finishing) return;
    setFinishing(true);
    try {
      await examenBlancApi.finish(state.sessionId, tabSwitchesRef.current);
    } catch (err: any) {
      if (!isTestMode) {
        alert(err.response?.data?.message || 'Erreur lors de la soumission');
        setFinishing(false);
        return;
      }
      // Mode test : on continue même si l'API échoue
    }
    const raw = localStorage.getItem(stateKey);
    if (raw) {
      const s = JSON.parse(raw);
      s.isCompleted = true;
      s.resultsAt = state.resultsAt;
      localStorage.setItem(stateKey, JSON.stringify(s));
    }
    router.push(isTestMode ? '/examen-blanc/results?mode=test' : '/examen-blanc/results');
  }

  if (!state) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
      <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const questions = state.questions;
  const q = questions[currentIdx];
  if (!q) return null;

  const selectedAnswers = (answers[q.id] || '').split(',').filter(Boolean);
  const choices = ['A', 'B', 'C', 'D', ...(q.choiceE ? ['E'] : [])];
  const answeredCount = Object.keys(answers).length;
  const totalQ = questions.length;

  return (
    <div className="min-h-screen flex flex-col" dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>

      {/* Badge test mode */}
      {isTestMode && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-black px-4 py-1 rounded-full text-xs font-black tracking-wide">
          🧪 MODE TEST ADMIN
        </div>
      )}

      {/* Tab warning */}
      {showTabWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-2xl">
          <AlertTriangle className="w-4 h-4" />
          {isAr
            ? `⚠️ تحذير ${tabWarnings}: لا تغادر الامتحان`
            : `⚠️ Avertissement ${tabWarnings} : Ne quittez pas l'examen`}
        </div>
      )}

      {/* Confirm finish modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center">
            <Send className="w-10 h-10 text-violet-400 mx-auto mb-4" />
            <h3 className="text-white font-black text-xl mb-2">
              {isAr ? 'تأكيد الإرسال' : 'Confirmer la soumission'}
            </h3>
            <p className="text-white/60 text-sm mb-2">
              {isAr
                ? `أجبت على ${answeredCount} من ${totalQ} سؤال`
                : `Vous avez répondu à ${answeredCount} / ${totalQ} questions`}
            </p>
            {answeredCount < totalQ && (
              <p className="text-amber-400 text-sm mb-4">
                {isAr
                  ? `${totalQ - answeredCount} سؤال لم تُجب عليه بعد`
                  : `${totalQ - answeredCount} question(s) sans réponse`}
              </p>
            )}
            <p className="text-white/40 text-xs mb-6">
              {isAr ? 'النتائج ستكون متاحة بعد 24 ساعة' : 'Résultats disponibles dans 24h'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-semibold hover:bg-white/5 transition">
                {isAr ? 'رجوع' : 'Annuler'}
              </button>
              <button onClick={handleFinish} disabled={finishing}
                className="flex-1 py-3 rounded-xl font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isAr ? 'إرسال' : 'Soumettre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-black/40 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="text-white/50 text-sm font-medium">
            {isAr ? `السؤال ${currentIdx + 1} من ${totalQ}` : `Question ${currentIdx + 1} / ${totalQ}`}
          </div>

          {examEndTime > 0 && (
            <Timer endTime={examEndTime} onExpire={handleFinish} isAr={isAr} />
          )}

          <button onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white transition hover:opacity-80"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <Send className="w-3.5 h-3.5" />
            {isAr ? 'إرسال' : 'Terminer'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mt-2">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / totalQ) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-white/30">
            <span>{isAr ? `${answeredCount} أجبت` : `${answeredCount} répondues`}</span>
            <span>{isAr ? `${totalQ - answeredCount} باقية` : `${totalQ - answeredCount} restantes`}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full px-4 py-6 gap-6">

        {/* Question */}
        <div className="flex-1">
          {/* Meta */}
          {q.theme && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold rounded-full">{q.theme}</span>
              {q.subTheme && <span className="px-3 py-1 bg-white/5 border border-white/10 text-white/40 text-xs rounded-full">{q.subTheme}</span>}
              {q.isMultiple && (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold rounded-full">
                  {isAr ? 'إجابات متعددة' : 'Réponses multiples'}
                </span>
              )}
            </div>
          )}

          {/* Question text */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-4">
            <p className="text-white text-base leading-relaxed font-medium">{q.text}</p>
            {q.imageUrl && (
              <img src={q.imageUrl} alt="" className="mt-4 rounded-xl max-h-64 object-contain" />
            )}
          </div>

          {/* Choices */}
          <div className="space-y-3 mb-6">
            {choices.map(choice => {
              const text = q[`choice${choice}`];
              if (!text) return null;
              const isSelected = selectedAnswers.includes(choice);
              return (
                <button key={choice} onClick={() => toggleAnswer(q.id, choice, q.isMultiple)}
                  className={`w-full text-left flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all font-medium
                    ${isSelected
                      ? 'border-violet-500 bg-violet-500/15 text-white'
                      : 'border-white/10 bg-white/3 text-white/70 hover:border-white/20 hover:bg-white/5'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 transition-all
                    ${isSelected ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/50'}`}>
                    {isSelected ? <CheckCircle2 className="w-4 h-4" /> : choice}
                  </div>
                  <span className="text-sm leading-snug">{text}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/60 font-semibold text-sm hover:bg-white/5 transition disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button onClick={() => setMarked(s => { const n = new Set(s); n.has(currentIdx) ? n.delete(currentIdx) : n.add(currentIdx); return n; })}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition
                ${marked.has(currentIdx) ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>
              <Flag className="w-3.5 h-3.5" />
              {isAr ? 'علّم' : 'Marquer'}
            </button>

            <button onClick={() => setCurrentIdx(i => Math.min(totalQ - 1, i + 1))} disabled={currentIdx === totalQ - 1}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition disabled:opacity-30 disabled:bg-white/5 disabled:border disabled:border-white/10 disabled:text-white/40"
              style={currentIdx === totalQ - 1 ? {} : { background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {isAr ? 'التالي' : 'Suivant'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar: question grid */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="sticky top-24 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
              {isAr ? 'التنقل' : 'Navigation'}
            </p>
            <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
              {questions.map((_: any, i: number) => {
                const qId = questions[i].id;
                const answered = !!answers[qId];
                const isMarked = marked.has(i);
                const isCurrent = i === currentIdx;
                return (
                  <button key={i} onClick={() => setCurrentIdx(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center
                      ${isCurrent ? 'ring-2 ring-violet-400 scale-110' : ''}
                      ${isMarked ? 'bg-amber-500/30 text-amber-300 border border-amber-500/30'
                        : answered ? 'bg-violet-500/30 text-violet-300'
                        : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-2 text-xs text-white/40">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-violet-500/30" /> {isAr ? 'أُجيب عليها' : 'Répondues'}</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500/30" /> {isAr ? 'مُعلّمة' : 'Marquées'}</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white/5" /> {isAr ? 'لم تُجب' : 'Non répondues'}</div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-white/50 text-xs font-semibold mb-1">{isAr ? 'الرقم الهاتفي للتسجيل:' : 'Inscrit sous :'}</p>
              <p className="text-white/70 text-xs font-mono">{state.participant?.prenom} {state.participant?.nom}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
        <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExamContent />
    </Suspense>
  );
}

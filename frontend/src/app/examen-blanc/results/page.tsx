'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { Trophy, Clock, Target, TrendingUp, MapPin, ChevronDown, ChevronUp, CheckCircle2, XCircle, BookOpen } from 'lucide-react';

const EB_STATE_KEY = 'examen_blanc_state';
const pad = (n: number) => String(n).padStart(2, '0');

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h ${pad(m)}min` : `${pad(m)}min ${pad(s)}s`;
}

function Countdown({ target, isAr }: { target: Date; isAr: boolean }) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setT({ h: 0, m: 0, s: 0 }); return; }
      setT({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="flex items-center justify-center gap-3">
      {[{ v: pad(t.h), l: isAr ? 'ساعة' : 'h' }, { v: pad(t.m), l: isAr ? 'دقيقة' : 'min' }, { v: pad(t.s), l: isAr ? 'ثانية' : 's' }].map(({ v, l }, i) => (
        <div key={i} className="flex items-end gap-1">
          <span className="text-5xl font-black text-white tabular-nums">{v}</span>
          <span className="text-white/40 text-sm mb-1">{l}</span>
          {i < 2 && <span className="text-white/20 text-3xl mb-0.5 mx-1">:</span>}
        </div>
      ))}
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [resultsAt, setResultsAt] = useState<Date | null>(null);
  const [localState, setLocalState] = useState<any>(null);

  const load = useCallback(async () => {
    const raw = localStorage.getItem(EB_STATE_KEY);
    if (!raw) { router.replace('/examen-blanc'); return; }
    let state: any;
    try { state = JSON.parse(raw); } catch { router.replace('/examen-blanc'); return; }
    if (!state.sessionId) { router.replace('/examen-blanc'); return; }
    if (!state.isCompleted) { router.replace('/examen-blanc/exam'); return; }
    setLocalState(state);

    try {
      const { data } = await examenBlancApi.results(state.sessionId);
      setResults(data);
      if (data.locked && data.resultsAt) setResultsAt(new Date(data.resultsAt));
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh when locked
  useEffect(() => {
    if (!results?.locked || !resultsAt) return;
    const diff = resultsAt.getTime() - Date.now();
    if (diff <= 0) { load(); return; }
    const id = setTimeout(() => load(), Math.min(diff + 1000, 60000));
    return () => clearTimeout(id);
  }, [results, resultsAt, load]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
      <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Locked state — show score immediately, classement later
  if (!results || results.locked) {
    const prenom = results?.participant?.prenom || localState?.participant?.prenom || '';
    const score = results?.score;
    const noteOn20 = score != null ? ((score / 100) * 20).toFixed(2) : null;
    const correctQ = results?.correctQ ?? 0;
    const totalQ = results?.totalQ || localState?.totalQ || 80;
    const answeredQ = results?.answeredQ ?? 0;
    const passed = score != null && score >= 50;
    const revealDate = resultsAt
      ? resultsAt.toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
    const revealTime = resultsAt
      ? resultsAt.toLocaleTimeString(isAr ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" dir={isAr ? 'rtl' : 'ltr'}
        style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
        <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 max-w-lg w-full space-y-5">

          {/* Score immédiat */}
          {score != null ? (
            <div className={`rounded-3xl p-7 border ${passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="text-5xl mb-3">{passed ? '🎉' : '📚'}</div>
              <p className="text-white/60 text-sm font-semibold mb-1">
                {isAr ? `${prenom}، نتيجتك في الامتحان` : `${prenom}, ton score à l'examen`}
              </p>
              <p className="text-6xl font-black text-white mb-1">
                {score?.toFixed(1)}<span className="text-3xl text-white/40">%</span>
              </p>
              <p className={`text-2xl font-bold mb-3 ${passed ? 'text-emerald-300' : 'text-amber-300'}`}>
                {noteOn20}<span className="text-base text-white/40"> / 20</span>
              </p>
              <p className="text-white/40 text-sm">
                {isAr
                  ? `${correctQ} صحيح من ${answeredQ} إجابة`
                  : `${correctQ} correctes sur ${answeredQ} répondues`}
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6">
              <div className="text-5xl mb-3">✅</div>
              <h1 className="text-2xl font-black text-white mb-2">
                {isAr ? `${prenom}، تم تسجيل امتحانك بنجاح!` : `${prenom}, ton examen est bien enregistré !`}
              </h1>
            </div>
          )}

          {/* Classement verrouillé */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <p className="text-white/80 font-bold mb-1">
              {isAr ? '🏆 الترتيب والتصحيح يُكشف يوم' : '🏆 Classement & correction révélés le'}
            </p>
            <p className="text-white font-black text-lg">{revealDate}</p>
            <p className="text-violet-300 font-semibold mb-5">{isAr ? `الساعة ${revealTime}` : `à ${revealTime}`}</p>
            {resultsAt && <Countdown target={resultsAt} isAr={isAr} />}
            <p className="text-white/30 text-xs mt-4">
              {isAr
                ? '🔐 النتائج مجهولة الهوية — لن يعرف أحد معلومات الآخرين'
                : '🔐 Résultats anonymes — personne ne verra les infos des autres'}
            </p>
          </div>

          {/* Instructions */}
          <div className="text-white/30 text-sm space-y-1">
            <p>{isAr ? '📱 يمكنك إغلاق هذه الصفحة والعودة لاحقاً' : '📱 Tu peux fermer cette page et revenir plus tard'}</p>
            <p>{isAr ? '🔍 استخدم رقم هاتفك للعودة إلى نتائجك' : '🔍 Utilise ton numéro de téléphone pour retrouver tes résultats'}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/examen-blanc"
              className="inline-block px-6 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition">
              {isAr ? '← صفحة الامتحان' : '← Page examen'}
            </Link>
            <Link href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {isAr ? 'الذهاب إلى المنصة الرئيسية ←' : 'Aller sur Al Bourour →'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const noteOn20 = ((results.score / 100) * 20).toFixed(2);
  const passed = results.score >= 50;
  const displayedQuestions = showAll ? results.questions : results.questions?.slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Hero results */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
        <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="text-5xl mb-4">{passed ? '🎉' : '📚'}</div>
          <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-2">
            {results.participant?.prenom} {results.participant?.nom} · {results.participant?.ville}
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">
            {results.score?.toFixed(1)}<span className="text-2xl text-white/50">%</span>
          </h1>
          <p className="text-2xl font-bold text-violet-300 mb-8">{noteOn20}/20</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
            {[
              { icon: Trophy, val: `${results.classement}/${results.totalParticipants}`, label: isAr ? 'الترتيب' : 'Classement' },
              { icon: Target, val: `${results.percentile}%`, label: isAr ? 'فوق المتوسط' : 'Mieux que' },
              { icon: CheckCircle2, val: `${results.correctQ}/${results.totalQ}`, label: isAr ? 'إجابات صحيحة' : 'Correctes' },
              { icon: Clock, val: formatTime(results.timeTaken || 0), label: isAr ? 'الوقت' : 'Temps' },
            ].map(({ icon: Icon, val, label }, i) => (
              <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
                <Icon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
                <p className="text-white font-black text-lg">{val}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/examen-blanc/leaderboard"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition hover:opacity-80"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <Trophy className="w-4 h-4" />
              {isAr ? 'الترتيب الوطني' : 'Classement national'}
            </Link>
            <Link href="/register"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-white/10 border border-white/20 hover:bg-white/15 transition">
              <BookOpen className="w-4 h-4" />
              {isAr ? 'اشترك للتدرب أكثر' : 'S\'inscrire pour s\'entraîner'}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Score distribution */}
        {results.histogram && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-black text-gray-900 text-lg mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              {isAr ? 'توزيع النتائج' : 'Distribution des notes'}
            </h2>
            <div className="flex items-end gap-2 h-40">
              {results.histogram.map((bar: any, i: number) => {
                const maxCount = Math.max(...results.histogram.map((b: any) => b.count), 1);
                const height = Math.max(4, (bar.count / maxCount) * 100);
                const isMyRange = results.score >= i * 10 && results.score < (i + 1) * 10;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {bar.count > 0 && <span className="text-xs text-gray-400">{bar.count}</span>}
                    <div className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${height}%`,
                        background: isMyRange ? 'linear-gradient(180deg,#7c3aed,#6366f1)' : '#e5e7eb',
                      }} />
                    <span className="text-xs text-gray-400">{i * 10}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Theme breakdown */}
        {results.themeStats?.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-black text-gray-900 text-lg mb-6">
              {isAr ? '📚 أداؤك بكل مادة' : '📚 Performance par matière'}
            </h2>
            <div className="space-y-4">
              {results.themeStats.sort((a: any, b: any) => b.pct - a.pct).map((ts: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-gray-700 font-semibold text-sm">{ts.name}</span>
                    <span className={`text-sm font-bold ${ts.pct >= 75 ? 'text-emerald-600' : ts.pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                      {ts.correct}/{ts.total} · {ts.pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${ts.pct}%`,
                        background: ts.pct >= 75 ? 'linear-gradient(90deg,#10b981,#34d399)' : ts.pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)',
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question review */}
        {results.questions?.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-black text-gray-900 text-lg mb-6">
              {isAr ? '🔍 مراجعة الأسئلة' : '🔍 Révision des questions'}
            </h2>
            <div className="space-y-3">
              {displayedQuestions.map((q: any, i: number) => (
                <div key={q.id} className={`border rounded-2xl overflow-hidden ${q.isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>
                  <button
                    className={`w-full flex items-center gap-3 px-5 py-4 text-left ${q.isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}
                    onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                    {q.isCorrect
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{q.theme} · {q.subTheme}</p>
                      <p className="text-gray-800 text-sm font-medium line-clamp-2">{q.text}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-bold ${q.partialScore > 0 ? 'text-emerald-600' : q.partialScore < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {q.partialScore > 0 ? '+' : ''}{q.partialScore.toFixed(2)}
                      </span>
                      {expandedQ === q.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedQ === q.id && (
                    <div className="px-5 py-4 bg-white space-y-3">
                      {['A', 'B', 'C', 'D', 'E'].filter(c => q[`choice${c}`]).map(c => {
                        const isCorrect = q.correctAnswer?.toUpperCase().split(',').map((x: string) => x.trim()).includes(c);
                        const wasSelected = q.userAnswer?.toUpperCase().split(',').map((x: string) => x.trim()).includes(c);
                        return (
                          <div key={c} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
                            ${isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : wasSelected ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-500'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                              ${isCorrect ? 'bg-emerald-500 text-white' : wasSelected ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-600'}`}>{c}</span>
                            {q[`choice${c}`]}
                          </div>
                        );
                      })}
                      {q.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 mt-2">
                          <p className="font-semibold mb-1">{isAr ? 'التصحيح:' : 'Correction :'}</p>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {results.questions.length > 10 && (
              <button onClick={() => setShowAll(!showAll)}
                className="w-full mt-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2">
                {showAll
                  ? <><ChevronUp className="w-4 h-4" /> {isAr ? 'عرض أقل' : 'Réduire'}</>
                  : <><ChevronDown className="w-4 h-4" /> {isAr ? `عرض كل ${results.questions.length} سؤال` : `Voir les ${results.questions.length} questions`}</>}
              </button>
            )}
          </div>
        )}

        {/* CTA inscription */}
        <div className="rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
          <h3 className="text-white font-black text-2xl mb-3">
            {isAr ? '🚀 طوّر نفسك أكثر' : '🚀 Allez plus loin'}
          </h3>
          <p className="text-white/70 text-sm mb-6">
            {isAr
              ? 'اشترك في المنصة للوصول إلى أكثر من 600 سؤال، ممارسة يومية وتحليل مفصّل.'
              : "Accès à 600+ questions, entraînement quotidien et analyses détaillées."}
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-violet-900 bg-white hover:bg-gray-50 transition shadow-lg">
            <BookOpen className="w-4 h-4" />
            {isAr ? 'اشترك الآن' : "S'inscrire maintenant"}
          </Link>
        </div>
      </div>
    </div>
  );
}

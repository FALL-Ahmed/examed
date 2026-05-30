'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { examenBlancApi, settingsApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { Trophy, Clock, ChevronLeft, ChevronRight, CheckCircle2, BookOpen, Download } from 'lucide-react';

const EB_STATE_KEY = 'examen_blanc_state';
const EB_TEST_KEY = 'examen_blanc_test_state';
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

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTestMode = searchParams.get('mode') === 'test';
  const stateKey = isTestMode ? EB_TEST_KEY : EB_STATE_KEY;

  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [selectedQIdx, setSelectedQIdx] = useState<number>(0);
  const [showAll, setShowAll] = useState(false);
  const [resultsAt, setResultsAt] = useState<Date | null>(null);
  const [localState, setLocalState] = useState<any>(null);
  const [promo, setPromo] = useState<{ active: boolean; discount: number } | null>(null);

  useEffect(() => {
    settingsApi.promo().then((r) => setPromo(r.data)).catch(() => {});
  }, []);

  function handlePrint() {
    setShowAll(true);
    setTimeout(() => window.print(), 300);
  }

  const isMock = searchParams.get('mock') === '1';

  const load = useCallback(async () => {
    if (isMock) {
      setLocalState({ totalQ: 60, resultsAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(), participant: { prenom: 'Fatimetou', nom: '' } });
      setResults({ locked: true, score: 72.5, correctQ: 43, totalQ: 60, answeredQ: 58, resultsAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(), participant: { prenom: 'Fatimetou' } });
      setResultsAt(new Date(Date.now() + 20 * 3600 * 1000));
      setLoading(false);
      return;
    }
    const raw = localStorage.getItem(stateKey);
    if (!raw) { router.replace('/examen-blanc'); return; }
    let state: any;
    try { state = JSON.parse(raw); } catch { router.replace('/examen-blanc'); return; }
    if (!state.sessionId) { router.replace('/examen-blanc'); return; }
    if (!state.isCompleted) {
      router.replace(isTestMode ? '/examen-blanc/exam?mode=test' : '/examen-blanc/exam');
      return;
    }
    setLocalState(state);

    try {
      const { data } = await examenBlancApi.results(state.sessionId);
      if (data.isTestExpired) {
        setResults({ isTestExpired: true });
      } else {
        setResults(data);
        if (data.locked && data.resultsAt) setResultsAt(new Date(data.resultsAt));
      }
    } catch {
      if (isTestMode) {
        setResults({ isTestExpired: true });
      } else {
        setResults(null);
      }
    } finally {
      setLoading(false);
    }
  }, [router, isMock]);

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

  if (results?.isTestExpired) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
      <div className="text-4xl mb-4">🧪</div>
      <h2 className="text-white font-black text-2xl mb-2">Session test expirée</h2>
      <p className="text-white/50 text-sm mb-6">Cette session de test a été supprimée de la base de données.<br/>Relancez un nouveau test depuis le panneau admin.</p>
      <Link href="/admin/examen-blanc" className="px-6 py-3 rounded-xl font-bold text-white text-sm"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
        ← Retour admin
      </Link>
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
          <div className="rounded-3xl p-8 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#6366f1 50%,#4f46e5 100%)' }}>
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
            <div className="relative z-10">
              <div className="text-5xl mb-3">🏆</div>
              <p className="text-white font-bold text-sm uppercase tracking-widest mb-1">
                {isAr ? 'ترتيبك الوطني' : 'Classement national'}
              </p>
              <p className="text-white font-black text-7xl tracking-tight leading-none mb-2">
                {revealTime}
              </p>
              <p className="text-white font-medium text-sm">
                {isAr ? 'موعد الكشف عن النتائج' : 'Heure de révélation du classement'}
              </p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-white/90 text-sm font-semibold">
                  {isAr ? '🔍 استخدم رقم هاتفك للعودة إلى نتائجك' : '🔍 Utilise ton numéro de téléphone pour retrouver tes résultats'}
                </p>
              </div>
            </div>
          </div>

          {/* Témoignages */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest text-center mb-4">
              {isAr ? 'انضموا إلى +600 سؤال على Al Bourour' : 'Ils ont rejoint les +600 QCM d\'Al Bourour'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {(isAr ? [
                { name: 'مريم', role: 'ممرضة', img: '/images/ar-com-1.jpeg' },
                { name: 'سيدي', role: 'ممرض', img: '/images/ar-com-2.jpeg' },
              ] : [
                { name: 'Fatimetou', role: 'Infirmière', img: '/images/fr-com-1.jpeg' },
                { name: 'Mohamed',   role: 'Infirmier',  img: '/images/fr-com-2.png'  },
              ]).map(t => (
                <div key={t.name} className="flex flex-col items-center text-center">
                  <div className="mb-2 overflow-hidden rounded-xl w-full">
                    <img src={t.img} alt={t.name} className="w-full h-auto object-contain" />
                  </div>
                  <p className="font-bold text-white text-sm">{t.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA inscription */}
          <div className="rounded-3xl p-6 text-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <h3 className="text-white font-black text-lg mb-2">
              {isAr ? '🚀 هل تريد التحضير أكثر؟' : '🚀 Vous voulez vous préparer davantage ?'}
            </h3>
            <p className="text-white/70 text-sm mb-4">
              {isAr
                ? 'وصول كامل لجميع الأسئلة والتحليلات المفصّلة.'
                : 'Accès complet à toutes les questions et analyses.'}
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-violet-900 bg-white hover:bg-gray-50 transition shadow-lg text-sm">
              <BookOpen className="w-4 h-4" />
              {isAr ? 'التسجيل' : "S'inscrire"}
            </Link>
          </div>

          {/* Instructions */}
          <div className="text-white/30 text-sm text-center">
            <p>{isAr ? '📱 يمكنك إغلاق هذه الصفحة والعودة لاحقاً' : '📱 Tu peux fermer cette page et revenir plus tard'}</p>
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
    <style>{`
      @media print {
        body { background: white !important; font-family: Arial, sans-serif; }
        .no-print { display: none !important; }
        .print-header { display: block !important; }
        .print-all-qs { display: block !important; }
        .print-break { page-break-before: always; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      .print-header { display: none; }
      .print-all-qs { display: none; }
    `}</style>

      {/* Print header — invisible à l'écran, visible à l'impression */}
      <div className="print-header p-8 border-b-2 border-gray-300">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Al Bourour — Examen Blanc National</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{results.participant?.prenom} {results.participant?.nom}</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{results.participant?.ville}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32, marginTop: 12 }}>
          <div><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Score</p><p style={{ fontSize: 28, fontWeight: 900, margin: 0, color: passed ? '#059669' : '#d97706' }}>{results.score?.toFixed(1)}% — {noteOn20}/20</p></div>
          <div><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Classement</p><p style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{results.classement}/{results.totalParticipants}</p></div>
          <div><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Correctes</p><p style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{results.correctQ}/{results.totalQ}</p></div>
          <div><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Temps</p><p style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{formatTime(results.timeTaken || 0)}</p></div>
        </div>
      </div>

      {/* Print-only: toutes les questions */}
      <div className="print-all-qs" style={{ padding: '24px 40px', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontWeight: 900, fontSize: 16, marginBottom: 20, borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}>
          Correction détaillée — {results.questions?.length} questions
        </p>
        {results.questions?.map((q: any, idx: number) => {
          const correctAnswers = (q.correctAnswer ?? '').toUpperCase().split(',').map((x: string) => x.trim()).filter(Boolean);
          const userAnswers = (q.userAnswer ?? '').toUpperCase().split(',').map((x: string) => x.trim()).filter(Boolean);
          const notAnswered = !q.userAnswer;
          return (
            <div key={idx} style={{ marginBottom: 20, pageBreakInside: 'avoid', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 6px', color: '#111827' }}>
                Q{idx + 1}. {q.text}
                <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 900, color: q.partialScore > 0 ? '#059669' : q.partialScore < 0 ? '#dc2626' : '#9ca3af' }}>
                  {q.partialScore > 0 ? '+' : ''}{q.partialScore?.toFixed(2)} pt
                </span>
              </p>
              {notAnswered && (
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', fontStyle: 'italic' }}>Non répondu</p>
              )}
              {['A', 'B', 'C', 'D', 'E'].filter(c => q[`choice${c}`]).map(c => {
                const isCorr = correctAnswers.includes(c);
                const wasSel = userAnswers.includes(c);
                const color = isCorr ? '#059669' : wasSel ? '#dc2626' : '#6b7280';
                const bullet = isCorr && wasSel ? '✓' : isCorr ? '→' : wasSel ? '✗' : '○';
                return (
                  <p key={c} style={{ margin: '2px 0', paddingLeft: 12, fontSize: 12, color, fontWeight: isCorr || wasSel ? 700 : 400 }}>
                    {bullet} {c}. {q[`choice${c}`]}
                    {isCorr && !wasSel ? '  ← bonne réponse' : ''}
                    {wasSel && !isCorr ? '  ← ta réponse' : ''}
                    {isCorr && wasSel ? '  ← ta réponse ✓' : ''}
                  </p>
                );
              })}
              {q.explanation && (
                <p style={{ margin: '8px 0 0', padding: '6px 10px', background: '#eff6ff', borderLeft: '3px solid #3b82f6', color: '#1e40af', fontSize: 11, lineHeight: 1.5 }}>
                  💬 {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Hero results */}
      <div className="relative overflow-hidden no-print" style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
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
          <p className="text-2xl font-bold text-violet-300 mb-3">{noteOn20}/20</p>
          <p className="text-sm text-white/70 italic mb-8 max-w-xs mx-auto">
            {isAr ? (
              results.score < 30 ? 'بداية عادية، عرفت نِقَاط ضعفك، والآن وقت التّحسّن.'
              : results.score < 60 ? 'بداية جيّدة، عندك أساس قوي، وبقليل من الجهد تطلع بسرعة.'
              : results.score < 75 ? 'أنت فوق المتوسّط، مع شغل مركز توصل لمستوى مُطْمَئِن.'
              : 'مستوى ممتاز، حافظ على هذا الإيقاع لتبقى من الأوائل يوم الامتحان.'
            ) : (
              results.score < 30 ? 'Début normal : tu as identifié tes lacunes, maintenant on les travaille.'
              : results.score < 60 ? 'Bon début, tu as les bases : avec du travail ciblé, tu peux vite monter.'
              : results.score < 75 ? 'Au-dessus de la moyenne : quelques ajustements et tu sécurises le concours.'
              : "Excellent niveau : continue comme ça pour rester dans le top jusqu'au jour J."
            )}
          </p>

          {/* Rang — mis en valeur */}
          <div className="bg-amber-400/10 border-2 border-amber-400/40 rounded-3xl px-8 py-5 max-w-xs mx-auto mb-6">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1" />
            <p className="text-amber-300 text-sm font-bold mb-1">{isAr ? 'ترتيبك الوطني' : 'Ton rang national'}</p>
            <p className="text-white font-black text-5xl">
              {results.classement}<span className="text-2xl text-white/40">/{results.totalParticipants}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
            {[
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

          <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">

            {/* Bouton CTA principal */}
            <Link href="/register"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-extrabold text-white text-base transition hover:opacity-90 shadow-lg shadow-violet-900/40"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-4 h-4" />
              {promo?.active
                ? (isAr ? `استفد من -${promo.discount}% وواصل التدريب` : `Profiter de -${promo.discount} % et continuer à s'entraîner`)
                : (isAr ? 'واصل التدريب على المنصة' : "Continuer à s'entraîner sur la plateforme")}
            </Link>

            {/* Bloc avantages */}
            <div className="w-full bg-white/10 border border-white/15 rounded-2xl px-5 py-4 space-y-2">
              <div className="text-sm text-white/70 space-y-1">
                <p>✅ {isAr ? '600+ سؤال اختياري 🩺💊💉' : '600+ QCM 🩺💊💉'}</p>
                <p>✅ {isAr ? 'إحصائيات تفصيلية' : 'Statistiques détaillées'}</p>
                <p>✅ {isAr ? 'الترتيب الوطني الكامل' : 'Classement national complet'}</p>
              </div>
              {promo?.active && (
                <Link href="/register"
                  className="block px-3 py-2.5 rounded-xl bg-yellow-400/20 border border-yellow-400/50 text-center hover:bg-yellow-400/30 transition">
                  <p className="text-yellow-300 font-extrabold text-sm tracking-wide">
                    🔥 {isAr ? `عرض خاص : -${promo.discount}% على التسجيل اليوم` : `Offre spéciale : -${promo.discount} % sur l'inscription aujourd'hui`}
                  </p>
                </Link>
              )}
            </div>

            <button onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-800 bg-white hover:bg-gray-100 transition shadow-sm">
              <Download className="w-3.5 h-3.5" />
              {isAr ? 'تحميل نتائجي PDF' : 'Télécharger mes résultats en PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Question review — grille numérotée */}
        {results.questions?.length > 0 && (() => {
          const qs = results.questions;
          const q = qs[selectedQIdx];
          const correctAnswers = q?.correctAnswer?.toUpperCase().split(',').map((x: string) => x.trim()) ?? [];
          const userAnswers = q?.userAnswer?.toUpperCase().split(',').map((x: string) => x.trim()) ?? [];
          const notAnswered = !q?.userAnswer;

          return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h2 className="font-black text-gray-900 text-lg mb-4">
                  {isAr ? '🔍 مراجعة الأسئلة' : '🔍 Correction des questions'}
                </h2>
                {/* Grille numérotée */}
                <div className="flex flex-wrap gap-1.5">
                  {qs.map((item: any, idx: number) => {
                    const noAnswer = !item.userAnswer;
                    const bg = noAnswer ? 'bg-gray-100 text-gray-400' : item.isCorrect ? 'bg-emerald-500 text-white' : item.partialScore > 0 ? 'bg-amber-400 text-white' : 'bg-red-500 text-white';
                    const ring = selectedQIdx === idx ? 'ring-2 ring-offset-1 ring-violet-500' : '';
                    return (
                      <button key={idx} onClick={() => setSelectedQIdx(idx)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${bg} ${ring} hover:opacity-80`}>
                        {noAnswer ? '×' : idx + 1}
                      </button>
                    );
                  })}
                </div>
                {/* Légende */}
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> {isAr ? 'صحيح' : 'Correct'}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> {isAr ? 'جزئي' : 'Partiel'}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> {isAr ? 'خطأ' : 'Faux'}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> {isAr ? 'لم يُجب' : 'Non répondu'}</span>
                </div>
              </div>

              {/* Question active */}
              {q && (
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">{isAr ? 'السؤال' : 'Question'} {selectedQIdx + 1}/{qs.length}</p>
                      <p className="text-gray-800 font-semibold text-sm leading-relaxed">{q.text}</p>
                    </div>
                    <span className={`flex-shrink-0 text-sm font-black px-2 py-1 rounded-lg ${q.partialScore > 0 ? 'bg-emerald-50 text-emerald-600' : q.partialScore < 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                      {q.partialScore > 0 ? '+' : ''}{q.partialScore?.toFixed(2)}
                    </span>
                  </div>

                  {q.imageUrl && <img src={q.imageUrl} alt="" className="rounded-xl max-h-48 object-contain" />}

                  {notAnswered && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 text-center">
                      {isAr ? '— لم تُجب على هذا السؤال —' : '— Question non répondue —'}
                    </div>
                  )}

                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D', 'E'].filter(c => q[`choice${c}`]).map(c => {
                      const isCorr = correctAnswers.includes(c);
                      const wasSel = userAnswers.includes(c);
                      return (
                        <div key={c} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm border
                          ${isCorr ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : wasSel ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-gray-50 border-transparent text-gray-500'}`}>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                            ${isCorr ? 'bg-emerald-500 text-white' : wasSel ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {isCorr ? '✓' : wasSel ? '✗' : c}
                          </span>
                          <span>{q[`choice${c}`]}</span>
                          {isCorr && <span className="ml-auto text-emerald-600 text-xs font-bold">{isAr ? 'صحيح' : 'Bonne réponse'}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                      <p className="font-bold mb-1">💬 {isAr ? 'التصحيح' : 'Commentaire'}</p>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2 no-print">
                    <button onClick={() => setSelectedQIdx(i => Math.max(0, i - 1))} disabled={selectedQIdx === 0}
                      className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition disabled:opacity-30">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-gray-400 text-xs">{selectedQIdx + 1} / {qs.length}</span>
                    <button onClick={() => setSelectedQIdx(i => Math.min(qs.length - 1, i + 1))} disabled={selectedQIdx === qs.length - 1}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-30"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                      {isAr ? 'التالي' : 'Suivante'} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* CTA inscription */}
        <div className="no-print rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
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

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
        <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}

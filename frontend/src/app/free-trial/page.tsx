'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowRight, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { publicApi } from '@/lib/api';

const THEMES = [
  { key: 'Paludisme',     label: 'Paludisme',      labelAr: 'الملاريا' },
  { key: 'Pédiatrie',     label: 'Pédiatrie',       labelAr: 'طب الأطفال' },
  { key: 'Lavage',        label: 'Lavage des mains', labelAr: 'غسل اليدين' },
];

function FreeTrialContent() {
  const searchParams = useSearchParams();
  const themeKey = searchParams.get('theme') || 'Paludisme';

  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const [questions, setQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAr = lang === 'ar';

  useEffect(() => {
    setLoading(true);
    publicApi.freeTrial(themeKey)
      .then((r) => { setQuestions(r.data); setLoading(false); })
      .catch(() => { setError('Impossible de charger les questions.'); setLoading(false); });
  }, [themeKey]);

  const q = questions[index];
  const choices = q ? ['A', 'B', 'C', 'D', ...(q.choiceE ? ['E'] : [])].filter((c) => q[`choice${c}`]) : [];
  const correctAnswers = q?.correctAnswer?.split(',').map((s: string) => s.trim()) ?? [];

  function handleSelect(choice: string) {
    if (revealed) return;
    setSelected(choice);
    setRevealed(true);
    if (correctAnswers.includes(choice)) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) { setDone(true); return; }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }

  const themeLabel = isAr
    ? (THEMES.find((t) => t.key === themeKey)?.labelAr ?? themeKey)
    : (THEMES.find((t) => t.key === themeKey)?.label ?? themeKey);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || questions.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 text-center px-6">
      <p className="text-gray-500">{error || 'Aucune question disponible pour ce thème pour le moment.'}</p>
      <Link href="/" className="text-violet-600 font-semibold hover:underline">← Retour à l'accueil</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm text-gray-900">{isAr ? 'البورور' : 'Al Bourour'}</span>
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            🎁 {isAr ? `تجربة مجانية — ${themeLabel}` : `Essai gratuit — ${themeLabel}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(isAr ? 'fr' : 'ar')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            {isAr ? 'Français' : 'العربية'}
          </button>
          <Link href="/register"
            className="text-xs font-bold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {isAr ? 'إنشاء حساب ←' : 'Créer mon compte →'}
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Sélecteur de thème */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {THEMES.map((t) => (
            <Link key={t.key} href={`/free-trial?theme=${t.key}`}
              className={`text-sm font-semibold px-3 py-1.5 rounded-full border-2 transition
                ${themeKey === t.key ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {isAr ? t.labelAr : t.label}
            </Link>
          ))}
        </div>

        {done ? (
          /* Résultat final */
          <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-sm">
            <div className="text-5xl mb-4">{score >= questions.length * 0.7 ? '🎉' : '💪'}</div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              {score}/{questions.length} {isAr ? 'إجابة صحيحة' : `correct${score > 1 ? 'es' : 'e'}`}
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              {score >= questions.length * 0.7
                ? (isAr ? 'ممتاز! أنت تتقن هذا الموضوع.' : 'Excellent ! Vous maîtrisez ce thème.')
                : (isAr ? 'واصل التدرّب للتقدم أكثر.' : 'Continuez à pratiquer pour progresser.')}
            </p>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                {isAr ? <>الوصول إلى <strong>300+ سؤال</strong> في جميع المواضيع</> : <>Accédez à <strong>300+ questions</strong> sur tous les thèmes</>}
              </p>
              <Link href="/register"
                className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-2xl text-sm text-white hover:opacity-90 transition shadow-md shadow-violet-200"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                {isAr ? 'إنشاء حسابي مجاناً' : 'Créer mon compte gratuitement'} <ArrowRight className="w-4 h-4" />
              </Link>
              <div>
                <button onClick={() => { setIndex(0); setSelected(null); setRevealed(false); setScore(0); setDone(false); }}
                  className="text-sm text-violet-600 font-semibold hover:underline mt-2">
                  {isAr ? 'إعادة المحاولة' : 'Recommencer'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Question */
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Progress */}
            <div className="h-1.5 bg-gray-100">
              <div className="h-full bg-violet-500 transition-all duration-500"
                style={{ width: `${((index) / questions.length) * 100}%` }} />
            </div>

            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{themeLabel}</span>
                <span className="text-xs font-semibold text-gray-400">{index + 1} / {questions.length}</span>
              </div>

              <p className="text-lg font-bold text-gray-900 leading-snug mb-8" dir={isAr ? 'rtl' : 'ltr'}>{q.text}</p>

              <div className="space-y-3 mb-6">
                {choices.map((c) => {
                  const isCorrect = correctAnswers.includes(c);
                  const isSelected = selected === c;
                  let cls = 'border-gray-200 bg-white text-gray-700 hover:border-violet-300';
                  if (revealed) {
                    if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800';
                    else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-700';
                    else cls = 'border-gray-100 bg-gray-50 text-gray-400';
                  }
                  return (
                    <button key={c} onClick={() => handleSelect(c)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left text-sm font-medium transition-all ${cls}`}>
                      <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{c}</span>
                      <span className="flex-1">{q[`choice${c}`]}</span>
                      {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {revealed && q.explanation && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-sm text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">{isAr ? 'الشرح' : 'Explication'}</p>
                  <p dir={isAr ? 'rtl' : 'ltr'}>{q.explanation}</p>
                </div>
              )}

              {revealed && (
                <button onClick={next}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white hover:opacity-90 transition shadow-md shadow-violet-200"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                  {index + 1 >= questions.length
                    ? (isAr ? 'عرض نتيجتي' : 'Voir mon résultat')
                    : (isAr ? 'السؤال التالي' : 'Question suivante')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* CTA bas de page */}
        {!done && (
          <p className="text-center text-xs text-gray-400 mt-6">
            {isAr ? 'تجربة مجانية · 3 مواضيع متاحة · ' : 'Essai gratuit · 3 thèmes disponibles · '}
            <Link href="/register" className="text-violet-600 font-semibold hover:underline">
              {isAr ? 'الوصول إلى 300+ سؤال ←' : 'Accéder aux 300+ questions →'}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function FreeTrialPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FreeTrialContent />
    </Suspense>
  );
}

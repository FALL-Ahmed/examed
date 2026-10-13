'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/components/LanguageProvider';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Trophy } from 'lucide-react';
import { ConcoursShell, WINNERS_COUNT, concoursTheme, fmtDate, fmtTime, toNote20 } from './_shared';

const pad = (n: number) => String(n).padStart(2, '0');
const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h${pad(m)}` : `${pad(m)}:${pad(s)}`;
};

// Correction question par question, comme la page de résultat des examens blancs
function CorrectionReview({ questions, isAr, accent }: { questions: any[]; isAr: boolean; accent: string }) {
  const [idx, setIdx] = useState(0);
  const q = questions[idx];
  const correct = q?.correctAnswer?.toUpperCase().split(',').map((x: string) => x.trim()) ?? [];
  const picked = q?.userAnswer?.toUpperCase().split(',').map((x: string) => x.trim()) ?? [];
  const notAnswered = !q?.userAnswer;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-start" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <h2 className="font-black text-gray-900 text-lg mb-4">{isAr ? '🔍 مراجعة الأسئلة' : '🔍 Correction des questions'}</h2>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((item, i) => {
            const bg = !item.userAnswer ? 'bg-gray-100 text-gray-400'
              : item.isCorrect ? 'bg-emerald-500 text-white'
              : item.partialScore > 0 ? 'bg-amber-400 text-white' : 'bg-red-500 text-white';
            return (
              <button key={i} onClick={() => setIdx(i)} aria-label={`${isAr ? 'السؤال' : 'Question'} ${i + 1}`}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all hover:opacity-80 ${bg} ${idx === i ? 'ring-2 ring-offset-1 ring-violet-500' : ''}`}>
                {!item.userAnswer ? '×' : i + 1}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> {isAr ? 'صحيح' : 'Correct'}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> {isAr ? 'جزئي' : 'Partiel'}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> {isAr ? 'خطأ' : 'Faux'}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> {isAr ? 'لم يُجب' : 'Non répondu'}</span>
        </div>
      </div>

      {q && (
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">{isAr ? 'السؤال' : 'Question'} {idx + 1}/{questions.length}</p>
              <p className="text-gray-800 font-semibold text-sm leading-relaxed" dir="auto">{q.text}</p>
            </div>
            <span className={`flex-shrink-0 text-sm font-black px-2 py-1 rounded-lg ${q.partialScore > 0 ? 'bg-emerald-50 text-emerald-600' : q.partialScore < 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
              {q.partialScore > 0 ? '+' : ''}{(q.partialScore ?? 0).toFixed(2)}
            </span>
          </div>

          {q.imageUrl && <img src={q.imageUrl} alt="" className="rounded-xl max-h-48 object-contain" />}

          {notAnswered && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 text-center">
              {isAr ? '— لم تُجب على هذا السؤال —' : '— Question non répondue —'}
            </div>
          )}

          <div className="space-y-2">
            {['A', 'B', 'C', 'D', 'E'].filter((c) => q[`choice${c}`]).map((c) => {
              const isCorr = correct.includes(c);
              const wasSel = picked.includes(c);
              const good = isCorr && wasSel;
              const missed = isCorr && !wasSel;
              const wrong = !isCorr && wasSel;
              return (
                <div key={c} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm border
                  ${good ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : missed ? 'bg-amber-50 border-amber-200 text-amber-800' : wrong ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-transparent text-gray-500'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                    ${good ? 'bg-emerald-500 text-white' : missed ? 'bg-amber-400 text-white' : wrong ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {good ? '✓' : wrong ? '✗' : c}
                  </span>
                  <span dir="auto">{q[`choice${c}`]}</span>
                  {missed && <span className="ms-auto text-amber-600 text-xs font-bold whitespace-nowrap">{isAr ? 'فاتتك' : 'manquée'}</span>}
                  {good && <span className="ms-auto text-emerald-600 text-xs font-bold whitespace-nowrap">{isAr ? 'صحيح ✓' : 'Bonne réponse ✓'}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> {isAr ? 'أجبت صح' : 'Bonne réponse cochée'}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> {isAr ? 'فاتتك' : 'Manquée'}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> {isAr ? 'أجبت خطأ' : 'Mauvais choix coché'}</span>
          </div>

          {q.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              <p className="font-bold mb-1">💬 {isAr ? 'التصحيح' : 'Commentaire'}</p>
              <p className="leading-relaxed" dir="auto">{q.explanation}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} aria-label={isAr ? 'السابق' : 'Précédente'}
              className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-30">
              <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
            </button>
            <span className="text-gray-400 text-xs">{idx + 1} / {questions.length}</span>
            <button onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))} disabled={idx === questions.length - 1}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-30"
              style={{ background: accent }}>
              {isAr ? 'التالي' : 'Suivante'} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Phrase d'encouragement selon la note (comme les examens blancs, sans référence au concours)
function encouragement(score: number, isAr: boolean) {
  if (isAr) {
    return score < 30 ? 'بداية عادية: عرفت نقاط ضعفك، والآن وقت التحسّن.'
      : score < 60 ? 'بداية جيدة: عندك أساس قوي، وبقليل من الجهد تتقدم بسرعة.'
      : score < 75 ? 'أنت فوق المتوسط: مع عمل مركّز تصل إلى مستوى مطمئن.'
      : 'مستوى ممتاز: حافظ على هذا الإيقاع لتبقى من الأوائل.';
  }
  return score < 30 ? 'Début normal : vous avez identifié vos lacunes, maintenant on les travaille.'
    : score < 60 ? 'Bon début : vous avez les bases, avec du travail ciblé vous pouvez vite progresser.'
    : score < 75 ? 'Au-dessus de la moyenne : quelques ajustements et vous atteignez un niveau rassurant.'
    : 'Excellent niveau : continuez comme ça pour rester parmi les meilleurs.';
}

// Affichage du résultat d'un participant (verrouillé avant la date de publication)
export function ResultsView({ target, res, error, isTest }: { target: string; res: any; error?: string; isTest?: boolean }) {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const th = concoursTheme(target);

  const card = `rounded-3xl border p-6 sm:p-8 text-center ${th.card}`;

  return (
    <ConcoursShell target={target}>
      <div className="max-w-xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {isTest && (
          <p className="text-center text-xs font-black tracking-wide bg-amber-400 text-gray-900 rounded-full py-1">🧪 MODE TEST ADMIN — hors classement</p>
        )}
        {error ? (
          <div className={card}>
            <p className="text-white font-semibold">{error}</p>
            <Link href={`/concours/exam?target=${target}`} className={`inline-block mt-4 text-sm font-semibold hover:underline ${th.accentText}`}>
              {isAr ? 'العودة إلى التحدي' : 'Retour au challenge'}
            </Link>
          </div>
        ) : res.locked ? (
          <div className={card}>
            <p className="text-5xl mb-3">✅</p>
            <h1 className="text-xl font-black text-white">{isAr ? 'تم تسجيل مشاركتك' : 'Participation enregistrée'}</h1>
            <p className={`${th.textDim} text-sm mt-2`}>
              {isAr ? `أجبت على ${res.answeredQ} من ${res.totalQ} سؤال.` : `Vous avez répondu à ${res.answeredQ} questions sur ${res.totalQ}.`}
            </p>
            <div className={`mt-6 rounded-2xl border p-4 ${th.highlight}`}>
              <p className="text-white/90 text-sm">{isAr ? 'النتائج والترتيب يوم' : 'Résultats et classement le'}</p>
              <p className="text-white font-bold mt-1">{fmtDate(res.resultsAt, isAr)} · {fmtTime(res.resultsAt, isAr)}</p>
            </div>
            <p className={`${th.textFaint} text-xs mt-4`}>
              {isAr
                ? `سيتم التواصل مع أفضل ${WINNERS_COUNT} عبر واتساب على ${res.participant?.telephone ?? ''}.`
                : `Les ${WINNERS_COUNT} premiers seront contactés sur WhatsApp au ${res.participant?.telephone ?? ''}.`}
            </p>
          </div>
        ) : (
          <>
            <div className={card}>
              <p className={`${th.textMuted} text-sm`}>{res.participant?.prenom} {res.participant?.nom}</p>
              <p className="text-5xl font-black text-white mt-2 tabular-nums">
                {toNote20(res.score)}<span className="text-2xl text-white/40">/20</span>
              </p>
              <p className={`${th.textDim} text-sm italic mt-2 max-w-xs mx-auto`}>{encouragement(res.score ?? 0, isAr)}</p>

              <div className={`mt-6 rounded-2xl border p-4 ${th.softCard}`}>
                <Trophy className={`w-7 h-7 mx-auto mb-1 ${th.accentText}`} />
                <p className={`${th.textMuted} text-xs`}>{isAr ? 'ترتيبك' : 'Votre classement'}</p>
                <p className="text-4xl font-black text-white tabular-nums">
                  {res.classement}<span className="text-lg text-white/40"> / {res.completedParticipants}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { icon: CheckCircle2, val: `${res.correctQ}/${res.totalQ}`, label: isAr ? 'إجابات صحيحة' : 'Correctes' },
                  { icon: Clock, val: formatDuration(res.timeTaken || 0), label: isAr ? 'الوقت' : 'Temps' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-2xl border p-3 ${th.softCard}`}>
                    <s.icon className={`w-5 h-5 mx-auto mb-1 ${th.accentText}`} />
                    <p className="text-white font-black text-lg tabular-nums" dir="ltr">{s.val}</p>
                    <p className={`${th.textFaint} text-xs`}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {res.classement <= WINNERS_COUNT ? (
              <div className={`rounded-3xl p-6 text-center border ${th.highlight}`}>
                <Trophy className={`w-10 h-10 mx-auto mb-2 ${th.accentText}`} />
                <p className="text-white font-black text-lg">{isAr ? `أنت ضمن أفضل ${WINNERS_COUNT}!` : `Vous êtes dans le top ${WINNERS_COUNT} !`}</p>
                <p className={`${th.textDim} text-sm mt-2`}>
                  {isAr
                    ? 'سنتواصل معك عبر واتساب بعد التحقق لتفعيل اشتراك Premium المجاني.'
                    : 'Après vérification, nous vous contactons sur WhatsApp pour activer votre Premium gratuit.'}
                </p>
              </div>
            ) : (
              <div className={card}>
                <p className="text-white font-bold">{isAr ? 'شكراً على مشاركتك!' : 'Merci pour votre participation !'}</p>
                <p className={`${th.textDim} text-sm mt-2`}>
                  {isAr ? 'واصل التدرب على آلاف الأسئلة المصححة.' : 'Continuez à vous entraîner sur des milliers de questions corrigées.'}
                </p>
                <Link href="/register?plan=FREEMIUM" className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl font-bold text-white" style={{ background: th.accent }}>
                  {isAr ? 'جرّب مجاناً' : 'Essayer gratuitement'} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            )}

            {res.questions?.length > 0 && <CorrectionReview questions={res.questions} isAr={isAr} accent={th.accent} />}
          </>
        )}

        <Link href={`/concours/classement?target=${target}`} className={`flex items-center justify-center gap-2 hover:text-white text-sm transition ${th.textDim}`}>
          <Trophy className="w-4 h-4" /> {isAr ? 'الترتيب العام' : 'Voir le classement'}
        </Link>
      </div>
    </ConcoursShell>
  );
}

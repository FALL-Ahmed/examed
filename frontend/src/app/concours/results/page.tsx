'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { ChevronRight, Trophy } from 'lucide-react';
import {
  ConcoursShell, Spinner, WINNERS_COUNT, concoursTheme, fmtDate, fmtTime, readConcoursState, toNote20,
} from '../_shared';

function ResultsContent() {
  const router = useRouter();
  const isTest = useSearchParams().get('mode') === 'test';
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [state, setState] = useState<any>(null);
  const [res, setRes] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = readConcoursState(isTest);
    if (!s?.sessionId) { router.replace('/concours'); return; }
    setState(s);
    examenBlancApi.results(s.sessionId)
      .then((r) => setRes(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Erreur'));
  }, [router, isTest]);

  if (!state || (!res && !error)) return <Spinner target={state?.target} />;
  const target = state.target ?? 'INFIRMIER';
  const th = concoursTheme(target);

  const card = `rounded-3xl border p-6 sm:p-8 text-center ${th.card}`;

  return (
    <ConcoursShell target={target}>
      <div className="max-w-md mx-auto px-4 pt-4 pb-16 space-y-5">
        {isTest && (
          <p className="text-center text-xs font-black tracking-wide bg-amber-400 text-gray-900 rounded-full py-1">🧪 MODE TEST ADMIN — hors classement</p>
        )}
        {error ? (
          <div className={card}>
            <p className="text-white font-semibold">{error}</p>
            <Link href={`/concours/exam?target=${target}`} className={`inline-block mt-4 text-sm font-semibold hover:underline ${th.accentText}`}>
              {isAr ? 'العودة إلى المسابقة' : 'Retour au concours'}
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
              <p className={`${th.textDim} text-sm mt-1`}>
                {isAr ? `${res.correctQ} إجابة صحيحة من ${res.totalQ}` : `${res.correctQ} bonnes réponses sur ${res.totalQ}`}
              </p>
              <div className={`mt-6 rounded-2xl border p-4 ${th.softCard}`}>
                <p className={`${th.textMuted} text-xs`}>{isAr ? 'ترتيبك' : 'Votre classement'}</p>
                <p className="text-3xl font-black text-white tabular-nums">
                  {res.classement}<span className="text-base text-white/40"> / {res.completedParticipants}</span>
                </p>
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
                  {isAr ? 'واصل التدرب على آلاف الأسئلة استعداداً للمسابقة.' : 'Continuez à vous entraîner sur des milliers de questions pour le concours.'}
                </p>
                <Link href="/register?plan=FREEMIUM" className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl font-bold text-white" style={{ background: th.accent }}>
                  {isAr ? 'جرّب مجاناً' : 'Essayer gratuitement'} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            )}
          </>
        )}

        <Link href={`/concours/classement?target=${target}`} className={`flex items-center justify-center gap-2 hover:text-white text-sm transition ${th.textDim}`}>
          <Trophy className="w-4 h-4" /> {isAr ? 'الترتيب العام' : 'Voir le classement'}
        </Link>
      </div>
    </ConcoursShell>
  );
}

export default function ConcoursResultsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResultsContent />
    </Suspense>
  );
}

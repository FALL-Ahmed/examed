'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/components/LanguageProvider';
import { Trophy, ChevronRight } from 'lucide-react';
import { ConcoursShell, PROFESSION, WINNERS_COUNT, CHALLENGE_TITLE, concoursHome, concoursTheme } from './_shared';
import { ResultsLookup } from './_results-lookup';

const pad = (n: number) => String(n).padStart(2, '0');

// Compte à rebours jusqu'à la publication (jours inclus : les résultats peuvent être à plusieurs jours)
function Countdown({ target }: { target: Date }) {
  const [left, setLeft] = useState(() => Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return <span className="font-black tabular-nums" dir="ltr">{d > 0 ? `${d}j ` : ''}{pad(h)}:{pad(m)}:{pad(s)}</span>;
}

// Même présentation que le classement des examens blancs : pas de liste publique de noms,
// le nombre de participants, et chacun consulte son rang sur sa propre page de résultat.
export function ClassementView({ target, data, mine }: { target: 'INFIRMIER' | 'SAGE_FEMME'; data: any; mine?: any }) {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const th = concoursTheme(target);

  const profLabel = isAr ? (target === 'SAGE_FEMME' ? 'القابلات' : 'الممرضين') : PROFESSION[target].fr;
  const isLocked = !data.empty && data.locked;
  const btn = 'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition hover:opacity-90';

  return (
    <ConcoursShell target={target}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-16">
        {/* En-tête */}
        <div className="text-center mb-10">
          <Trophy className={`w-14 h-14 mx-auto mb-4 ${target === 'SAGE_FEMME' ? 'text-white' : 'text-amber-400'}`} />
          <h1 className="text-3xl font-black text-white mb-2">{isAr ? 'الترتيب' : 'Classement'}</h1>
          <p className={`${th.textMuted} text-sm`}>
            {isAr ? CHALLENGE_TITLE.ar : CHALLENGE_TITLE.fr} · {profLabel}
          </p>
          {data.total > 0 && (
            <p className={`${th.textFaint} text-sm mt-1`}>{isAr ? `${data.total} مشارك` : `${data.total} participants`}</p>
          )}
        </div>

        {data.empty ? (
          <div className={`rounded-3xl border p-8 text-center ${th.card}`}>
            <div className="text-5xl mb-4">📅</div>
            <p className="text-white font-semibold">{isAr ? 'لا يوجد تحدٍّ حالياً' : 'Aucun challenge pour le moment'}</p>
            <Link href={concoursHome(target)} className={`${btn} mt-6`} style={{ background: th.accent }}>
              {isAr ? 'رجوع للرئيسية' : "Retour à l'accueil"} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        ) : isLocked ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-white font-black text-xl mb-3">
              {isAr ? 'الترتيب غير متاح بعد' : 'Classement pas encore disponible'}
            </h2>
            {data.resultsAt && (
              <p className={`${th.accentText} font-bold text-lg`}>
                {isAr ? 'متاح خلال ' : 'Disponible dans '}<Countdown target={new Date(data.resultsAt)} />
              </p>
            )}
            <Link href={concoursHome(target)} className={`${btn} mt-8`} style={{ background: th.accent }}>
              {isAr ? 'رجوع للرئيسية' : "Retour à l'accueil"} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        ) : (
          <div className={`rounded-3xl border p-8 text-center ${th.card}`}>
            <div className="text-5xl mb-4">📊</div>
            <p className="text-white text-lg font-semibold">
              {isAr ? `${data.total} مشارك أتمّوا التحدي` : `${data.total} participants ont terminé le challenge`}
            </p>
            <p className={`${th.textDim} text-sm mt-3 leading-relaxed`}>
              {isAr
                ? 'النتائج متاحة بشكل فردي عبر رقم هاتفك.'
                : 'Les résultats sont disponibles individuellement via votre numéro de téléphone.'}
            </p>
            {WINNERS_COUNT > 0 && (
              <p className={`${th.textFaint} text-xs mt-2`}>
                {isAr
                  ? `سيتم التواصل مع أفضل ${WINNERS_COUNT} عبر واتساب لتفعيل اشتراك Premium المجاني.`
                  : `Les ${WINNERS_COUNT} premiers sont contactés sur WhatsApp pour activer leur Premium gratuit.`}
              </p>
            )}
            <div className="mt-6">
              {mine ? (
                <Link href="/concours/results" className={btn} style={{ background: th.accent }}>
                  {isAr ? 'نتيجتي' : 'Voir mon résultat'} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              ) : (
                <ResultsLookup target={target} />
              )}
            </div>
          </div>
        )}

        {/* Appel à l'action */}
        <div className={`mt-10 rounded-3xl p-8 text-center border ${th.softCard}`}>
          <h3 className="text-white font-black text-xl mb-2">
            {isAr ? 'هل تريد التحضير أكثر؟' : 'Vous voulez vous préparer davantage ?'}
          </h3>
          <p className={`${th.textMuted} text-sm mb-5`}>
            {isAr ? 'آلاف الأسئلة المصححة لتتدرب كل يوم' : 'Des milliers de questions corrigées pour vous entraîner chaque jour'}
          </p>
          <Link href="/register?plan=FREEMIUM" className={btn} style={{ background: th.accent }}>
            {isAr ? 'جرّب مجاناً' : 'Essayer gratuitement'} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </ConcoursShell>
  );
}

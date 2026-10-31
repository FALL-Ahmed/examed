'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { concoursApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { ChevronRight, Clock, FileText, Users, Trophy, Smartphone, EyeOff, Timer } from 'lucide-react';
import { ResultsLookup } from './_results-lookup';
import {
  ConcoursShell, Spinner, PROFESSION, WINNERS_COUNT, CHALLENGE_TITLE, concoursTheme, fmtDate, fmtTime, readConcoursState,
} from './_shared';

const pad = (n: number) => String(n).padStart(2, '0');

function Countdown({ to, isAr, cardCls }: { to: string; isAr: boolean; cardCls: string }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(to).getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, new Date(to).getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [to]);
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const units = isAr ? ['يوم', 'سا', 'د', 'ث'] : ['j', 'h', 'min', 's'];
  return (
    <div className="flex items-center justify-center gap-2" dir="ltr">
      {[d, h, m, s].map((v, i) => (
        <div key={i} className={`min-w-[64px] rounded-xl border px-3 py-2 text-center ${cardCls}`}>
          <p className="text-2xl font-black text-white tabular-nums">{pad(v)}</p>
          <p className="text-[11px] text-white/70">{units[i]}</p>
        </div>
      ))}
    </div>
  );
}

export function ConcoursLanding({ target }: { target: 'INFIRMIER' | 'SAGE_FEMME' }) {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const th = concoursTheme(target);
  const [data, setData] = useState<any>(null);
  const [mine, setMine] = useState<any>(null);

  useEffect(() => {
    concoursApi.current(target)
      .then((r) => setData(r.data))
      .catch(() => setData({ session: null, stats: {} }));
  }, [target]);

  useEffect(() => {
    const s = readConcoursState();
    if (s && data?.session && s.examenBlancId === data.session.id) setMine(s);
  }, [data]);

  if (!data) return <Spinner target={target} />;

  const session = data.session;
  const prof = PROFESSION[target];
  const btn = `inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl font-bold text-white hover:opacity-90 transition`;

  const rules = [
    { icon: FileText, fr: `${session?.totalQ ?? '—'} questions, les mêmes pour tous`, ar: `${session?.totalQ ?? '—'} سؤال، نفس الأسئلة للجميع` },
    { icon: Timer, fr: `${session?.durationMin ?? '—'} minutes chrono, dès l'inscription`, ar: `${session?.durationMin ?? '—'} دقيقة تبدأ فور التسجيل` },
    { icon: Smartphone, fr: 'Une seule participation par numéro de téléphone', ar: 'مشاركة واحدة فقط لكل رقم هاتف' },
    { icon: Trophy, fr: 'Classement par score, puis par temps en cas d’égalité', ar: 'الترتيب حسب النتيجة ثم الوقت عند التعادل' },
    { icon: EyeOff, fr: 'Ne quittez pas la page : chaque sortie est signalée', ar: 'لا تغادر الصفحة: كل خروج يُسجَّل' },
  ];

  return (
    <ConcoursShell target={target}>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-16 text-center">
        <p className={`${th.accentText} text-sm font-bold uppercase tracking-widest mb-3`}>
          🎓 {isAr ? CHALLENGE_TITLE.ar : CHALLENGE_TITLE.fr} · {isAr ? (target === 'SAGE_FEMME' ? 'قابلة' : 'ممرض') : prof.fr}
        </p>
        <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
          {WINNERS_COUNT > 0
            ? (isAr
              ? <>أفضل {WINNERS_COUNT} من {prof.ar} يربحون</>
              : <>Les {WINNERS_COUNT} meilleurs {target === 'SAGE_FEMME' ? 'sages-femmes' : 'infirmiers'} gagnent</>)
            : (isAr ? 'اختبر مستواك' : 'Testez votre niveau')}
          <span className="block mt-2" style={{ background: th.headline, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', paddingBottom: '0.1em' }}>
            {WINNERS_COUNT > 0
              ? (isAr ? 'اشتراك Premium مجاني' : 'un abonnement Premium gratuit')
              : (isAr ? 'أمام باقي المترشحين' : 'face aux autres candidats')}
          </span>
        </h1>
        <p className={`${th.textDim} mt-4 max-w-xl mx-auto`}>
          {isAr
            ? 'أسئلة مختارة من أفضل امتحاناتنا التجريبية، قارن مستواك مع باقي المشاركين.'
            : 'Des questions tirées de nos meilleurs examens blancs : comparez votre niveau à celui des autres candidats.'}
        </p>

        {/* Chiffres */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 my-10">
          {[
            { icon: FileText, val: session?.totalQ ?? '—', label: isAr ? 'سؤال' : 'questions' },
            { icon: Clock, val: session ? `${session.durationMin} min` : '—', label: isAr ? 'المدة' : 'durée' },
            { icon: Users, val: data.stats?.participants || '—', label: isAr ? 'مشارك' : 'participants' },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label}>
              <div className="flex items-center justify-center gap-1.5">
                <Icon className={`w-4 h-4 ${th.accentText}`} />
                <span className="text-2xl font-black text-white tabular-nums">{val}</span>
              </div>
              <p className={`${th.textMuted} text-xs mt-0.5`}>{label}</p>
            </div>
          ))}
        </div>

        {/* État du concours */}
        <div className={`rounded-3xl border p-6 sm:p-8 ${th.card}`}>
          {!session ? (
            <>
              <p className="text-white font-bold text-lg">{isAr ? 'التحدي سيفتح قريباً' : 'Le challenge ouvre bientôt'}</p>
              <p className={`${th.textMuted} text-sm mt-1`}>{isAr ? 'تابعنا لمعرفة الموعد.' : 'Restez connecté pour connaître la date.'}</p>
            </>
          ) : mine?.isCompleted ? (
            <>
              <p className="text-white font-bold text-lg">✅ {isAr ? 'تم تسجيل مشاركتك' : 'Votre participation est enregistrée'}</p>
              <Link href="/concours/results" className={btn} style={{ background: th.accent }}>
                {isAr ? 'نتيجتي' : 'Voir mon résultat'} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </>
          ) : session.isOpen && mine ? (
            <>
              <p className="text-white font-bold text-lg">{isAr ? 'لديك مشاركة جارية' : 'Vous avez une participation en cours'}</p>
              <Link href={`/concours/exam?target=${target}`} className={btn} style={{ background: th.accent }}>
                {isAr ? 'متابعة' : 'Reprendre'} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </>
          ) : session.isOpen ? (
            <>
              <Link href={`/concours/register?target=${target}`}
                className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white hover:opacity-90 transition shadow-2xl ${th.shadow}`}
                style={{ background: th.accent }}>
                {isAr ? 'المشاركة الآن' : 'Participer maintenant'} <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </Link>
              <p className={`${th.textMuted} text-sm mt-4`}>
                {isAr ? 'آخر أجل: ' : 'Clôture le '}{fmtDate(session.endsAt, isAr)} · {fmtTime(session.endsAt, isAr)}
              </p>
            </>
          ) : !session.isClosed ? (
            <>
              <p className={`${th.textDim} text-sm mb-4`}>
                {isAr ? 'يفتح التحدي ' : 'Ouverture le '}<strong className="text-white">{fmtDate(session.startsAt, isAr)} · {fmtTime(session.startsAt, isAr)}</strong>
              </p>
              <Countdown to={session.startsAt} isAr={isAr} cardCls={th.card} />
            </>
          ) : session.isResultsReady ? (
            <>
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-white font-bold text-lg mb-5">{isAr ? 'النتائج متاحة!' : 'Les résultats sont disponibles !'}</p>
              <ResultsLookup target={target} />
              <Link href={`/concours/classement?target=${target}`} className={`block mt-4 text-sm ${th.textDim} hover:text-white`}>
                {isAr ? 'الترتيب العام' : 'Voir le classement'}
              </Link>
            </>
          ) : (
            <>
              <p className="text-white font-bold text-lg">{isAr ? 'انتهى التحدي' : 'Le challenge est terminé'}</p>
              <p className={`${th.textDim} text-sm mt-1`}>
                {isAr ? 'النتائج يوم ' : 'Résultats le '}{fmtDate(session.resultsAt, isAr)} · {fmtTime(session.resultsAt, isAr)}
              </p>
            </>
          )}
        </div>

        {/* Règlement */}
        <div className={`mt-10 text-start rounded-3xl border p-6 ${th.softCard}`}>
          <p className="text-white font-bold mb-4">{isAr ? 'القواعد' : 'Le règlement'}</p>
          <ul className="space-y-3">
            {rules.map((r) => (
              <li key={r.fr} className={`flex items-start gap-3 text-sm ${th.textDim}`}>
                <r.icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${th.accentText}`} />
                {isAr ? r.ar : r.fr}
              </li>
            ))}
          </ul>
          {WINNERS_COUNT > 0 && (
            <p className={`text-xs ${th.textFaint} mt-5`}>
              {isAr
                ? `سيتم التواصل مع أفضل ${WINNERS_COUNT} عبر واتساب بعد التحقق من النتائج.`
                : `Les ${WINNERS_COUNT} premiers seront contactés sur WhatsApp après vérification des résultats.`}
            </p>
          )}
        </div>
      </section>
    </ConcoursShell>
  );
}

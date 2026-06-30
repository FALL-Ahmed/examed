'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { translations } from '@/lib/i18n';
import { CheckCircle2, Clock, BookOpen, FileText, Trophy, Target, ChevronRight, Zap } from 'lucide-react';

const COLORS = {
  j1: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', bar: 'bg-blue-500' },
  j2: { bg: 'bg-green-600', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', bar: 'bg-green-500' },
  j3: { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', bar: 'bg-purple-500' },
  j4: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', bar: 'bg-orange-500' },
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DayCard({
  day, label, colorKey, qTarget, fichesTarget, qDone, status, t, isAr,
}: {
  day: number; label: string; colorKey: keyof typeof COLORS;
  qTarget: number; fichesTarget: number; qDone: number;
  status: 'done' | 'active' | 'locked';
  t: (k: string) => string; isAr: boolean;
}) {
  const c = COLORS[colorKey];
  const qPct = qTarget > 0 ? Math.min(Math.round((qDone / qTarget) * 100), 100) : 0;
  const remaining = Math.max(qTarget - qDone, 0);
  const isActive = status === 'active';
  const dayLabel = isAr ? `ي${day}` : `J${day}`;

  if (isActive) {
    return (
      <div className={`rounded-2xl border-2 ${c.border} bg-white p-6 flex flex-col gap-4 relative overflow-hidden shadow-xl`}>
        <div className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} ${c.bg} text-white text-[10px] font-bold px-2 py-1 rounded-full`}>
          {t('prep.today')}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={`${c.bg} text-white rounded-2xl w-16 h-16 flex flex-col items-center justify-center flex-shrink-0`}>
            <div className="text-xs font-medium opacity-80">{dayLabel}</div>
            <div className="text-xl font-extrabold leading-tight">{day}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{t('prep.objective')}</div>
            <div className={`text-4xl font-extrabold ${c.text}`}>{qTarget.toLocaleString()}</div>
            <div className="text-sm text-gray-500">{t('prep.qcmToPractice')}</div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1.5 font-medium"><BookOpen size={14} /> {t('prep.progression')}</span>
            <span className="font-bold">{Math.min(qDone, qTarget).toLocaleString()} / {qTarget.toLocaleString()}</span>
          </div>
          <ProgressBar value={Math.min(qDone, qTarget)} max={qTarget} color={c.bar} />
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">{remaining > 0 ? `${t('prep.moreThan')} ${remaining} ${t('prep.qcmLeft')}` : t('prep.goalReached')}</span>
            <span className={`text-sm font-extrabold ${c.text}`}>{qPct}%</span>
          </div>
        </div>

        {/* Fiches */}
        <div className={`flex items-center gap-3 bg-gray-50 border ${c.border} rounded-xl px-4 py-2.5`}>
          <FileText size={16} className={c.text} />
          <div>
            <span className="text-sm font-bold text-gray-800">{fichesTarget} {t('prep.totalFiches')}</span>
            <span className="text-xs text-gray-500 ml-1">{t('prep.fichesToday')}</span>
          </div>
        </div>

        {/* Boutons action */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/practice?mode=prep&day=${day}`}
            className={`${c.bg} text-white rounded-xl py-3.5 text-center font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}>
            <Zap size={16} />
            {t('prep.startQCM')}
          </Link>
          <Link href={`/fiches-memo?day=${day}`}
            className={`bg-white border-2 ${c.border} ${c.text} rounded-xl py-3.5 text-center font-bold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-opacity`}>
            <FileText size={16} />
            {t('prep.seeFiches')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.light} p-5 flex flex-col gap-3 relative overflow-hidden`}>
      {status === 'done' && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="text-green-500" size={22} />
        </div>
      )}
      {status === 'locked' && (
        <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center z-10">
          <span className="text-gray-400 font-semibold text-sm">{t('prep.upcoming_card')}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`${c.bg} text-white rounded-xl px-3 py-2 text-center min-w-[52px]`}>
          <div className="text-xs font-medium opacity-80">{dayLabel}</div>
          <div className="text-sm font-bold">{day}</div>
        </div>
        <div className="flex-1">
          <div className={`text-2xl font-extrabold ${c.text}`}>{qTarget.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium">{t('prep.qcmToRevise')}</div>
        </div>
      </div>

      {/* QCM progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span className="flex items-center gap-1"><BookOpen size={12} /> {t('prep.qcmDone')}</span>
          <span className="font-bold">{Math.min(qDone, qTarget).toLocaleString()} / {qTarget.toLocaleString()}</span>
        </div>
        <ProgressBar value={Math.min(qDone, qTarget)} max={qTarget} color={c.bar} />
        <div className={`text-right text-xs font-bold mt-1 ${c.text}`}>{qPct}%</div>
      </div>

      {/* Fiches */}
      <div className={`flex items-center gap-2 ${c.light} border ${c.border} rounded-xl px-3 py-2`}>
        <FileText size={14} className={c.text} />
        <span className="text-sm font-semibold text-gray-700">{fichesTarget}</span>
        <span className="text-xs text-gray-500">{t('prep.fichesToRevise')}</span>
      </div>

      {/* Boutons révision (jours terminés) */}
      {status === 'done' && (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/practice?mode=prep&day=${day}`}
            className={`border-2 ${c.border} ${c.text} rounded-xl py-2.5 text-center font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-80 transition-opacity bg-white`}>
            <Zap size={13} /> {t('prep.reviseQCM')}
          </Link>
          <Link href={`/fiches-memo?day=${day}`}
            className={`border-2 ${c.border} ${c.text} rounded-xl py-2.5 text-center font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-80 transition-opacity bg-white`}>
            <FileText size={13} /> {t('prep.totalFiches')}
          </Link>
        </div>
      )}
    </div>
  );
}

const PREP_START_KEY = 'prep_start_date';

export default function PreparationConcoursPage() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const T = translations[lang as 'fr' | 'ar'] ?? translations.fr;
  const t = (k: string) => (T as any)[k] ?? k;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREP_START_KEY);
      if (saved) { setStartDate(new Date(saved)); }
      else {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        localStorage.setItem(PREP_START_KEY, today.toISOString());
        setStartDate(today);
      }
    } catch {
      const d = new Date(); d.setHours(0, 0, 0, 0); setStartDate(d);
    }
  }, []);

  useEffect(() => {
    const langParam = lang === 'ar' ? 'AR' : 'FR';
    api.get(`/stats/preparation?lang=${langParam}`)
      .then(r => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [lang]);

  if (loading || !startDate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
      <Target size={40} className="opacity-30" />
      <p className="text-sm">Impossible de charger les données. Réessaie.</p>
    </div>
  );

  const { totalQ, qPerDay: qPerDayRaw, totalFiches, fichesPerDay, questionsAnswered, answersByDay } = stats;
  const answersByDayArr: number[] = Array.isArray(answersByDay) ? answersByDay : [0, 0, 0];
  const qPerDayArr: number[] = Array.isArray(qPerDayRaw) ? qPerDayRaw : [qPerDayRaw, qPerDayRaw, qPerDayRaw];
  const [q1, q2, q3] = qPerDayArr;

  // Jour courant basé sur la date calendaire (minuit = nouveau jour)
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const daysElapsed = startDate ? Math.floor((todayMidnight.getTime() - startDate.getTime()) / 86400000) : 0;
  const currentDay = Math.min(Math.max(daysElapsed + 1, 1), 4);

  // La progression du jour actif = questions répondues aujourd'hui
  const todayDone = questionsAnswered;
  const activeTarget = [q1, q2, q3][currentDay - 1] ?? q1;
  // Progression cumulée : vrais comptes des jours passés + jour actif
  const completedQs = answersByDayArr.slice(0, currentDay - 1).reduce((s: number, q: number) => s + q, 0);
  const totalDoneQs = completedQs + Math.min(todayDone, activeTarget);
  const totalPct = Math.min(Math.round((totalDoneQs / (totalQ || 1)) * 100), 100);

  const dayStatus = (day: number): 'done' | 'active' | 'locked' => {
    if (day < currentDay) return 'done';
    if (day === currentDay) return 'active';
    return 'locked';
  };

  // Message motivant dynamique
  const dayPct = activeTarget > 0 ? Math.round((todayDone / activeTarget) * 100) : 0;
  const remaining = Math.max(activeTarget - todayDone, 0);
  const fill = (key: string, vars: Record<string, any>) =>
    t(key).replace(/{(\w+)}/g, (_: string, k: string) => String(vars[k] ?? ''));
  const motivationMsg = (() => {
    if (currentDay >= 4) return t('prep.msgComplete');
    if (dayPct === 0) return fill('prep.msg0', { n: activeTarget });
    if (dayPct < 25) return fill('prep.msg25', { n: remaining, d: currentDay });
    if (dayPct < 50) return fill('prep.msg50', { p: dayPct, d: currentDay });
    if (dayPct < 75) return fill('prep.msg75', { n: remaining, d: currentDay });
    if (dayPct < 100) return fill('prep.msg95', { p: dayPct, d: currentDay, n: remaining });
    return fill('prep.msg100', { d: currentDay, d2: currentDay + 1 });
  })();

  const isAr = lang === 'ar';
  // Données pour la timeline
  const TIMELINE = [
    { day: 1, label: isAr ? 'ي1' : 'J1' },
    { day: 2, label: isAr ? 'ي2' : 'J2' },
    { day: 3, label: isAr ? 'ي3' : 'J3' },
    { day: 4, label: isAr ? 'ي4' : 'J4' },
  ];

  return (
    <div className="px-4 py-6 space-y-5">

      {/* Header + Timeline */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t('prep.badge')}</div>
            <div className="text-xl font-extrabold">{t('prep.title')}</div>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            currentDay === 4 ? 'bg-orange-500' : 'bg-blue-500'
          }`}>
            {currentDay < 4 ? <Clock size={12} /> : <Trophy size={12} />}
            {currentDay < 4 ? `${t('prep.dayN')} ${currentDay}` : t('prep.j4Revision')}
          </div>
        </div>

        {/* Timeline J1→J4 */}
        <div className="flex items-center gap-0">
          {TIMELINE.map((tl, i) => {
            const st = dayStatus(tl.day);
            const isLast = i === TIMELINE.length - 1;
            return (
              <div key={tl.day} className="flex items-center" style={{ flex: isLast ? 'none' : 1 }}>
                {/* Node */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    st === 'done' ? 'bg-green-400 border-green-400 text-white' :
                    st === 'active' ? 'bg-white border-white text-gray-900 shadow-lg shadow-white/20 ring-2 ring-white/40' :
                    'bg-white/10 border-white/20 text-white/40'
                  }`}>
                    {st === 'done' ? <CheckCircle2 size={16} /> : tl.label}
                  </div>
                  <span className={`text-[10px] font-semibold ${st === 'locked' ? 'text-white/30' : st === 'active' ? 'text-white' : 'text-green-400'}`}>
                    {st === 'done' ? t('prep.done') : st === 'active' ? t('prep.today') : t('prep.upcoming')}
                  </span>
                </div>
                {/* Connector */}
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-1 rounded-full" style={{
                    background: st === 'done' ? '#4ade80' : 'rgba(255,255,255,0.15)'
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Barre de progression globale */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>{t('prep.totalProgress')}</span>
            <span className="font-bold text-white">{totalPct}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-blue-400 to-green-400 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${totalPct}%` }} />
          </div>
        </div>

        {/* Message motivant */}
        <div className="bg-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/90">
          {motivationMsg}
        </div>
      </div>

      {/* Stats récap */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
          <div className="text-xl font-extrabold text-blue-600">{totalQ.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">{t('prep.totalQCM')}</div>
          <div className="text-[10px] text-gray-400">{q1}/{q2}/{q3}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
          <div className="text-xl font-extrabold text-green-600">{totalFiches}</div>
          <div className="text-xs text-gray-500 mt-0.5">{t('prep.totalFiches')}</div>
          <div className="text-[10px] text-gray-400">{fichesPerDay}/{isAr ? 'يوم' : 'jour'}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
          <div className="text-xl font-extrabold text-purple-600">100%</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-tight">{t('prep.covered')}</div>
        </div>
      </div>

      {/* J1 → J3 : 3 colonnes sur desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((day, i) => {
          const qTarget = qPerDayArr[i] ?? q1;
          const st = dayStatus(day);
          const qDone = st === 'active' ? Math.min(todayDone, qTarget)
            : st === 'done' ? (answersByDayArr[i] ?? 0)
            : 0;
          return (
            <DayCard key={day} day={day} label={`${t('prep.dayN')} ${day}`}
              colorKey={(['j1','j2','j3'] as const)[i]}
              qTarget={qTarget} fichesTarget={fichesPerDay}
              qDone={qDone} status={st} t={t} isAr={isAr} />
          );
        })}
      </div>

      {/* J4 */}
      <div className={`rounded-2xl border-2 border-orange-200 bg-orange-50 p-5 space-y-3 ${currentDay < 4 ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 text-white rounded-xl px-3 py-2 text-center min-w-[52px]">
            <div className="text-xs font-medium opacity-80">{isAr ? 'ي4' : 'J4'}</div>
            <div className="text-sm font-bold">{t('prep.dayN')} 4</div>
          </div>
          <div>
            <div className="font-bold text-gray-800">{t('prep.finalRevision')}</div>
            <div className="text-xs text-gray-500">{t('prep.finalRevisionSub')}</div>
          </div>
          {currentDay >= 4 && <CheckCircle2 className="text-orange-500 ml-auto" size={22} />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-orange-100 flex items-center gap-2">
            <Zap size={16} className="text-orange-500" />
            <div>
              <div className="text-xs text-gray-500">{t('prep.weakPointsSub')}</div>
              <div className="text-sm font-bold text-gray-800">{t('prep.weakPoints')}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-orange-100 flex items-center gap-2">
            <Trophy size={16} className="text-orange-500" />
            <div>
              <div className="text-xs text-gray-500">{t('prep.mockExam')}</div>
              <div className="text-sm font-bold text-gray-800">{t('prep.mockExamSub')}</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

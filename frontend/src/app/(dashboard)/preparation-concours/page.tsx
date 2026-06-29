'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
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
  day, label, colorKey, qTarget, fichesTarget, qDone, status,
}: {
  day: number; label: string; colorKey: keyof typeof COLORS;
  qTarget: number; fichesTarget: number; qDone: number;
  status: 'done' | 'active' | 'locked';
}) {
  const c = COLORS[colorKey];
  const qPct = qTarget > 0 ? Math.min(Math.round((qDone / qTarget) * 100), 100) : 0;
  const remaining = Math.max(qTarget - qDone, 0);
  const isActive = status === 'active';

  if (isActive) {
    return (
      <div className={`rounded-2xl border-2 ${c.border} bg-white p-6 flex flex-col gap-4 relative overflow-hidden shadow-xl`}>
        {/* Badge aujourd'hui */}
        <div className={`absolute top-4 right-4 ${c.bg} text-white text-[10px] font-bold px-2 py-1 rounded-full`}>
          Aujourd'hui
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={`${c.bg} text-white rounded-2xl w-16 h-16 flex flex-col items-center justify-center flex-shrink-0`}>
            <div className="text-xs font-medium opacity-80">J{day}</div>
            <div className="text-xl font-extrabold leading-tight">{label.split(' ')[1]}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Ton objectif du jour</div>
            <div className={`text-4xl font-extrabold ${c.text}`}>{qTarget.toLocaleString()}</div>
            <div className="text-sm text-gray-500">QCM à pratiquer</div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1.5 font-medium"><BookOpen size={14} /> Progression</span>
            <span className="font-bold">{Math.min(qDone, qTarget).toLocaleString()} / {qTarget.toLocaleString()}</span>
          </div>
          <ProgressBar value={Math.min(qDone, qTarget)} max={qTarget} color={c.bar} />
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">{remaining > 0 ? `Plus que ${remaining} QCM` : 'Objectif atteint !'}</span>
            <span className={`text-sm font-extrabold ${c.text}`}>{qPct}%</span>
          </div>
        </div>

        {/* Fiches */}
        <div className={`flex items-center gap-3 bg-gray-50 border ${c.border} rounded-xl px-4 py-2.5`}>
          <FileText size={16} className={c.text} />
          <div>
            <span className="text-sm font-bold text-gray-800">{fichesTarget} fiches mémo</span>
            <span className="text-xs text-gray-500 ml-1">à consulter aujourd'hui</span>
          </div>
        </div>

        {/* Bouton Commencer */}
        <Link href="/practice"
          className={`${c.bg} text-white rounded-xl py-3.5 text-center font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}>
          <Zap size={18} />
          Commencer les QCM
          <ChevronRight size={18} />
        </Link>
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
          <span className="text-gray-400 font-semibold text-sm">À venir</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`${c.bg} text-white rounded-xl px-3 py-2 text-center min-w-[52px]`}>
          <div className="text-xs font-medium opacity-80">J{day}</div>
          <div className="text-sm font-bold">{label}</div>
        </div>
        <div className="flex-1">
          <div className={`text-2xl font-extrabold ${c.text}`}>{qTarget.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium">QCM à réviser</div>
        </div>
      </div>

      {/* QCM progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span className="flex items-center gap-1"><BookOpen size={12} /> QCM faits</span>
          <span className="font-bold">{Math.min(qDone, qTarget).toLocaleString()} / {qTarget.toLocaleString()}</span>
        </div>
        <ProgressBar value={Math.min(qDone, qTarget)} max={qTarget} color={c.bar} />
        <div className={`text-right text-xs font-bold mt-1 ${c.text}`}>{qPct}%</div>
      </div>

      {/* Fiches */}
      <div className={`flex items-center gap-2 ${c.light} border ${c.border} rounded-xl px-3 py-2`}>
        <FileText size={14} className={c.text} />
        <span className="text-sm font-semibold text-gray-700">{fichesTarget}</span>
        <span className="text-xs text-gray-500">fiches mémo à réviser</span>
      </div>
    </div>
  );
}

export default function PreparationConcoursPage() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const langParam = lang === 'ar' ? 'AR' : 'FR';
    api.get(`/stats/preparation?lang=${langParam}`)
      .then(r => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [lang]);

  if (loading) {
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

  const { totalQ, qPerDay, totalFiches, fichesPerDay, questionsAnswered } = stats;

  // Calcul de la journée courante
  const j1Done = Math.min(questionsAnswered, qPerDay);
  const j2Done = Math.min(Math.max(questionsAnswered - qPerDay, 0), qPerDay);
  const j3Done = Math.min(Math.max(questionsAnswered - 2 * qPerDay, 0), qPerDay);

  const currentDay = questionsAnswered >= totalQ ? 4
    : questionsAnswered >= 2 * qPerDay ? 3
    : questionsAnswered >= qPerDay ? 2
    : 1;

  const totalPct = Math.min(Math.round((questionsAnswered / totalQ) * 100), 100);

  const dayStatus = (day: number): 'done' | 'active' | 'locked' => {
    if (day < currentDay) return 'done';
    if (day === currentDay) return 'active';
    return 'locked';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-2">
          <Target size={13} /> Concours de Santé de l'État
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Programme J-4</h1>
        <p className="text-sm text-gray-500">4 jours pour couvrir tout le programme</p>
      </div>

      {/* Progress global */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-400 font-medium">Progression totale</div>
            <div className="text-3xl font-extrabold">{totalPct}%</div>
            <div className="text-sm text-gray-300 mt-0.5">
              {questionsAnswered.toLocaleString()} / {totalQ.toLocaleString()} QCM pratiqués
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
              currentDay === 4 ? 'bg-orange-500' : 'bg-blue-500'
            }`}>
              {currentDay < 4 ? <Clock size={14} /> : <Trophy size={14} />}
              {currentDay < 4 ? `Jour ${currentDay}` : 'J4 — Révision'}
            </div>
          </div>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-400 to-green-400 h-3 rounded-full transition-all duration-700"
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>

      {/* Stats récap */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-extrabold text-blue-600">{totalQ.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">QCM totaux</div>
          <div className="text-xs text-gray-400">({qPerDay}/jour × 3)</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-extrabold text-green-600">{totalFiches}</div>
          <div className="text-xs text-gray-500 mt-1">Fiches mémo</div>
          <div className="text-xs text-gray-400">({fichesPerDay}/jour)</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-extrabold text-purple-600">100%</div>
          <div className="text-xs text-gray-500 mt-1">Programme</div>
          <div className="text-xs text-gray-400">couvert en 4j</div>
        </div>
      </div>

      {/* CTA */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/practice"
          className="flex items-center justify-between bg-blue-600 text-white rounded-xl px-4 py-3 font-semibold text-sm hover:bg-blue-700 transition-colors">
          <span>Pratiquer QCM</span>
          <ChevronRight size={18} />
        </Link>
        <Link href="/fiches-memo"
          className="flex items-center justify-between bg-white border-2 border-gray-200 text-gray-800 rounded-xl px-4 py-3 font-semibold text-sm hover:border-blue-300 transition-colors">
          <span>Fiches mémo</span>
          <ChevronRight size={18} />
        </Link>
      </div>

      {/* J1 → J3 */}
      <div className="grid grid-cols-1 gap-4">
        <DayCard day={1} label="Jour 1" colorKey="j1"
          qTarget={qPerDay} fichesTarget={fichesPerDay}
          qDone={j1Done} status={dayStatus(1)} />
        <DayCard day={2} label="Jour 2" colorKey="j2"
          qTarget={qPerDay} fichesTarget={fichesPerDay}
          qDone={j2Done} status={dayStatus(2)} />
        <DayCard day={3} label="Jour 3" colorKey="j3"
          qTarget={qPerDay} fichesTarget={fichesPerDay}
          qDone={j3Done} status={dayStatus(3)} />
      </div>

      {/* J4 */}
      <div className={`rounded-2xl border-2 border-orange-200 bg-orange-50 p-5 space-y-3 ${currentDay < 4 ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 text-white rounded-xl px-3 py-2 text-center min-w-[52px]">
            <div className="text-xs font-medium opacity-80">J4</div>
            <div className="text-sm font-bold">Jour 4</div>
          </div>
          <div>
            <div className="font-bold text-gray-800">Révision finale</div>
            <div className="text-xs text-gray-500">Consolidation et examens blancs</div>
          </div>
          {currentDay >= 4 && <CheckCircle2 className="text-orange-500 ml-auto" size={22} />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-orange-100 flex items-center gap-2">
            <Zap size={16} className="text-orange-500" />
            <div>
              <div className="text-xs text-gray-500">Révision erreurs</div>
              <div className="text-sm font-bold text-gray-800">Points faibles</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-orange-100 flex items-center gap-2">
            <Trophy size={16} className="text-orange-500" />
            <div>
              <div className="text-xs text-gray-500">Examen blanc</div>
              <div className="text-sm font-bold text-gray-800">1 à 2 sessions</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

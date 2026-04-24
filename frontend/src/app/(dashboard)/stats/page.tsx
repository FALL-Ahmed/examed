'use client';
import { useEffect, useState } from 'react';
import { userApi } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { TrendingUp, Target, Award, Zap, BookOpen, CheckCircle, Flame, Trophy } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';
import { sentenceCase } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color }}>{score}%</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-bold">{payload[0].value}%</p>
    </div>
  );
};

function getLevel(score: number, isAr: boolean) {
  if (score >= 90) return { label: isAr ? 'نخبة'        : 'Élite',         color: '#f59e0b', bg: 'from-amber-400 to-orange-500',  emoji: '👑' };
  if (score >= 75) return { label: isAr ? 'خبير'        : 'Expert',        color: '#6366f1', bg: 'from-violet-500 to-indigo-600', emoji: '🎯' };
  if (score >= 60) return { label: isAr ? 'متقدم'       : 'Avancé',        color: '#10b981', bg: 'from-emerald-400 to-teal-500',  emoji: '🚀' };
  if (score >= 40) return { label: isAr ? 'متوسط'       : 'Intermédiaire', color: '#3b82f6', bg: 'from-blue-400 to-cyan-500',     emoji: '📈' };
  return           {        label: isAr ? 'مبتدئ'       : 'Débutant',      color: '#94a3b8', bg: 'from-slate-400 to-slate-500',   emoji: '🌱' };
}

function calcStreak(history: any[]): number {
  if (!history.length) return 0;
  const days = [...new Set(history.map((h) => format(new Date(h.date), 'yyyy-MM-dd')))].sort().reverse();
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = differenceInDays(parseISO(days[i - 1]), parseISO(days[i]));
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export default function StatsPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.stats().then((r) => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!stats) return null;

  const historyChart = [...stats.history].reverse().map((h: any) => ({
    date: format(new Date(h.date), 'dd/MM', { locale: fr }),
    score: h.score,
  }));

  const langCode = isAr ? 'AR' : 'FR';
  const langThemeStats = stats.themeStats.filter((th: any) => th.language === langCode);
  const qualifiedThemes = langThemeStats.filter((th: any) => th.total >= 3);
  const strengths = qualifiedThemes.filter((th: any) => th.score >= 70).sort((a: any, b: any) => b.score - a.score).slice(0, 4);
  const weaknesses = qualifiedThemes.filter((th: any) => th.score < 70).sort((a: any, b: any) => a.score - b.score).slice(0, 4);

  const level = getLevel(stats.globalScore, isAr);
  const streak = calcStreak(stats.history);
  const bestScore = stats.history.length ? Math.max(...stats.history.map((h: any) => h.score)) : 0;

  const nextLevel = stats.globalScore < 40 ? { label: isAr ? 'متوسط'  : 'Intermédiaire', threshold: 40 }
    : stats.globalScore < 60 ? { label: isAr ? 'متقدم'  : 'Avancé',        threshold: 60 }
    : stats.globalScore < 75 ? { label: isAr ? 'خبير'   : 'Expert',        threshold: 75 }
    : stats.globalScore < 90 ? { label: isAr ? 'نخبة'   : 'Élite',         threshold: 90 }
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Hero card */}
      <div className={`rounded-2xl p-6 text-white bg-gradient-to-br ${level.bg} shadow-xl`}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Score ring */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" className="drop-shadow-lg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke="white" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - stats.globalScore / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                className="transition-all duration-1000"
              />
              <text x="60" y="55" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">{stats.globalScore}%</text>
              <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="11">score</text>
            </svg>
          </div>

          {/* Level info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-2xl">{level.emoji}</span>
              <span className="text-xl font-extrabold">{level.label}</span>
            </div>
            <p className="text-white/80 text-sm mb-4">{stats.totalAttempts} {isAr ? (stats.totalAttempts > 1 ? 'جلسات' : 'جلسة') : ('session' + (stats.totalAttempts > 1 ? 's' : ''))} · {stats.totalQuestions} {isAr ? 'سؤالاً' : 'questions répondues'}</p>

            {/* Progress to next level */}
            {nextLevel && (
              <div>
                <div className="flex justify-between text-xs text-white/70 mb-1.5">
                  <span>{isAr ? `نحو ${nextLevel.label}` : `Vers ${nextLevel.label}`}</span>
                  <span>{stats.globalScore}% / {nextLevel.threshold}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (stats.globalScore / nextLevel.threshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div className="flex-shrink-0 flex flex-col items-center bg-white/20 rounded-2xl px-5 py-3">
              <Flame className="w-6 h-6 text-orange-200 mb-1" />
              <span className="text-2xl font-extrabold">{streak}</span>
              <span className="text-xs text-white/80">{isAr ? (streak > 1 ? 'أيام' : 'يوم') : ('jour' + (streak > 1 ? 's' : ''))}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'الجلسات'         : 'Sessions',            value: stats.totalAttempts,  icon: Zap,       gradient: 'gradient-warning', shadow: 'shadow-amber-500/20' },
          { label: isAr ? 'الأسئلة المجابة' : 'Questions répondues', value: stats.totalQuestions, icon: BookOpen,  gradient: 'gradient-info',    shadow: 'shadow-blue-500/20' },
          { label: isAr ? 'الإجابات الصحيحة': 'Bonnes réponses',     value: stats.totalCorrect,   icon: CheckCircle, gradient: 'gradient-success', shadow: 'shadow-emerald-500/20' },
          { label: isAr ? 'أفضل نتيجة'      : 'Meilleur score',      value: `${bestScore}%`,      icon: Trophy,    gradient: 'gradient-primary', shadow: 'shadow-violet-500/20' },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 card-hover">
            <div className={`w-10 h-10 rounded-xl ${k.gradient} flex items-center justify-center shadow-lg ${k.shadow}`}>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Score evolution chart */}
      {historyChart.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold">{isAr ? 'تطور النتيجة' : 'Évolution du score'}</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historyChart} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="score" stroke="#6366f1"
                strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Theme scores bar chart */}
      {langThemeStats.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg gradient-info flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold">{isAr ? 'النتيجة حسب الموضوع' : 'Score par thème'}</h2>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(200, langThemeStats.length * 44)}>
            <BarChart data={langThemeStats} layout="vertical" margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tickFormatter={sentenceCase} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={130} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={20}>
                {langThemeStats.map((entry: any) => (
                  <Cell
                    key={entry.name}
                    fill={entry.score >= 70 ? '#10b981' : entry.score >= 50 ? '#f59e0b' : '#ef4444'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strengths & weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg gradient-success flex items-center justify-center">
                <Award className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="font-semibold text-sm">{isAr ? 'نقاط القوة' : 'Points forts'}</h3>
            </div>
            {strengths.length > 0 ? (
              <div className="space-y-3.5">
                {strengths.map((th: any) => (
                  <div key={th.name}>
                    <p className="text-xs font-medium mb-1.5 truncate">{sentenceCase(th.name)}</p>
                    <ScoreBar score={th.score} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{isAr ? 'واصل التدريب لاكتشاف نقاط قوتك (≥ 70%).' : 'Continuez à pratiquer pour voir vos points forts (≥ 70%).'}</p>
            )}
          </div>

          <div className="bg-card border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg gradient-danger flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="font-semibold text-sm">{isAr ? 'للتحسين' : 'À améliorer'}</h3>
            </div>
            {weaknesses.length > 0 ? (
              <div className="space-y-3.5">
                {weaknesses.map((th: any) => (
                  <div key={th.name}>
                    <p className="text-xs font-medium mb-1.5 truncate">{sentenceCase(th.name)}</p>
                    <ScoreBar score={th.score} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{isAr ? 'ممتاز! لا توجد نقاط ضعف.' : 'Excellent ! Aucun point faible détecté.'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

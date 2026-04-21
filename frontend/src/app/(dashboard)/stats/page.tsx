'use client';
import { useEffect, useState } from 'react';
import { userApi } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { TrendingUp, Target, Award, Zap, BookOpen, CheckCircle } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';
import { sentenceCase } from '@/lib/utils';
import { format } from 'date-fns';
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

export default function StatsPage() {
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

  const { t } = useLang();
  const qualifiedThemes = stats.themeStats.filter((th: any) => th.total >= 3);
  const strengths = qualifiedThemes.filter((th: any) => th.score >= 70).sort((a: any, b: any) => b.score - a.score).slice(0, 4);
  const weaknesses = qualifiedThemes.filter((th: any) => th.score < 70).sort((a: any, b: any) => a.score - b.score).slice(0, 4);

  const kpis = [
    { label: t('stats.avgScore'), value: `${stats.globalScore}%`, icon: Target, gradient: 'gradient-primary', shadow: 'shadow-violet-500/20' },
    { label: t('stats.sessions'), value: stats.totalAttempts, icon: Zap, gradient: 'gradient-warning', shadow: 'shadow-amber-500/20' },
    { label: t('dash.stats.questions'), value: stats.totalQuestions ?? stats.totalAnswered ?? 0, icon: BookOpen, gradient: 'gradient-success', shadow: 'shadow-emerald-500/20' },
    { label: t('results.correct'), value: stats.totalCorrect ?? 0, icon: CheckCircle, gradient: 'gradient-info', shadow: 'shadow-blue-500/20' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> {t('stats.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t('stats.progress')}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
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
            <h2 className="font-bold">{t('stats.progress')}</h2>
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
      {stats.themeStats.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg gradient-info flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold">{t('stats.byTheme')}</h2>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(200, stats.themeStats.length * 44)}>
            <BarChart data={stats.themeStats} layout="vertical" margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tickFormatter={sentenceCase} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={130} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={20}>
                {stats.themeStats.map((entry: any) => (
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
      {(strengths.length > 0 || weaknesses.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg gradient-success flex items-center justify-center">
                <Award className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="font-semibold text-sm">{t('stats.bestScore')}</h3>
            </div>
            {strengths.length > 0 ? (
              <div className="space-y-3.5">
                {strengths.map((th: any) => (
                  <div key={th.name}>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="truncate pr-2 text-foreground">{sentenceCase(th.name)}</span>
                    </div>
                    <ScoreBar score={th.score} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('dash.start')} (≥ 70%).</p>
            )}
          </div>

          <div className="bg-card border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg gradient-danger flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="font-semibold text-sm">{t('review.title')}</h3>
            </div>
            {weaknesses.length > 0 ? (
              <div className="space-y-3.5">
                {weaknesses.map((th: any) => (
                  <div key={th.name}>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="truncate pr-2 text-foreground">{sentenceCase(th.name)}</span>
                    </div>
                    <ScoreBar score={th.score} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('common.success')} !</p>
            )}
          </div>
        </div>
      ) : qualifiedThemes.length === 0 && stats.themeStats.length > 0 ? (
        <div className="bg-card border border-border rounded-2xl p-5 text-center text-sm text-muted-foreground">
          {t('practice.start')} — {t('stats.progress')}
        </div>
      ) : null}
    </div>
  );
}

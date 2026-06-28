'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Trophy, BookOpen, TrendingUp, Target, ArrowUpDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type SortKey = 'accuracy' | 'total' | 'score';

type UserRow = {
  rank: number;
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
  completedAttempts: number;
  avgScore: number;
  bayesianScore: number;
};

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: 'accuracy', label: 'Précision', icon: Target },
  { key: 'total',    label: 'Questions', icon: BookOpen },
  { key: 'score',    label: 'Score moy.', icon: TrendingUp },
];

const MEDAL: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: 'bg-amber-50 border-amber-200 dark:bg-amber-400/10 dark:border-amber-400/30', text: 'text-amber-500', icon: '🥇' },
  2: { bg: 'bg-slate-50 border-slate-200 dark:bg-slate-400/10 dark:border-slate-400/30', text: 'text-slate-500', icon: '🥈' },
  3: { bg: 'bg-orange-50 border-orange-200 dark:bg-orange-400/10 dark:border-orange-400/30', text: 'text-orange-500', icon: '🥉' },
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-teal-500',
];

type ProfFilter = 'all' | 'infirmier' | 'sage_femme' | 'biologiste';

export default function LeaderboardPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('accuracy');
  const [profFilter, setProfFilter] = useState<ProfFilter>('all');

  useEffect(() => {
    setLoading(true);
    const prof = profFilter === 'all' ? undefined : profFilter;
    adminApi.leaderboard(sortBy, prof)
      .then((r) => setRows(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sortBy, profFilter]);

  const initials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const avatarColor = (id: string) =>
    AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Classement des utilisateurs</h1>
            <p className="text-muted-foreground text-sm">{rows.length} participants actifs</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {/* Filtre profession */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {([['all', 'Tous', ''], ['infirmier', '🏥 Infirmier', ''], ['sage_femme', '👶 Sage-femme', ''], ['biologiste', '🔬 Biologiste', '']] as [ProfFilter, string, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setProfFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${profFilter === val ? 'bg-white dark:bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border" />

          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">Trier par :</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border
                ${sortBy === opt.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      {!loading && rows.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[rows[1], rows[0], rows[2]].map((u) => {
            if (!u) return null;
            const medal = MEDAL[u.rank];
            const isFirst = u.rank === 1;
            return (
              <div
                key={u.id}
                className={`relative rounded-2xl border p-5 text-center transition ${medal.bg} ${isFirst ? 'scale-105 shadow-md' : ''}`}
              >
                <div className="text-3xl mb-2">{medal.icon}</div>
                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold ${avatarColor(u.id)}`}>
                  {initials(u.fullName)}
                </div>
                <p className="font-semibold text-sm text-foreground truncate">{u.fullName}</p>
                <p className="text-muted-foreground text-xs truncate">{u.email}</p>
                {u.phone && <p className="text-muted-foreground text-xs truncate mb-1">{u.phone}</p>}
                <div className="mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/60 rounded-lg p-2">
                    <p className={`text-lg font-black ${medal.text}`}>{u.bayesianScore}%</p>
                    <p className="text-muted-foreground text-xs">score</p>
                  </div>
                  <div className="bg-background/60 rounded-lg p-2">
                    <p className="text-lg font-black text-foreground">{u.totalAnswers}</p>
                    <p className="text-muted-foreground text-xs">questions</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
            Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Trophy className="w-10 h-10 opacity-30" />
            <p>Aucun utilisateur actif pour le moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider bg-muted/30">
                  <th className="text-left px-4 py-3 w-12">#</th>
                  <th className="text-left px-4 py-3">Utilisateur</th>
                  <th className="text-right px-4 py-3">Questions</th>
                  <th className="text-right px-4 py-3">Justes</th>
                  <th className="text-right px-4 py-3">Précision</th>
                  <th className="text-right px-4 py-3">Score moy.</th>
                  <th className="text-right px-4 py-3">Sessions</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((u) => {
                  const medal = MEDAL[u.rank];
                  return (
                    <tr key={u.id} className="hover:bg-muted/40 transition group">
                      <td className="px-4 py-3 font-bold">
                        {medal
                          ? <span className="text-lg">{medal.icon}</span>
                          : <span className="text-muted-foreground">{u.rank}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(u.id)}`}>
                            {initials(u.fullName)}
                          </div>
                          <div>
                            <p className="text-foreground font-medium">{u.fullName}</p>
                            <p className="text-muted-foreground text-xs">{u.email}</p>
                            {u.phone && <p className="text-muted-foreground text-xs">{u.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{u.totalAnswers}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{u.correctAnswers}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${
                          u.bayesianScore >= 70
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : u.bayesianScore >= 50
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {u.bayesianScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{u.avgScore}%</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{u.completedAttempts}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/users/${u.id}`}
                          className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-foreground">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

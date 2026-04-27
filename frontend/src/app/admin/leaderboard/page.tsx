'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Trophy, Medal, Target, CheckCircle2, BookOpen, TrendingUp, ArrowUpDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type SortKey = 'accuracy' | 'total' | 'score';

type UserRow = {
  rank: number;
  id: string;
  fullName: string;
  email: string;
  role: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
  completedAttempts: number;
  avgScore: number;
};

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: 'accuracy', label: 'Précision', icon: Target },
  { key: 'total',    label: 'Questions',  icon: BookOpen },
  { key: 'score',    label: 'Score moy.', icon: TrendingUp },
];

const MEDAL: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: 'bg-amber-400/20 border-amber-400/40', text: 'text-amber-400', icon: '🥇' },
  2: { bg: 'bg-slate-400/20 border-slate-400/40', text: 'text-slate-300', icon: '🥈' },
  3: { bg: 'bg-orange-400/20 border-orange-400/40', text: 'text-orange-400', icon: '🥉' },
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('accuracy');

  useEffect(() => {
    setLoading(true);
    adminApi.leaderboard(sortBy)
      .then((r) => setRows(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sortBy]);

  const initials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Classement des utilisateurs</h1>
            <p className="text-slate-400 text-sm">{rows.length} participants actifs</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 text-sm mr-1">Trier par :</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition
                ${sortBy === opt.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 */}
      {!loading && rows.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[rows[1], rows[0], rows[2]].map((u, i) => {
            if (!u) return null;
            const medal = MEDAL[u.rank];
            const isFirst = u.rank === 1;
            return (
              <div
                key={u.id}
                className={`relative rounded-2xl border p-5 text-center transition ${medal.bg} ${isFirst ? 'scale-105 shadow-lg shadow-amber-400/10' : ''}`}
              >
                <div className="text-3xl mb-2">{medal.icon}</div>
                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold
                  ${u.rank === 1 ? 'bg-amber-500' : u.rank === 2 ? 'bg-slate-500' : 'bg-orange-500'}`}>
                  {initials(u.fullName)}
                </div>
                <p className="text-white font-semibold text-sm truncate">{u.fullName}</p>
                <p className="text-slate-400 text-xs truncate mb-3">{u.email}</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className={`text-lg font-black ${medal.text}`}>{u.accuracyRate}%</p>
                    <p className="text-slate-500 text-xs">précision</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-lg font-black text-white">{u.totalAnswers}</p>
                    <p className="text-slate-500 text-xs">questions</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Trophy className="w-10 h-10 opacity-30" />
            <p>Aucun utilisateur actif pour le moment</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-700/50">
              {rows.map((u) => {
                const medal = MEDAL[u.rank];
                return (
                  <tr key={u.id} className="hover:bg-slate-700/30 transition group">
                    <td className="px-4 py-3 font-bold">
                      {medal
                        ? <span className="text-lg">{medal.icon}</span>
                        : <span className="text-slate-500">{u.rank}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 text-xs font-bold flex-shrink-0">
                          {initials(u.fullName)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{u.fullName}</p>
                          <p className="text-slate-500 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{u.totalAnswers}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{u.correctAnswers}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${u.accuracyRate >= 70 ? 'text-emerald-400' : u.accuracyRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {u.accuracyRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{u.avgScore}%</td>
                    <td className="px-4 py-3 text-right text-slate-400">{u.completedAttempts}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/users/${u.id}`}
                        className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-white">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

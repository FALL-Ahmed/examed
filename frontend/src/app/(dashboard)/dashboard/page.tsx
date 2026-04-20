'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { attemptsApi, userApi } from '@/lib/api';
import {
  BookOpen, Zap, RefreshCw, TrendingUp,
  Clock, ArrowRight, Target, Award, Flame, ChevronRight, AlertTriangle, CalendarCheck,
} from 'lucide-react';

function ScoreRing({ value }: { value: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="110" height="110" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
      />
      <text x="50" y="45" textAnchor="middle" fill="white" fontSize="20" fontWeight="800">{value}</text>
      <text x="50" y="59" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="8.5" fontWeight="500">% réussite</text>
    </svg>
  );
}

const MODES = [
  {
    href: '/practice',
    icon: BookOpen,
    label: 'Mode Pratique',
    desc: 'Réponse immédiate après chaque question',
    color: '#0ea5e9',
    badge: null,
  },
  {
    href: '/exam',
    icon: Zap,
    label: 'Mode Série',
    desc: 'Chronomètre + correction complète en fin',
    color: '#6366f1',
    badge: 'Premium',
  },
  {
    href: '/review',
    icon: RefreshCw,
    label: 'Révision Erreurs',
    desc: 'Retravailler vos points faibles',
    color: '#f59e0b',
    badge: 'Premium',
  },
  {
    href: '/stats',
    icon: TrendingUp,
    label: 'Statistiques',
    desc: 'Courbes de progression par thème',
    color: '#3b82f6',
    badge: null,
  },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    userApi.stats().then((r) => setStats(r.data)).catch(() => {});
    attemptsApi.history().then((r) => setHistory(r.data.slice(0, 5))).catch(() => {});
    userApi.me().then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = user?.fullName?.split(' ')[0];

  const subEnd = profile?.subscriptionEnd ? new Date(profile.subscriptionEnd) : null;
  const daysLeft = subEnd ? Math.ceil((subEnd.getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Hero ── */}
      <div className="rounded-2xl gradient-primary p-6 md:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <p className="text-white/60 text-sm mb-1">{greeting},</p>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{firstName} 👋</h1>
            <p className="text-white/65 text-sm leading-relaxed max-w-sm">
              {stats?.totalAttempts
                ? `${stats.totalAttempts} série${stats.totalAttempts > 1 ? 's' : ''} complétée${stats.totalAttempts > 1 ? 's' : ''} — continuez !`
                : 'Commencez votre première session de révision.'}
            </p>
            <Link href="/practice"
              className="inline-flex items-center gap-2 mt-5 bg-white text-violet-700 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-white/90 transition shadow-md">
              Commencer <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {stats && <ScoreRing value={stats.globalScore ?? 0} />}
        </div>
      </div>


      {/* ── Subscription expiry banner ── */}
      {subEnd && daysLeft !== null && daysLeft <= 7 && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 border ${
          daysLeft <= 3
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">
              {daysLeft <= 0 ? 'Abonnement expiré' : `Abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
            </span>
            <span className="opacity-70 ml-2">— Contactez l'admin pour renouveler.</span>
          </div>
        </div>
      )}

      {subEnd && daysLeft !== null && daysLeft > 7 && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3">
          <CalendarCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-400">
            Abonnement valide jusqu'au <strong>{subEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            <span className="opacity-70 ml-1">({daysLeft} jours restants)</span>
          </p>
        </div>
      )}

      {/* ── Stats rapides ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Target, label: 'Score global', value: `${stats.globalScore ?? 0}%` },
            { icon: Award, label: 'Meilleur score', value: `${stats.history?.length ? Math.max(...stats.history.map((h: any) => h.score)) : 0}%` },
            { icon: Flame, label: 'Séries', value: stats.totalAttempts ?? 0 },
            { icon: BookOpen, label: 'Correctes', value: `${stats.totalCorrect ?? 0}/${stats.totalQuestions ?? 0}` },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <s.icon className="w-4 h-4 text-muted-foreground mb-3" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Modes ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Choisir un mode</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map((m) => (
            <Link key={m.href} href={m.href}
              className="group bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}>
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{m.label}</span>
                    {m.badge && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-medium">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Historique ── */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Activité récente</h2>
            <Link href="/stats" className="text-xs text-primary font-semibold hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {history.map((a) => {
              const scoreColor = a.score >= 70 ? 'text-emerald-500' : a.score >= 50 ? 'text-amber-500' : 'text-red-500';
              return (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/40 transition">
                  <div className={`text-sm font-bold tabular-nums w-10 flex-shrink-0 ${scoreColor}`}>
                    {a.score}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {a.mode === 'PRACTICE' ? 'Mode Pratique' : a.mode === 'EXAM' ? 'Mode Série' : 'Révision'}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.correctQ}/{a.totalQ} correctes</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {Math.floor(a.timeTaken / 60)}m{a.timeTaken % 60 > 0 ? ` ${a.timeTaken % 60}s` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { attemptsApi, userApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t, lang } = useLang();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    userApi.stats().then((r) => setStats(r.data)).catch(() => {});
    attemptsApi.history().then((r) => setHistory(r.data.slice(0, 5))).catch(() => {});
    userApi.me().then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dash.hello.morning') : hour < 18 ? t('dash.hello.afternoon') : t('dash.hello.evening');
  const firstName = user?.fullName?.split(' ')[0];

  const MODES = [
    { href: '/practice', icon: BookOpen, label: t('nav.practice'), desc: t('practice.subtitle'), color: '#0ea5e9', badge: null },
    { href: '/exam',     icon: Zap,      label: t('nav.exam'),     desc: t('exam.title'),      color: '#6366f1', badge: 'Premium' },
    { href: '/review',   icon: RefreshCw, label: t('nav.review'),  desc: t('review.subtitle'), color: '#f59e0b', badge: 'Premium' },
    { href: '/stats',    icon: TrendingUp, label: t('nav.stats'),  desc: t('stats.progress'),  color: '#3b82f6', badge: 'Premium' },
  ];

  const subEnd = profile?.subscriptionEnd ? new Date(profile.subscriptionEnd) : null;
  const daysLeft = subEnd ? Math.ceil((subEnd.getTime() - Date.now()) / 86400000) : null;

  const [slideIdx, setSlideIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => { setSlideIdx(i => (i + 1) % 2); setFadeIn(true); }, 300);
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const SLIDES = [
    {
      badge: isAr ? 'جديد' : 'Nouveau',
      image: null as string | null,
      title: isAr
        ? 'أكثر من 300 سؤال جديد أُضيف للمنصة'
        : 'Plus de 300 nouvelles questions ajoutées',
      desc: isAr
        ? 'استعد بشكل أفضل لمسابقة ممرض الدولة. البرور يرافقك حتى قاعة الامتحان.'
        : "Préparez-vous encore mieux au concours national d'infirmier d'État. Al Bourour vous accompagne jusqu'à la salle d'examen.",
    },
    {
      badge: isAr ? 'جديد' : 'Nouveau',
      image: '/correction.png' as string | null,
      title: isAr
        ? 'طريقة تصحيح جديدة مطابقة لمسابقة التوظيف الوطنية'
        : 'Nouvelle méthode de correction adaptée au concours national',
      desc: isAr
        ? 'يتم التقييم دون أي تدخل بشري. تُمنح نقطة كاملة لكل إجابة صحيحة تماماً. ويُعتمد نظام التنقيط الجزئي التناسبي مع تطبيق غرامة على كل إجابة خاطئة محددة.'
        : "L'évaluation se fait sans intervention humaine. Un point complet est attribué pour chaque réponse entièrement correcte. Un système de notation partielle proportionnelle est utilisé, avec pénalité pour chaque mauvaise réponse.",
    },
  ];

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
                ? `${stats.totalAttempts} ${t('dash.stats.series').toLowerCase()} — ${t('dash.start').toLowerCase()}`
                : t('dash.start')}
            </p>
            <Link href="/practice"
              className="inline-flex items-center gap-2 mt-5 bg-white text-violet-700 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-white/90 transition shadow-md">
              {t('dash.practice')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {stats && <ScoreRing value={stats.globalScore ?? 0} />}
        </div>
      </div>


      {/* ── Annonces cycliques (10s) ── */}
      <div
        className={`overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-500/10 to-indigo-500/10 ${isAr ? 'text-right' : ''}`}
        style={{ transition: 'opacity 0.3s ease', opacity: fadeIn ? 1 : 0 }}
      >
        {SLIDES[slideIdx].image && (
          <img src={SLIDES[slideIdx].image!} alt="" className="w-full h-auto object-contain" />
        )}
        <div className="p-5 flex flex-col gap-2">
          <span className={`inline-block w-fit bg-violet-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isAr ? 'self-end' : ''}`}>
            {SLIDES[slideIdx].badge}
          </span>
          <p className="font-bold text-base leading-snug">{SLIDES[slideIdx].title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{SLIDES[slideIdx].desc}</p>
          <div className={`flex gap-1.5 mt-1 ${isAr ? 'justify-end' : ''}`}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => { setFadeIn(false); setTimeout(() => { setSlideIdx(i); setFadeIn(true); }, 300); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === slideIdx ? 'bg-violet-500 w-4' : 'bg-violet-300/50'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Subscription expiry banner ── */}
      {subEnd && daysLeft !== null && daysLeft <= 0 && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4 border bg-red-500/10 border-red-500/30 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">{t('dash.sub.expired')}</span>
            <span className="opacity-70 ml-2">— {t('dash.sub.renew')}</span>
          </div>
        </div>
      )}

      {subEnd && daysLeft !== null && daysLeft > 0 && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3">
          <CalendarCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-400">
            {isAr ? 'الاشتراك صالح حتى يوم المسابقة ✓' : 'Compte actif · valable jusqu\'au concours ✓'}
          </p>
        </div>
      )}

      {/* ── Stats rapides ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Target, label: t('dash.stats.score'), value: `${stats.globalScore ?? 0}%` },
            { icon: Award, label: t('stats.bestScore'), value: `${stats.history?.length ? Math.max(...stats.history.map((h: any) => h.score)) : 0}%` },
            { icon: Flame, label: t('dash.stats.series'), value: stats.totalAttempts ?? 0 },
            { icon: BookOpen, label: t('dash.stats.correct'), value: `${stats.totalCorrect ?? 0}/${stats.totalQuestions ?? 0}` },
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('dash.start')}</h2>
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
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('dash.activity')}</h2>
            <Link href="/stats" className="text-xs text-primary font-semibold hover:underline">
              {t('stats.sessions')}
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
                      {a.mode === 'PRACTICE' ? t('nav.practice') : a.mode === 'EXAM' ? t('nav.exam') : t('nav.review')}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.correctQ}/{a.totalQ} {t('results.correct').toLowerCase()}</p>
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

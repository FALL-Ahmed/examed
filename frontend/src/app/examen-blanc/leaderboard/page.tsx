'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { Trophy, MapPin, Clock, ChevronRight, BookOpen } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');
function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h${pad(m)}` : `${pad(m)}:${pad(s)}`;
}

function Countdown({ target, isAr }: { target: Date; isAr: boolean }) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) return;
      setT({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return (
    <span className="font-black tabular-nums">
      {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
    </span>
  );
}

export default function LeaderboardPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: d } = await examenBlancApi.leaderboard();
      setData(d);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
      <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isLocked = !data || data.locked;

  return (
    <div className="min-h-screen" dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link href="/examen-blanc" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold">Al Bourour</span>
        </Link>
        <Link href="/examen-blanc" className="text-white/40 text-sm hover:text-white/60 transition">
          ← {isAr ? 'رجوع' : 'Retour'}
        </Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pb-16">
        {/* Header */}
        <div className="text-center mb-10">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-white mb-2">
            {isAr ? 'الترتيب الوطني' : 'Classement National'}
          </h1>
          {data?.sessionTitle && (
            <p className="text-white/40 text-sm">{data.sessionTitle}</p>
          )}
          {data?.total > 0 && (
            <p className="text-white/30 text-sm mt-1">
              {isAr ? `${data.total} مشارك` : `${data.total} participants`}
            </p>
          )}
        </div>

        {/* Locked state */}
        {isLocked ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-white font-black text-xl mb-3">
              {isAr ? 'الترتيب غير متاح بعد' : 'Classement pas encore disponible'}
            </h2>
            {data?.resultsAt && (
              <p className="text-violet-400 font-bold text-lg">
                {isAr ? 'متاح خلال ' : 'Disponible dans '}
                <Countdown target={new Date(data.resultsAt)} isAr={isAr} />
              </p>
            )}
            <Link href="/examen-blanc"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl font-bold text-white transition hover:opacity-80"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {isAr ? 'رجوع للرئيسية' : "Retour à l'accueil"}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-white/60 text-lg font-semibold">
              {isAr
                ? `${data.total} مشارك أتمّوا الامتحان`
                : `${data.total} participants ont terminé l'examen`}
            </p>
            <p className="text-white/30 text-sm mt-3">
              {isAr
                ? 'النتائج متاحة بشكل فردي عبر رقم هاتفك'
                : 'Les résultats sont disponibles individuellement via ton numéro de téléphone'}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 rounded-3xl p-8 text-center border border-white/10 bg-white/5">
          <h3 className="text-white font-black text-xl mb-2">
            {isAr ? 'هل تريد التحضير أكثر؟' : 'Vous voulez vous préparer davantage ?'}
          </h3>
          <p className="text-white/40 text-sm mb-5">
            {isAr ? 'الوصول الكامل إلى جميع الأسئلة والتحليلات' : 'Accès complet à toutes les questions et analyses'}
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition hover:opacity-80"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {isAr ? 'اشترك الآن' : "S'inscrire"}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

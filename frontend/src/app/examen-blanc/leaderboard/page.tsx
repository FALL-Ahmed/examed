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
          <>
            {/* Top 3 podium */}
            {data.participants?.length >= 3 && (
              <div className="flex items-end justify-center gap-4 mb-10">
                {[1, 0, 2].map((idx) => {
                  const p = data.participants[idx];
                  if (!p) return null;
                  const heights = ['h-24', 'h-32', 'h-20'];
                  const colors = ['bg-gray-400', 'bg-amber-400', 'bg-amber-700'];
                  const order = [idx === 1 ? 0 : idx === 0 ? 1 : 2];
                  const displayIdx = idx === 0 ? 0 : idx === 1 ? 1 : 2;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="text-center">
                        <p className="text-white font-bold text-sm">{p.nom}</p>
                        <p className="text-white/50 text-xs flex items-center gap-1 justify-center">
                          <MapPin className="w-3 h-3" />{p.ville}
                        </p>
                        <p className={`font-black text-lg ${idx === 0 ? 'text-amber-400' : 'text-white/80'}`}>{p.score?.toFixed(1)}%</p>
                      </div>
                      <div className={`w-24 ${heights[displayIdx]} ${colors[displayIdx]} rounded-t-2xl flex items-center justify-center`}>
                        <span className="text-white font-black text-2xl">{idx + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full leaderboard */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl overflow-hidden mb-8">
              {data.participants?.map((p: any, i: number) => (
                <div key={i} className={`flex items-center gap-4 px-6 py-4 ${i < data.participants.length - 1 ? 'border-b border-white/5' : ''} ${i < 3 ? 'bg-white/3' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0
                    ${i === 0 ? 'bg-amber-400 text-amber-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-700 text-amber-100' : 'bg-white/10 text-white/50'}`}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{p.nom}</p>
                    <p className="text-white/40 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{p.ville}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-black text-lg">{p.score?.toFixed(1)}%</p>
                    <p className="text-white/40 text-xs flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />{formatTime(p.timeTaken || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* City breakdown */}
            {data.cityBreakdown?.length > 0 && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6">
                <h2 className="text-white font-black text-lg mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-violet-400" />
                  {isAr ? 'توزيع حسب الولاية' : 'Répartition par wilaya'}
                </h2>
                <div className="space-y-3">
                  {data.cityBreakdown.slice(0, 8).map((c: any, i: number) => {
                    const maxCount = data.cityBreakdown[0]?.count || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-white/60 text-sm w-32 flex-shrink-0 truncate">{c.ville}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${(c.count / maxCount) * 100}%`,
                            background: 'linear-gradient(90deg,#7c3aed,#6366f1)',
                          }} />
                        </div>
                        <span className="text-white/50 text-sm w-8 text-right">{c.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
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

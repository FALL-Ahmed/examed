'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { concoursApi, examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { ConcoursShell, Spinner, PROFESSION, WINNERS_COUNT, concoursTheme, fmtDate, fmtTime, toNote20 } from '../_shared';

function ClassementContent() {
  const searchParams = useSearchParams();
  const target = searchParams.get('target') === 'SAGE_FEMME' ? 'SAGE_FEMME' : 'INFIRMIER';
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const th = concoursTheme(target);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData(null);
    concoursApi.current(target)
      .then(async (r) => {
        const session = r.data.session;
        if (!session) return setData({ empty: true });
        const lb = await examenBlancApi.leaderboard(session.id);
        setData({ session, ...lb.data });
      })
      .catch(() => setData({ empty: true }));
  }, [target]);

  if (!data) return <Spinner target={target} />;

  return (
    <ConcoursShell target={target}>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16">
        <h1 className="text-2xl sm:text-3xl font-black text-white text-center">
          🏆 {isAr ? 'الترتيب' : 'Classement'} · {isAr ? (target === 'SAGE_FEMME' ? 'القابلات' : 'الممرضين') : PROFESSION[target].fr}
        </h1>
        <div className="mb-8" />

        {data.empty ? (
          <p className={`text-center ${th.textDim}`}>{isAr ? 'لا توجد مسابقة حالياً' : 'Aucun concours pour le moment'}</p>
        ) : data.locked ? (
          <div className={`rounded-3xl border p-8 text-center ${th.card}`}>
            <p className="text-white font-semibold">{isAr ? 'سيُنشر الترتيب يوم' : 'Le classement sera publié le'}</p>
            <p className={`font-bold mt-1 ${th.accentText}`}>{fmtDate(data.resultsAt, isAr)} · {fmtTime(data.resultsAt, isAr)}</p>
          </div>
        ) : !data.participants?.length ? (
          <p className={`text-center ${th.textDim}`}>{isAr ? 'لا يوجد مشاركون بعد' : 'Aucun participant classé'}</p>
        ) : (
          <>
            <p className={`text-center text-sm mb-4 ${th.textMuted}`}>
              {isAr ? `${data.total} مشارك` : `${data.total} participants`}
            </p>
            <ol className="space-y-2">
              {data.participants.map((p: any) => {
                const winner = p.rank <= WINNERS_COUNT;
                return (
                  <li key={p.rank}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${winner ? th.highlight : th.card}`}>
                    <span className={`w-8 text-center font-black tabular-nums ${winner ? th.accentText : th.textMuted}`}>
                      {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{p.nom}</p>
                      <p className={`${th.textFaint} text-xs truncate`}>{p.ville}</p>
                    </div>
                    {winner && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${th.badge}`}>Top {WINNERS_COUNT}</span>}
                    <span className="text-white font-bold tabular-nums">{toNote20(p.score)}/20</span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </ConcoursShell>
  );
}

export default function ConcoursClassementPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ClassementContent />
    </Suspense>
  );
}

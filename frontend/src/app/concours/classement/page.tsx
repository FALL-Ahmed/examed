'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { concoursApi, examenBlancApi } from '@/lib/api';
import { Spinner, readConcoursState } from '../_shared';
import { ClassementView } from '../_classement-view';

function ClassementContent() {
  const searchParams = useSearchParams();
  const target = searchParams.get('target') === 'SAGE_FEMME' ? 'SAGE_FEMME' : 'INFIRMIER';
  const [data, setData] = useState<any>(null);
  const [mine, setMine] = useState<any>(null);

  useEffect(() => {
    setData(null);
    concoursApi.current(target)
      .then(async (r) => {
        const session = r.data.session;
        if (!session) return setData({ empty: true });
        const lb = await examenBlancApi.leaderboard(session.id);
        setData({ session, ...lb.data });
        const s = readConcoursState();
        if (s?.examenBlancId === session.id && s.isCompleted) setMine(s);
      })
      .catch(() => setData({ empty: true }));
  }, [target]);

  if (!data) return <Spinner target={target} />;
  return <ClassementView target={target} data={data} mine={mine} />;
}

export default function ConcoursClassementPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ClassementContent />
    </Suspense>
  );
}

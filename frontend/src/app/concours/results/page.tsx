'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { examenBlancApi } from '@/lib/api';
import { Spinner, readConcoursState } from '../_shared';
import { ResultsView } from '../_results-view';

function ResultsContent() {
  const router = useRouter();
  const isTest = useSearchParams().get('mode') === 'test';
  const [state, setState] = useState<any>(null);
  const [res, setRes] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = readConcoursState(isTest);
    if (!s?.sessionId) { router.replace('/concours'); return; }
    setState(s);
    examenBlancApi.results(s.sessionId)
      .then((r) => setRes(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Erreur'));
  }, [router, isTest]);

  if (!state || (!res && !error)) return <Spinner target={state?.target} />;
  return <ResultsView target={state.target ?? 'INFIRMIER'} res={res} error={error} isTest={isTest} />;
}

export default function ConcoursResultsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResultsContent />
    </Suspense>
  );
}

'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Tracker() {
  const params = useSearchParams();
  useEffect(() => {
    const src = params.get('utm_source') || params.get('ref');
    if (src) localStorage.setItem('albourour_utm_source', src);
  }, [params]);
  return null;
}

export function UTMTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function Home() {
  const router = useRouter();
  const { user, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (u) {
        router.replace(u.role === 'ADMIN' ? '/admin' : '/dashboard');
      } else {
        router.replace('/login');
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Chargement...</p>
      </div>
    </div>
  );
}

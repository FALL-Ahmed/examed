'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { adminApi } from '@/lib/api';
import { BookOpen, Users, FileText, CreditCard, Upload, BarChart2, LogOut, Shield, PieChart } from 'lucide-react';

const navItems = [
  { href: '/admin', icon: BarChart2, label: 'Dashboard', badge: false },
  { href: '/admin/analytics', icon: PieChart, label: 'Analytiques', badge: false },
  { href: '/admin/upload', icon: Upload, label: 'Importer PDF', badge: false },
  { href: '/admin/questions', icon: FileText, label: 'Questions', badge: false },
  { href: '/admin/users', icon: Users, label: 'Utilisateurs', badge: false },
  { href: '/admin/payments', icon: CreditCard, label: 'Paiements', badge: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loadUser, logout } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (!u) router.push('/login');
      else if (u.role !== 'ADMIN') router.push('/dashboard');
    });
    adminApi.stats().then((r) => setPendingCount(r.data.pendingPayments ?? 0)).catch(() => {});
  }, []);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <div>
              <p className="font-bold text-sm">ExaMed</p>
              <p className="text-xs text-slate-400">Administration</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const count = item.badge ? pendingCount : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {count > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}

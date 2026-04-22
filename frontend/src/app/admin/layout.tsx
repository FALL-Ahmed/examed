'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { adminApi } from '@/lib/api';
import { Users, FileText, CreditCard, Upload, BarChart2, LogOut, Shield, PieChart, Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useLang } from '@/components/LanguageProvider';
import { LanguageSwitcherLight } from '@/components/LanguageSwitcher';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loadUser, logout } = useAuthStore();
  const { theme, toggle } = useTheme();
  const { t, isRTL } = useLang();
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/admin',           icon: BarChart2, label: t('admin.nav.dashboard'), badge: false },
    { href: '/admin/analytics', icon: PieChart,  label: t('admin.nav.analytics'), badge: false },
    { href: '/admin/upload',    icon: Upload,    label: t('admin.nav.upload'),    badge: false },
    { href: '/admin/questions', icon: FileText,  label: t('admin.nav.questions'), badge: false },
    { href: '/admin/users',     icon: Users,     label: t('admin.nav.users'),     badge: false },
    { href: '/admin/payments',  icon: CreditCard,label: t('admin.nav.payments'),  badge: true  },
  ];

  useEffect(() => {
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (!u) router.push('/login');
      else if (u.role !== 'ADMIN') router.push('/login');
    });
    adminApi.stats().then((r) => setPendingCount(r.data.pendingPayments ?? 0)).catch(() => {});
  }, []);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">{t('app.name')}</p>
            <p className="text-xs text-slate-400">{t('admin.label')}</p>
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
              onClick={onNav}
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

      <div className="p-3 border-t border-slate-700 space-y-1">
        <LanguageSwitcherLight />
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? t('common.light') : t('common.dark')}
        </button>
        <button
          onClick={() => { logout(); router.push('/login'); }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition"
        >
          <LogOut className="w-4 h-4" /> {t('common.logout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 bg-slate-900 text-white flex-col shadow-xl flex-shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-slate-900 text-white shadow-xl transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent onNav={() => setMobileOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 bg-slate-900 text-white h-14 flex items-center justify-between px-4 shadow-md">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-sm">{t('app.name')}</span>
          </div>
          <div className="w-5" />
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

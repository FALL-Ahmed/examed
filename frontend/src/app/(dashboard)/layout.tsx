'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useTheme } from '@/components/ThemeProvider';
import { useLang } from '@/components/LanguageProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  BookOpen, RefreshCw, Home, LogOut, Zap, Menu, X, TrendingUp, Sun, Moon, HeadphonesIcon, Heart,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loadUser, logout } = useAuthStore();
  const { theme, toggle } = useTheme();
  const { t, isRTL } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const navItems = [
    { href: '/dashboard',  icon: Home,           label: t('nav.dashboard'), color: '#818cf8' },
    { href: '/practice',   icon: BookOpen,       label: t('nav.practice'),  color: '#0ea5e9' },
    { href: '/exam',       icon: Zap,            label: t('nav.exam'),      color: '#a78bfa' },
    { href: '/review',     icon: RefreshCw,      label: t('nav.review'),    color: '#fbbf24' },
    { href: '/favorites',  icon: Heart,          label: t('nav.favorites'), color: '#f43f5e' },
    { href: '/stats',      icon: TrendingUp,     label: t('nav.stats'),     color: '#38bdf8' },
    { href: '/support',    icon: HeadphonesIcon, label: t('nav.support'),   color: '#34d399' },
  ];

  useEffect(() => {
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (!u) router.push('/login');
      else if (u.role === 'FREE') router.push('/pending');
      else setReady(true);
    });
  }, []);

  if (!ready || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo-full.png" alt="Al Bourour" className="w-full h-auto object-contain" />
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const initials = user.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <img src="/logo-full.png" alt="Al Bourour" className="w-full h-auto object-contain" />
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user.fullName}</p>
            <p className="text-white/40 text-xs">{t('common.member')}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-hidden">
        <p className="text-white/20 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Menu</p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} onClick={onNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${active
                  ? 'text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'}`}
              style={active ? {
                background: `${item.color}18`,
                borderInlineStart: `3px solid ${item.color}`,
              } : {}}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? item.color : undefined }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-1">
        <LanguageSwitcher />
        <button onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? t('common.light') : t('common.dark')}
        </button>
        <button onClick={() => { logout(); router.push('/login'); }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <LogOut className="w-4 h-4" />
          {t('common.logout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 xl:w-64 flex-col fixed inset-y-0 left-0 z-50 sidebar-bg sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col sidebar-bg transition-transform duration-300 ease-out mobile-sidebar
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full hidden-rtl'}`}>
        <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
          <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent onNav={() => setMobileOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen main-content lg:ml-60 xl:ml-64">

        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-4 shadow-sm">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <img src="/logo-full.png" alt="Al Bourour" className="h-14 w-auto object-contain" />
          <button onClick={toggle} className="text-muted-foreground hover:text-foreground">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-up">
          {children}
        </main>
      </div>
    </div>
  );
}

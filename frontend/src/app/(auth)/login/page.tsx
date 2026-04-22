'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Eye, EyeOff, Loader2, Stethoscope, Activity, Shield, Users } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const STATS = [
    { value: '500+', label: t('login.stat1') },
    { value: '50+',  label: t('login.stat2') },
    { value: '24/7', label: t('login.stat3') },
  ];

  const FEATURES = [
    { icon: Stethoscope, text: t('login.feat1') },
    { icon: Activity,    text: t('login.feat2') },
    { icon: Shield,      text: t('login.feat3') },
    { icon: Users,       text: t('login.feat4') },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      router.push(user?.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.login.error'));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex" dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── LEFT animated brand panel ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#0c1445 0%,#0f3460 35%,#16213e 70%,#0d1b2a 100%)' }}>

        {/* Animated blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Content */}
        <div className="relative flex flex-col h-full p-12">

          {/* Logo */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <img src="/logo-full.png" alt="Al Bourour" className="h-12 w-auto object-contain" />
          </div>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="text-sky-300 text-sm font-semibold uppercase tracking-[0.2em] mb-4">
                {t('login.brand.tag')}
              </p>
              <h1 className="text-5xl font-extrabold text-white leading-[1.1] mb-6">
                {t('login.brand.title1')}<br />
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg,#38bdf8,#818cf8)' }}>
                  {t('login.brand.title2')}
                </span>
              </h1>
              <p className="text-white/55 text-base leading-relaxed mb-10 max-w-sm">
                {t('login.brand.sub')}
              </p>
            </div>

            {/* Features */}
            <div className={`space-y-3 mb-12 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3"
                  style={{ transitionDelay: `${300 + i * 80}ms` }}>
                  <div className="w-8 h-8 rounded-lg border border-white/15 bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <Icon className="w-3.5 h-3.5 text-sky-300" />
                  </div>
                  <span className="text-white/70 text-sm">{text}</span>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className={`grid grid-cols-3 gap-4 transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {STATS.map((s) => (
                <div key={s.label} className="border border-white/10 rounded-2xl p-4 bg-white/5 backdrop-blur-sm">
                  <p className="text-2xl font-extrabold text-white">{s.value}</p>
                  <p className="text-white/45 text-xs mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className={`w-full max-w-md transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-10">
            <img src="/logo-full.png" alt="Al Bourour" className="h-12 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight">{t('auth.login.title')}</h2>
            <p className="text-muted-foreground text-sm mt-1">{t('auth.login.subtitle')}</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold flex-shrink-0">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('auth.login.email')}</label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('auth.login.password')}</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t('common.loading') : t('auth.login.submit')}
            </button>
          </form>

          <div className="flex items-center justify-between text-sm text-muted-foreground mt-6">
            <Link href="/forgot-password" className="text-primary font-semibold hover:underline">
              {t('auth.login.forgot')}
            </Link>
            <Link href="/register" className="text-primary font-semibold hover:underline">
              {t('auth.login.register')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const { data } = await authApi.resetPassword({ email, password });
      setMessage(data.message || t('auth.forgot.sent'));
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#0c1445 0%,#0f3460 35%,#16213e 70%,#0d1b2a 100%)' }}>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>

        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative flex flex-col h-full p-12">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Bourour</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-5xl font-extrabold text-white leading-[1.1] mb-6">
              {t('auth.forgot.title')}
            </h1>
            <p className="text-white/55 text-base leading-relaxed max-w-md">
              {t('auth.forgot.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight">{t('auth.forgot.title')}</h2>
            <p className="text-muted-foreground text-sm mt-1">{t('auth.forgot.subtitle')}</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-3xl p-8 shadow-xl shadow-black/5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2">{t('auth.forgot.email')}</label>
              <input
                id="email" name="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                required placeholder="votre@email.com"
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2">{t('auth.reset.password')}</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">{t('auth.reset.confirm')}</label>
              <div className="relative">
                <input
                  id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  required minLength={8} placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t('common.loading') : t('auth.reset.submit')}
            </button>
          </form>

          <div className="flex items-center justify-center text-sm text-muted-foreground mt-5">
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {t('auth.forgot.back')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

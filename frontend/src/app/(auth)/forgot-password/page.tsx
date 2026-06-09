'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xl shadow-black/5">

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg">Al Bourour</span>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-extrabold">{t('auth.forgot.sent.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('auth.forgot.sent.desc1')} <strong>{email}</strong>{t('auth.forgot.sent.desc2')}
              </p>
              <p className="text-xs text-muted-foreground">{t('auth.forgot.sent.spam')}</p>
              <Link href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mt-4">
                <ArrowLeft className="w-4 h-4" /> {t('auth.forgot.back')}
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold mb-1">{t('auth.forgot.title')}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t('auth.forgot.subtitle')}</p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('auth.forgot.email')}</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required placeholder="votre@email.com"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? t('auth.forgot.sending') : t('auth.forgot.submit')}
                </button>
              </form>

              <div className="text-center mt-5">
                <Link href="/login" className="text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> {t('auth.forgot.back')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

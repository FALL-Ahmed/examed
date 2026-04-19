'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { BookOpen, Loader2, User, Mail, Phone, Lock, CheckCircle, Stethoscope, Brain, Trophy } from 'lucide-react';

const FEATURES = [
  { icon: Stethoscope, text: 'QCM par spécialité médicale' },
  { icon: Brain,       text: '500+ questions médicales validées' },
  { icon: Trophy,      text: 'Suivi de progression en temps réel' },
];

const FIELDS = [
  { key: 'fullName', label: 'Nom complet', type: 'text', placeholder: 'Mohamed Ould...', icon: User, required: true },
  { key: 'email', label: 'Adresse email', type: 'email', placeholder: 'votre@email.com', icon: Mail, required: true },
  { key: 'phone', label: 'Téléphone (optionnel)', type: 'tel', placeholder: '+222 XX XX XX XX', icon: Phone, required: false },
  { key: 'password', label: 'Mot de passe', type: 'password', placeholder: 'Minimum 8 caractères', icon: Lock, required: true },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.register(form);
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(99,102,241,0.2)' }} />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl">ExaMed</span>
        </div>

        <div className="relative">
          <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-4">Créer un compte</p>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-6">
            Rejoignez la<br />
            <span className="text-indigo-300">communauté</span><br />
            des soignants
          </h1>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Icon className="w-4 h-4 text-indigo-300" />
                </div>
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-white/70 text-xs font-medium">Pour infirmiers, étudiants et soignants</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-md py-8">

          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-violet-500/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">ExaMed</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Créer un compte</h2>
            <p className="text-muted-foreground text-sm mt-1">Rejoignez des milliers d'étudiants infirmiers</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold flex-shrink-0">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map(({ key, label, type, placeholder, icon: Icon, required }) => (
              <div key={key}>
                <label className="block text-sm font-semibold mb-2">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                    placeholder={placeholder}
                    required={required}
                    minLength={key === 'password' ? 8 : undefined}
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-white py-3 rounded-xl font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:opacity-90 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Création...' : 'Créer mon compte gratuitement'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

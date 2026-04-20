'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import {
  BookOpen, Zap, RefreshCw, TrendingUp, CheckCircle2,
  ChevronRight, Star, Shield, Clock, Target, Crown,
  Stethoscope, GraduationCap, Users, Award,
} from 'lucide-react';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'QCM par thématique',
    desc: 'Respiratoire, cardiovasculaire, pharmacologie… Entraînez-vous sur chaque spécialité.',
    color: '#6366f1',
  },
  {
    icon: Zap,
    title: 'Mode examen chronométré',
    desc: 'Simulez les conditions réelles du concours avec un chronomètre et une correction complète.',
    color: '#f59e0b',
  },
  {
    icon: RefreshCw,
    title: 'Révision des erreurs',
    desc: 'Retravaillez automatiquement vos points faibles pour progresser efficacement.',
    color: '#10b981',
  },
  {
    icon: TrendingUp,
    title: 'Suivi de progression',
    desc: 'Tableaux de bord détaillés : score par thème, évolution dans le temps, points forts.',
    color: '#3b82f6',
  },
];

const STATS = [
  { value: '500+', label: 'Questions validées', icon: Target },
  { value: '15',   label: 'Thématiques médicales', icon: BookOpen },
  { value: '100%', label: 'Adapté au concours mauritanien', icon: Shield },
  { value: '24/7', label: 'Accès illimité Premium', icon: Clock },
];

const TESTIMONIALS = [
  { name: 'Fatimata B.', role: 'Étudiante en soins infirmiers', text: 'J\'ai réussi mon concours du premier coup grâce à ExaMed. Les QCM sont vraiment adaptés au programme mauritanien.', stars: 5 },
  { name: 'Moussa D.', role: 'Infirmier diplômé, Nouakchott', text: 'Excellent outil pour maintenir ses connaissances à jour. Le mode examen est très proche des conditions réelles.', stars: 5 },
  { name: 'Aïssata K.', role: 'Étudiante 3e année', text: 'Le suivi de progression m\'aide à identifier mes lacunes et à me concentrer sur ce qui compte vraiment.', stars: 5 },
];

export default function LandingPage() {
  const router = useRouter();
  const { loadUser } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (u) router.replace(u.role === 'ADMIN' ? '/admin' : '/dashboard');
      else setChecked(true);
    });
  }, []);

  if (!checked) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ExaMed</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              Se connecter
            </Link>
            <Link href="/register"
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              S'inscrire gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-28 px-5">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <GraduationCap className="w-3.5 h-3.5" />
            Préparation au Concours National Infirmier — Mauritanie
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 text-gray-900">
            Réussissez votre<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              concours infirmier
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            500+ QCM validés par des professionnels de santé, organisés par thématique et adaptés au programme mauritanien. Entraînez-vous, progressez et réussissez.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"
              className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-xl text-sm shadow-lg shadow-violet-200 transition hover:opacity-90 w-full sm:w-auto justify-center"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              Commencer gratuitement <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 text-gray-700 font-semibold px-6 py-3.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition w-full sm:w-auto justify-center">
              J'ai déjà un compte
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">Gratuit · Sans carte bancaire · 3 questions/jour</p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-gray-100 py-10 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 mb-1">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 text-sm font-semibold uppercase tracking-widest mb-3">Fonctionnalités</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Tout pour réussir votre concours</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${f.color}14`, border: `1px solid ${f.color}25` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 px-5 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 text-sm font-semibold uppercase tracking-widest mb-3">Tarifs</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Simple et transparent</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <p className="font-bold text-lg mb-1">Gratuit</p>
              <p className="text-3xl font-extrabold text-gray-900 mb-1">0 MRU<span className="text-base font-normal text-gray-400">/mois</span></p>
              <p className="text-sm text-gray-400 mb-6">Pour commencer</p>
              <div className="space-y-3 mb-8">
                {['3 questions par jour', 'Accès à toutes les thématiques', 'Suivi de progression basique'].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/register"
                className="block text-center text-sm font-semibold text-violet-600 py-3 rounded-xl border border-violet-200 hover:bg-violet-50 transition">
                Commencer gratuitement
              </Link>
            </div>

            {/* Premium */}
            <div className="rounded-2xl p-8 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <div className="absolute top-4 right-4">
                <span className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full">
                  <Crown className="w-3 h-3" /> Recommandé
                </span>
              </div>
              <p className="font-bold text-lg mb-1">Premium</p>
              <p className="text-3xl font-extrabold mb-1">Sur demande<span className="text-base font-normal text-white/60 ml-1">/mois</span></p>
              <p className="text-sm text-white/60 mb-6">Accès illimité complet</p>
              <div className="space-y-3 mb-8">
                {[
                  'Questions illimitées',
                  'Mode examen chronométré',
                  'Révision des erreurs ciblée',
                  'Statistiques avancées par thème',
                  'Support prioritaire',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-white/90">
                    <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/register"
                className="block text-center text-sm font-semibold text-violet-700 bg-white py-3 rounded-xl hover:bg-white/90 transition">
                Activer Premium →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 text-sm font-semibold uppercase tracking-widest mb-3">Témoignages</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Ils ont réussi leur concours</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="py-20 px-5">
        <div className="max-w-2xl mx-auto text-center rounded-3xl p-12 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
          <GraduationCap className="w-10 h-10 text-white/50 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Prêt à commencer ?</h2>
          <p className="text-white/70 text-sm mb-8 leading-relaxed">Rejoignez les étudiants infirmiers qui se préparent sérieusement au concours national.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition shadow-lg">
            Créer mon compte gratuitement <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-gray-600">ExaMed</span>
            <span>· Préparation au concours infirmier mauritanien</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-gray-600 transition">Connexion</Link>
            <Link href="/register" className="hover:text-gray-600 transition">Inscription</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

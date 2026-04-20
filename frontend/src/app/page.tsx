'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import {
  BookOpen, Zap, RefreshCw, TrendingUp, CheckCircle2,
  Star, GraduationCap, ArrowRight, Target, Shield, Clock, Users,
} from 'lucide-react';
import { settingsApi } from '@/lib/api';

const FEATURES = [
  { icon: BookOpen,   title: 'QCM par thématique',         desc: 'Respiratoire, cardiovasculaire, pharmacologie… Entraînez-vous sur chaque spécialité médicale.', color: '#818cf8' },
  { icon: Zap,        title: 'Mode examen chronométré',    desc: 'Simulez les conditions réelles du concours avec un chronomètre et une correction complète en fin.', color: '#fbbf24' },
  { icon: RefreshCw,  title: 'Révision des erreurs',       desc: 'Retravaillez automatiquement vos points faibles pour combler vos lacunes rapidement.', color: '#34d399' },
  { icon: TrendingUp, title: 'Suivi de progression',       desc: 'Score par thème, courbe d\'évolution, points forts et axes d\'amélioration personnalisés.', color: '#60a5fa' },
];

const STATS = [
  { value: '500+', label: 'Questions validées' },
  { value: '50+',  label: 'Thématiques médicales' },
  { value: '100%', label: 'Adapté au programme mauritanien' },
  { value: '24/7', label: 'Disponible en permanence' },
];

const TESTIMONIALS = [
  { name: 'Fatimata B.', role: 'Étudiante en soins infirmiers', text: 'J\'ai réussi mon concours du premier coup grâce à Bourour. Les QCM sont vraiment adaptés au programme mauritanien.', stars: 5 },
  { name: 'Moussa D.',   role: 'Technicien de laboratoire, Nouakchott', text: 'Excellent outil pour maintenir ses connaissances à jour. Le mode examen est très proche des conditions réelles.', stars: 5 },
  { name: 'Aïssata K.', role: 'Étudiante en médecine, 3e année', text: 'Le suivi de progression m\'aide à identifier mes lacunes et à me concentrer sur ce qui compte vraiment.', stars: 5 },
];

export default function LandingPage() {
  const router = useRouter();
  const { loadUser } = useAuthStore();
  const [checked, setChecked] = useState(false);
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    settingsApi.pricing().then((r) => setPricing(r.data)).catch(() => {});
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (u) router.replace(u.role === 'ADMIN' ? '/admin' : '/dashboard');
      else setChecked(true);
    });
  }, []);

  if (!checked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-sm">
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shadow-violet-200"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-gray-900">Bourour</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="text-sm font-semibold text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              Se connecter
            </Link>
            <Link href="/register"
              className="text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition hover:opacity-90 shadow-md shadow-violet-200"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              S'inscrire →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0f0a2e 0%,#1a1040 40%,#0d1b3e 100%)' }}>

        {/* Blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#3b82f6,transparent)' }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-24 pb-32">
          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-violet-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 backdrop-blur-sm">
              <GraduationCap className="w-3.5 h-3.5" />
              Préparation aux concours de santé — Mauritanie
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight text-white mb-6">
              Réussissez<br />
              votre{' '}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg,#a78bfa,#60a5fa)' }}>
                concours
              </span>
            </h1>

            <p className="text-lg text-white/55 max-w-xl mb-10 leading-relaxed">
              500+ QCM validés par des professionnels de santé, organisés par thématique et adaptés aux concours mauritaniens. Infirmiers, médecins, techniciens — progressez à votre rythme.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register"
                className="inline-flex items-center justify-center gap-2 text-white font-bold px-7 py-4 rounded-2xl text-sm transition hover:opacity-90 shadow-xl shadow-violet-900/50"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                Commencer maintenant <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 text-white/70 font-semibold px-7 py-4 rounded-2xl text-sm border border-white/15 hover:bg-white/10 transition">
                J'ai déjà un compte
              </Link>
            </div>

            {/* Mini stats inline */}
            <div className="flex flex-wrap gap-6 mt-12 pt-10 border-t border-white/10">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold text-white">{s.value}</p>
                  <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-28 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-3">Fonctionnalités</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight max-w-lg">
              Tout ce qu'il faut pour réussir
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className="group relative p-7 rounded-3xl border border-gray-100 bg-white hover:border-transparent hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
                  style={{ background: `linear-gradient(135deg,${f.color}08,${f.color}03)` }} />
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: `${f.color}15` }}>
                    <f.icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-3">Témoignages</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 max-w-lg">Ils ont réussi leur concours</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6 text-sm">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-28 px-6 lg:px-10 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 text-center">
            <p className="text-violet-600 text-xs font-bold uppercase tracking-widest mb-3">Tarifs</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900">Simple et transparent</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {/* Solo 1 mois */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
                <Target className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-extrabold text-xl text-gray-900 mb-1">Solo — 1 mois</h3>
              <p className="text-gray-400 text-sm mb-6">Accès complet individuel</p>
              <p className="text-4xl font-black text-gray-900 mb-6">
                {pricing?.solo1m?.price ?? 500}
                <span className="text-lg font-semibold text-gray-400 ml-1">MRU</span>
              </p>
              <Link href="/register"
                className="block w-full text-center py-3 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition">
                Commencer
              </Link>
            </div>

            {/* Solo 3 mois — populaire */}
            <div className="relative bg-white rounded-3xl border-2 border-violet-500 p-8 shadow-xl shadow-violet-100">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">⭐ Populaire</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
                <Zap className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="font-extrabold text-xl text-gray-900 mb-1">Solo — 3 mois</h3>
              <p className="text-gray-400 text-sm mb-6">Meilleur rapport qualité/prix</p>
              <p className="text-4xl font-black text-gray-900 mb-1">
                {pricing?.solo3m?.price ?? 1200}
                <span className="text-lg font-semibold text-gray-400 ml-1">MRU</span>
              </p>
              <p className="text-xs text-violet-500 font-semibold mb-6">
                ≈ {pricing ? Math.round(pricing.solo3m.price / 3) : 400} MRU/mois
              </p>
              <Link href="/register"
                className="block w-full text-center py-3 rounded-2xl font-bold text-sm text-white transition hover:opacity-90 shadow-md shadow-violet-200"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                Commencer
              </Link>
            </div>

            {/* Groupe */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-xl text-gray-900 mb-1">Groupe</h3>
              <p className="text-gray-400 text-sm mb-6">Min. {pricing?.groupMin ?? 5} personnes</p>
              <p className="text-4xl font-black text-gray-900 mb-1">
                {pricing?.groupPerP?.price ?? 400}
                <span className="text-lg font-semibold text-gray-400 ml-1">MRU</span>
              </p>
              <p className="text-xs text-emerald-600 font-semibold mb-6">par personne / mois</p>
              <div className="space-y-1.5 mb-6">
                {[5, 10, 20].map((n) => (
                  <div key={n} className="flex justify-between text-sm">
                    <span className="text-gray-500">{n} personnes</span>
                    <span className="font-bold text-gray-800">{n * (pricing?.groupPerP?.price ?? 400)} MRU</span>
                  </div>
                ))}
              </div>
              <Link href="/register"
                className="block w-full text-center py-3 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-600 transition">
                Créer un groupe
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 lg:px-10 pb-28">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden px-10 py-16 text-center text-white"
            style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl opacity-25"
              style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />
            <div className="relative">
              <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-4">Commencez aujourd'hui</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">Prêt à décrocher<br />votre concours ?</h2>
              <p className="text-white/50 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Rejoignez les professionnels et étudiants de santé qui se préparent sérieusement aux concours nationaux mauritaniens.
              </p>
              <Link href="/register"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-sm transition hover:opacity-90 shadow-xl shadow-violet-900/50 text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                Créer mon compte <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-gray-600">Bourour</span>
            <span className="text-gray-300">·</span>
            <span>Préparation aux concours de santé mauritaniens</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-gray-700 transition">Connexion</Link>
            <Link href="/register" className="hover:text-gray-700 transition">Inscription</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

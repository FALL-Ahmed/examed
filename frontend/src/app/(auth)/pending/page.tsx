'use client';
import Link from 'next/link';
import { BookOpen, Clock, CheckCircle2, Mail } from 'lucide-react';

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'linear-gradient(160deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />

      <div className="relative w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">ExaMed</span>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <Clock className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-3">Inscription reçue !</h1>
          <p className="text-white/55 text-sm leading-relaxed mb-8">
            Votre reçu de paiement a bien été envoyé. Notre équipe va le vérifier et activer votre compte sous <strong className="text-white/80">24 heures</strong>.
          </p>

          <div className="space-y-3 text-left mb-8">
            {[
              { icon: CheckCircle2, text: 'Compte créé avec succès', done: true },
              { icon: CheckCircle2, text: 'Reçu de paiement soumis', done: true },
              { icon: Clock,        text: 'Validation en cours par notre équipe', done: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <s.icon className={`w-4 h-4 flex-shrink-0 ${s.done ? 'text-emerald-400' : 'text-white/30'}`} />
                <span className={`text-sm ${s.done ? 'text-white/70' : 'text-white/30'}`}>{s.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/10">
            <p className="text-xs text-white/40 leading-relaxed">
              Une fois validé, connectez-vous avec vos identifiants pour accéder à la plateforme complète.
            </p>
          </div>

          <Link href="/login"
            className="block w-full py-3.5 rounded-2xl font-bold text-sm text-white text-center hover:opacity-90 transition shadow-lg shadow-violet-900/50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

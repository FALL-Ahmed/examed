'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { BookOpen, Loader2, Eye, EyeOff } from 'lucide-react';

const PROFESSIONS = [
  { value: '', label: 'Sélectionner votre profession…' },
  { value: 'etudiant_infirmier', label: 'Étudiant en soins infirmiers' },
  { value: 'etudiant_medecine', label: 'Étudiant en médecine' },
  { value: 'etudiant_pharmacie', label: 'Étudiant en pharmacie' },
  { value: 'infirmier_diplome', label: 'Infirmier diplômé' },
  { value: 'aide_soignant', label: 'Aide-soignant' },
  { value: 'medecin', label: 'Médecin' },
  { value: 'sage_femme', label: 'Sage-femme' },
  { value: 'technicien_labo', label: 'Technicien de laboratoire' },
  { value: 'autre', label: 'Autre professionnel de santé' },
];

const WILAYAS = [
  '', 'Hodh Ech Chargui', 'Hodh El Gharbi', 'Assaba', 'Gorgol', 'Brakna',
  'Trarza', 'Adrar', 'Dakhlet Nouadhibou', 'Tagant', 'Guidimaka',
  'Tiris Zemmour', 'Inchiri', 'Nouakchott Ouest', 'Nouakchott Nord', 'Nouakchott Sud',
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '', lastName: '', pseudo: '', email: '',
    phone: '', profession: '', wilaya: '', password: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.profession) { setError('Veuillez sélectionner votre profession'); return; }
    setLoading(true); setError('');
    try {
      await authApi.register({
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        pseudo: form.pseudo.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        profession: form.profession || undefined,
        wilaya: form.wilaya || undefined,
        password: form.password,
      });
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition text-sm placeholder:text-gray-400 text-gray-800";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#1e1b4b 0%,#312e81 50%,#4f46e5 100%)' }}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute bottom-0 left-0 right-0 h-64 opacity-20"
          style={{ background: 'radial-gradient(ellipse at center bottom, #818cf8 0%, transparent 70%)' }} />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/25">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">ExaMed</span>
        </div>

        <div className="relative space-y-6">
          <div>
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-3">Concours de santé — Mauritanie</p>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Préparez-vous<br />à réussir
            </h1>
            <p className="text-white/55 text-sm mt-3 leading-relaxed max-w-xs">
              Rejoignez la communauté des professionnels et étudiants de santé mauritaniens qui préparent leurs concours.
            </p>
          </div>

          <div className="space-y-3">
            {[
              '500+ questions médicales validées',
              'Pour infirmiers, médecins, techniciens…',
              'Mode examen chronométré (Premium)',
              'Adapté aux concours de santé mauritaniens',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-indigo-400/30 border border-indigo-400/50 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                </div>
                <span className="text-white/65 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-white/30 text-xs">© 2025 ExaMed · Mauritanie</p>
        </div>
      </div>

      {/* ── Right form ── */}
      <div className="flex-1 flex items-start justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-lg py-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">ExaMed</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Créer mon compte</h2>
            <p className="text-gray-400 text-sm mt-1">Gratuit · Pas de carte bancaire requise</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Prénom <span className="text-red-400">*</span></label>
                <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                  className={inputClass} placeholder="Mohamed" required />
              </div>
              <div>
                <label className={labelClass}>Nom <span className="text-red-400">*</span></label>
                <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                  className={inputClass} placeholder="Ould Ahmed" required />
              </div>
            </div>

            {/* Pseudo */}
            <div>
              <label className={labelClass}>
                Pseudo <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input type="text" value={form.pseudo} onChange={(e) => set('pseudo', e.target.value)}
                className={inputClass} placeholder="@monpseudo" />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email <span className="text-red-400">*</span></label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                className={inputClass} placeholder="votre@email.com" required />
            </div>

            {/* Téléphone */}
            <div>
              <label className={labelClass}>
                Téléphone <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                className={inputClass} placeholder="+222 XX XX XX XX" />
            </div>

            {/* Profession */}
            <div>
              <label className={labelClass}>Profession <span className="text-red-400">*</span></label>
              <select value={form.profession} onChange={(e) => set('profession', e.target.value)}
                className={`${inputClass} cursor-pointer appearance-none`} required>
                {PROFESSIONS.map((p) => (
                  <option key={p.value} value={p.value} disabled={!p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Wilaya */}
            <div>
              <label className={labelClass}>
                Wilaya <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <select value={form.wilaya} onChange={(e) => set('wilaya', e.target.value)}
                className={`${inputClass} cursor-pointer appearance-none`}>
                <option value="">Sélectionner votre wilaya…</option>
                {WILAYAS.filter(Boolean).map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            {/* Mot de passe */}
            <div>
              <label className={labelClass}>Mot de passe <span className="text-red-400">*</span></label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className={`${inputClass} pr-12`} placeholder="Minimum 8 caractères" required minLength={8} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-violet-200 hover:opacity-90 mt-2"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Création en cours…' : 'Créer mon compte gratuitement'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-violet-600 font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

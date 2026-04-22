'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi, paymentsApi, settingsApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Loader2, Eye, EyeOff, ChevronRight, Copy, CheckCheck, Upload, X, Users } from 'lucide-react';

const PROFESSIONS = [
  { value: 'etudiant_infirmier',  label: 'Étudiant en soins infirmiers' },
  { value: 'etudiant_medecine',   label: 'Étudiant en médecine' },
  { value: 'etudiant_pharmacie',  label: 'Étudiant en pharmacie' },
  { value: 'infirmier_diplome',   label: 'Infirmier diplômé' },
  { value: 'aide_soignant',       label: 'Aide-soignant' },
  { value: 'medecin',             label: 'Médecin' },
  { value: 'sage_femme',          label: 'Sage-femme' },
  { value: 'technicien_labo',     label: 'Technicien de laboratoire' },
  { value: 'autre',               label: 'Autre professionnel de santé' },
];

const WILAYAS = [
  'Hodh Ech Chargui','Hodh El Gharbi','Assaba','Gorgol','Brakna',
  'Trarza','Adrar','Dakhlet Nouadhibou','Tagant','Guidimaka',
  'Tiris Zemmour','Inchiri','Nouakchott Ouest','Nouakchott Nord','Nouakchott Sud',
];

const OPERATORS = [
  { id: 'BANKILY', name: 'Bankily', image: '/images/bankily.png', key: 'BANKILY_PHONE' },
  { id: 'MASRIVI', name: 'Masrivi', image: '/images/masrivi.png', key: 'MASRIVI_PHONE' },
  { id: 'SEDAD',   name: 'Sedad',   image: '/images/sedad.png',   key: 'SEDAD_PHONE'   },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [form, setForm] = useState({
    firstName: '', lastName: '', pseudo: '', email: '',
    phone: '', gender: '', profession: '', wilaya: '', password: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [step1Error, setStep1Error] = useState('');

  // Step 2 state
  const [operators, setOperators] = useState<Record<string, string>>({});
  const [pricing, setPricing] = useState<any>({ solo1m: { price: 500 }, solo3m: { price: 1200 }, groupPerP: { price: 400 }, groupMin: 5 });
  const planParam = searchParams.get('plan');
  const [selectedPlan, setSelectedPlan] = useState<'SOLO_1M' | 'SOLO_3M' | 'GROUP'>(
    planParam === 'SOLO_3M' ? 'SOLO_3M' : planParam === 'GROUP' ? 'GROUP' : 'SOLO_1M'
  );
  const [groupSize, setGroupSize] = useState(5);
  const [groupEmailsText, setGroupEmailsText] = useState('');
  const [selectedOp, setSelectedOp] = useState('');
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [step2Error, setStep2Error] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGroupMember, setIsGroupMember] = useState(false);

  useEffect(() => {
    settingsApi.operators().then((r) => {
      const map: Record<string, string> = {};
      r.data.forEach((op: any) => { map[op.id] = op.phone; });
      setOperators(map);
    }).catch(() => {});
    settingsApi.pricing().then((r) => {
      setPricing(r.data);
      setGroupSize(r.data.groupMin ?? 5);
    }).catch(() => {});
  }, []);

  const computedAmount = selectedPlan === 'SOLO_1M'
    ? pricing.solo1m?.price ?? 500
    : selectedPlan === 'SOLO_3M'
    ? pricing.solo3m?.price ?? 1200
    : (pricing.groupPerP?.price ?? 400) * groupSize;

  const computedDuration = selectedPlan === 'SOLO_3M' ? 90 : 30;

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function validateStep1() {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'Prénom et nom requis';
    if (!form.gender) return 'Veuillez sélectionner votre sexe';
    if (!form.email.trim()) return 'Email requis';
    if (!form.profession) return 'Veuillez sélectionner votre profession';
    if (!form.password || form.password.length < 8) return 'Mot de passe minimum 8 caractères';
    return '';
  }

  async function goToStep2() {
    const err = validateStep1();
    if (err) { setStep1Error(err); return; }
    setStep1Error('');
    setLoading(true);
    try {
      const { data } = await authApi.checkGroupInvite(form.email.trim());
      if (data.isInvited) {
        setIsGroupMember(true);
        setStep(2);
        return;
      }
    } catch {}
    setLoading(false);
    setStep(2);
  }

  async function handleSubmit() {
    setStep2Error('');
    setLoading(true);

    try {
      // 1. Register
      await authApi.register({
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        pseudo: form.pseudo.trim() || undefined,
        gender: form.gender || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        profession: form.profession || undefined,
        wilaya: form.wilaya || undefined,
        password: form.password,
      });

      // 2. Login to get token
      const { data: loginData } = await authApi.login({ email: form.email.trim(), password: form.password });
      const { default: Cookies } = await import('js-cookie');
      Cookies.set('access_token', loginData.accessToken, { expires: 1 });
      Cookies.set('refresh_token', loginData.refreshToken, { expires: 7 });

      // Group member: no payment needed, go directly to dashboard
      if (isGroupMember) {
        router.push('/dashboard');
        return;
      }

      // 3. Validate payment fields
      if (!selectedOp) { setStep2Error('Choisissez un opérateur'); setLoading(false); return; }
      if (!receipt) { setStep2Error('Veuillez uploader votre reçu'); setLoading(false); return; }

      // 4. Validate group emails count
      if (selectedPlan === 'GROUP') {
        const emails = groupEmailsText.split('\n').map(e => e.trim()).filter(Boolean);
        const required = groupSize - 1;
        if (emails.length !== required) {
          setStep2Error(`Vous devez entrer exactement ${required} email${required > 1 ? 's' : ''} de membres.`);
          setLoading(false);
          return;
        }
        const invalid = emails.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        if (invalid.length > 0) {
          setStep2Error(`Email invalide : ${invalid[0]}`);
          setLoading(false);
          return;
        }
        const lowered = emails.map(e => e.toLowerCase());
        const unique = new Set(lowered);
        if (unique.size !== emails.length) {
          setStep2Error('Certains emails sont en double. Chaque membre doit avoir un email unique.');
          setLoading(false);
          return;
        }
        if (lowered.includes(form.email.trim().toLowerCase())) {
          setStep2Error('Votre propre email ne doit pas figurer dans la liste des membres.');
          setLoading(false);
          return;
        }
      }

      // 5. Submit payment
      const fd = new FormData();
      fd.append('operator', selectedOp);
      fd.append('amount', String(computedAmount));
      fd.append('paymentMethod', 'MOBILE_MONEY');
      fd.append('planType', selectedPlan);
      fd.append('durationDays', String(computedDuration));
      if (selectedPlan === 'GROUP') {
        fd.append('groupSize', String(groupSize));
        const emails = groupEmailsText.split('\n').map(e => e.trim()).filter(Boolean);
        fd.append('groupEmails', JSON.stringify(emails));
      }
      fd.append('receipt', receipt);
      await paymentsApi.submit(fd);

      router.push('/pending');
    } catch (err: any) {
      setStep2Error(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  function copyPhone() {
    const op = OPERATORS.find((o) => o.id === selectedOp);
    if (!op) return;
    const phone = operators[op.id];
    if (phone) { navigator.clipboard.writeText(phone); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition text-sm placeholder:text-gray-400 text-gray-800";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";
  const selectedOpData = OPERATORS.find((o) => o.id === selectedOp);
  const selectedPhone = selectedOpData ? operators[selectedOpData.id] : null;

  return (
    <div className="min-h-screen flex">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/3 left-0 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />

        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Al Bourour</span>
        </div>

        <div className="relative space-y-8">
          {/* Steps indicator */}
          <div className="space-y-3">
            {[
              { n: 1, label: 'Informations personnelles' },
              { n: 2, label: 'Paiement & activation' },
            ].map((s) => (
              <div key={s.n} className={`flex items-center gap-3 transition-all ${step === s.n ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                  ${step > s.n ? 'bg-emerald-500 text-white' : step === s.n ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/50'}`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span className={`text-sm font-medium ${step === s.n ? 'text-white' : 'text-white/50'}`}>{s.label}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-3">Concours de santé — Mauritanie</p>
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              {step === 1 ? 'Créez votre compte' : 'Finalisez votre inscription'}
            </h2>
            <p className="text-white/45 text-sm mt-3 leading-relaxed max-w-xs">
              {step === 1
                ? 'Renseignez vos informations pour créer votre profil.'
                : 'Envoyez votre reçu de paiement pour activer votre accès complet.'}
            </p>
          </div>

          <div className="space-y-2.5">
            {['500+ questions médicales validées', 'Pour infirmiers, médecins, techniciens…', 'Adapté aux concours mauritaniens'].map((t) => (
              <div key={t} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                <span className="text-white/50 text-xs">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/20 text-xs">© 2025 Al Bourour · Mauritanie</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-start justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-lg py-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Al Bourour</span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: step === 1 ? '50%' : '100%', background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
            </div>
            <span className="text-xs font-semibold text-gray-400">{step}/2</span>
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{t('auth.register.title')}</h2>
              <p className="text-gray-400 text-sm mb-7">{t('auth.register.subtitle')}</p>

              {step1Error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{step1Error}</div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Prénom <span className="text-red-400">*</span></label>
                    <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                      className={inputClass} placeholder="Mohamed" />
                  </div>
                  <div>
                    <label className={labelClass}>Nom <span className="text-red-400">*</span></label>
                    <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                      className={inputClass} placeholder="Ould Ahmed" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Pseudo <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <input type="text" value={form.pseudo} onChange={(e) => set('pseudo', e.target.value)}
                    className={inputClass} placeholder="@monpseudo" />
                </div>

                <div>
                  <label className={labelClass}>Sexe <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ value: 'masculin', label: 'Masculin' }, { value: 'feminin', label: 'Féminin' }].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => set('gender', opt.value)}
                        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                          ${form.gender === opt.value
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email <span className="text-red-400">*</span></label>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                    className={inputClass} placeholder="votre@email.com" />
                </div>

                <div>
                  <label className={labelClass}>Téléphone <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                    className={inputClass} placeholder="+222 XX XX XX XX" />
                </div>

                <div>
                  <label className={labelClass}>Profession <span className="text-red-400">*</span></label>
                  <select value={form.profession} onChange={(e) => set('profession', e.target.value)}
                    className={`${inputClass} cursor-pointer`}>
                    <option value="">Sélectionner…</option>
                    {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Wilaya <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <select value={form.wilaya} onChange={(e) => set('wilaya', e.target.value)}
                    className={`${inputClass} cursor-pointer`}>
                    <option value="">Sélectionner…</option>
                    {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Mot de passe <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      className={`${inputClass} pr-12`} placeholder="Minimum 8 caractères" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button onClick={goToStep2} disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition mt-2 shadow-md shadow-violet-200 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuer <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>

              <p className="text-center text-sm text-gray-400 mt-6">
                {t('auth.register.hasAccount')}{' '}
                <Link href="/login" className="text-violet-600 font-semibold hover:underline">{t('auth.register.login')}</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div>
              <button onClick={() => { setStep(1); setIsGroupMember(false); }} className="text-sm text-gray-400 hover:text-gray-700 mb-5 flex items-center gap-1 transition">
                ← Retour
              </button>

              {/* Group member fast-track */}
              {isGroupMember ? (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <CheckCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900">Accès groupe détecté !</h2>
                      <p className="text-gray-400 text-sm">Votre email fait partie d'un groupe premium.</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
                    <p className="text-emerald-800 text-sm font-semibold mb-1">✓ Aucun paiement requis</p>
                    <p className="text-emerald-700 text-xs leading-relaxed">
                      Votre accès premium sera activé immédiatement après la création de votre compte.
                    </p>
                  </div>
                  {step2Error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{step2Error}</div>
                  )}
                  <button onClick={handleSubmit} disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60 shadow-md shadow-emerald-200"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : 'Créer mon compte →'}
                  </button>
                </div>
              ) : (
              <>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Paiement</h2>
              <p className="text-gray-400 text-sm mb-7">Étape 2 sur 2 · Choisissez votre opérateur et envoyez votre reçu</p>

              {step2Error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{step2Error}</div>
              )}

              {/* Plan selection */}
              <div className="mb-6">
                <p className={labelClass}>Choisissez votre formule <span className="text-red-400">*</span></p>
                <div className="grid grid-cols-1 gap-3">
                  {/* Solo 1 mois */}
                  <button type="button" onClick={() => setSelectedPlan('SOLO_1M')}
                    className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left
                      ${selectedPlan === 'SOLO_1M' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Solo · 1 mois</p>
                      <p className="text-xs text-gray-500 mt-0.5">Accès complet pendant 30 jours</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-extrabold text-violet-700 text-lg">{pricing.solo1m?.price ?? 500} <span className="text-sm font-semibold">MRU</span></p>
                    </div>
                    {selectedPlan === 'SOLO_1M' && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </button>

                  {/* Solo 3 mois */}
                  <button type="button" onClick={() => setSelectedPlan('SOLO_3M')}
                    className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left
                      ${selectedPlan === 'SOLO_3M' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div>
                      <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        Solo · 3 mois
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⭐ Populaire</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Accès complet pendant 90 jours</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-extrabold text-violet-700 text-lg">{pricing.solo3m?.price ?? 1200} <span className="text-sm font-semibold">MRU</span></p>
                    </div>
                    {selectedPlan === 'SOLO_3M' && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </button>

                  {/* Groupe */}
                  <button type="button" onClick={() => setSelectedPlan('GROUP')}
                    className={`relative flex flex-col p-4 rounded-2xl border-2 transition-all text-left
                      ${selectedPlan === 'GROUP' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">Groupe · 1 mois</p>
                        <p className="text-xs text-gray-500 mt-0.5">Min. {pricing.groupMin ?? 5} membres · {pricing.groupPerP?.price ?? 400} MRU/personne</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-extrabold text-violet-700 text-lg">{computedAmount} <span className="text-sm font-semibold">MRU</span></p>
                      </div>
                      {selectedPlan === 'GROUP' && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                    </div>
                    {selectedPlan === 'GROUP' && (
                      <div className="mt-3 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-semibold text-gray-600">Membres :</span>
                        <button type="button" onClick={() => setGroupSize(Math.max(pricing.groupMin ?? 5, groupSize - 1))}
                          className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-50">−</button>
                        <span className="w-6 text-center font-bold text-gray-900">{groupSize}</span>
                        <button type="button" onClick={() => setGroupSize(groupSize + 1)}
                          className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-50">+</button>
                        <span className="text-xs text-gray-500 ml-1">= <strong>{computedAmount} MRU</strong> total</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Group member emails */}
              {selectedPlan === 'GROUP' && (
                <div className="mb-6">
                  <label className={labelClass}>
                    Emails des membres <span className="text-red-400">*</span>
                    <span className="text-gray-400 font-normal ml-1">({groupSize - 1} email{groupSize - 1 > 1 ? 's' : ''} requis)</span>
                  </label>
                  <textarea
                    value={groupEmailsText}
                    onChange={(e) => setGroupEmailsText(e.target.value)}
                    rows={Math.max(3, groupSize - 1)}
                    placeholder={'membre1@email.com\nmembre2@email.com\n...'}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition text-sm placeholder:text-gray-400 text-gray-800 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Un email par ligne · Vous êtes déjà inclus en tant qu'organisateur
                  </p>
                  {groupEmailsText && (() => {
                    const lines = groupEmailsText.split('\n').map(e => e.trim()).filter(Boolean);
                    const required = groupSize - 1;
                    const seen = new Set<string>();
                    const duplicates = new Set<string>();
                    lines.forEach(e => {
                      const low = e.toLowerCase();
                      if (seen.has(low)) duplicates.add(low);
                      else seen.add(low);
                    });
                    const includesOrganizer = lines.some(e => e.toLowerCase() === form.email.trim().toLowerCase());
                    const hasDuplicates = duplicates.size > 0;
                    const ok = lines.length === required && !hasDuplicates && !includesOrganizer;
                    const error = includesOrganizer
                      ? 'Votre propre email ne doit pas figurer dans la liste (vous êtes déjà organisateur)'
                      : hasDuplicates
                      ? `Emails en double : ${[...duplicates].join(', ')}`
                      : null;
                    return (
                      <div className="mt-1.5">
                        {error
                          ? <p className="text-xs font-semibold text-red-600">{error}</p>
                          : <p className={`text-xs font-semibold ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {lines.length}/{required} email{required > 1 ? 's' : ''} {ok ? '✓' : 'saisi' + (lines.length > 1 ? 's' : '')}
                            </p>
                        }
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Operators */}
              <div className="mb-6">
                <p className={labelClass}>Opérateur de paiement <span className="text-red-400">*</span></p>
                <div className="grid grid-cols-3 gap-3">
                  {OPERATORS.map((op) => (
                    <button key={op.id} onClick={() => setSelectedOp(op.id)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                        ${selectedOp === op.id
                          ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
                          : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      {selectedOp === op.id && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <img src={op.image} alt={op.name} className="h-10 w-auto object-contain" />
                      <span className="text-xs font-bold text-gray-700">{op.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone number */}
              {selectedOp && selectedPhone && (
                <div className="mb-6 p-4 rounded-2xl bg-violet-50 border border-violet-200">
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">Numéro de paiement</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl font-extrabold text-gray-900 tracking-wider">{selectedPhone}</p>
                    <button onClick={copyPhone}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-violet-200 text-violet-600 hover:bg-violet-100 transition">
                      {copied ? <><CheckCheck className="w-3.5 h-3.5" /> Copié</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
                    </button>
                  </div>
                  <p className="text-xs text-violet-500 mt-2">Envoyez le montant requis à ce numéro puis uploadez votre reçu ci-dessous.</p>
                </div>
              )}

              {selectedOp && !selectedPhone && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  Le numéro de cet opérateur n'est pas encore configuré. Contactez l'administrateur.
                </div>
              )}

              {/* Receipt upload */}
              <div className="mb-6">
                <p className={labelClass}>Reçu de paiement <span className="text-red-400">*</span></p>
                {receipt ? (
                  <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{receipt.name}</p>
                      <p className="text-xs text-gray-400">{(receipt.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={() => setReceipt(null)} className="text-gray-400 hover:text-red-500 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:border-violet-400 hover:bg-violet-50 cursor-pointer transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">Cliquez pour uploader votre reçu</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG jusqu'à 10 MB</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>

              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60 shadow-md shadow-violet-200"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</> : 'Soumettre et attendre la validation'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Votre accès sera activé dès validation de votre paiement par notre équipe.
              </p>
              </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

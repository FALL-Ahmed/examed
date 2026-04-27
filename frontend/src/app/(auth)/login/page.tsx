'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/lib/auth-store';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Eye, EyeOff, Loader2, Stethoscope, Activity, Shield, Users, Smartphone, UserCheck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { LanguageSwitcherLight } from '@/components/LanguageSwitcher';

const PROFESSIONS = [
  { value: 'etudiant_infirmier',  label: 'Étudiant en sciences infirmières' },
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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { t, lang, setLang } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [deviceStep, setDeviceStep] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  // Group member flow
  const [groupView, setGroupView] = useState<'none' | 'email' | 'setup'>('none');
  const [groupEmail, setGroupEmail] = useState('');
  const [groupAccessToken, setGroupAccessToken] = useState('');
  const [setupFullName, setSetupFullName] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupGender, setSetupGender] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupWilaya, setSetupWilaya] = useState('');
  const [setupProfession, setSetupProfession] = useState('');
  const [showSetupPwd, setShowSetupPwd] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const STATS = [
    { value: '350+', label: t('login.stat1') },
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
      const result = await login(email, password);
      if (result.requiresDeviceVerification) {
        setDeviceFingerprint(result.deviceFingerprint ?? '');
        setDeviceStep(true);
        return;
      }
      const user = useAuthStore.getState().user;
      router.push(user?.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.login.error'));
    } finally { setLoading(false); }
  }

  async function handleGroupAccess(e: React.FormEvent) {
    e.preventDefault();
    setGroupLoading(true); setGroupError('');
    try {
      const { data } = await authApi.groupAccess(groupEmail.trim());
      setGroupAccessToken(data.groupAccessToken);
      setGroupView('setup');
    } catch (err: any) {
      setGroupError(err.response?.data?.message || 'Email introuvable ou invitation inactive');
    } finally { setGroupLoading(false); }
  }

  async function handleGroupSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!setupFullName.trim()) { setGroupError('Nom complet requis'); return; }
    if (!setupGender) { setGroupError('Veuillez sélectionner votre sexe'); return; }
    if (!setupProfession) { setGroupError('Veuillez sélectionner votre profession'); return; }
    if (setupPassword.length < 8) { setGroupError('Mot de passe minimum 8 caractères'); return; }
    setGroupLoading(true); setGroupError('');
    try {
      const { data } = await authApi.groupSetup({
        token: groupAccessToken, fullName: setupFullName, password: setupPassword,
        gender: setupGender, phone: setupPhone || undefined,
        wilaya: setupWilaya || undefined, profession: setupProfession,
      });
      const { default: Cookies } = await import('js-cookie');
      Cookies.set('access_token', data.accessToken, { expires: 1 });
      Cookies.set('refresh_token', data.refreshToken, { expires: 7 });
      useAuthStore.getState().setUser(data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setGroupError(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally { setGroupLoading(false); }
  }

  async function handleVerifyDevice(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await authApi.verifyDevice({ email, verificationCode: verifyCode.trim(), deviceFingerprint, deviceName: navigator.userAgent });
      Cookies.set('access_token', data.accessToken, { expires: 1 });
      Cookies.set('refresh_token', data.refreshToken, { expires: 7 });
      useAuthStore.getState().setUser(data.user);
      router.push(data.user?.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Code incorrect ou expiré');
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
          <div className={`flex items-center gap-3 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">{t('app.name')}</span>
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
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcherLight />
        </div>
        <div className={`w-full max-w-md transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-violet-500/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">{t('app.name')}</span>
          </div>

          {deviceStep ? (
            /* ── Vérification appareil ── */
            <>
              <div className="mb-8 flex flex-col items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">Vérification requise</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Un code a été envoyé à <strong>{email}</strong>. Entrez-le ci-dessous pour approuver cet appareil.
                  </p>
                </div>
              </div>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold flex-shrink-0">!</span>
                  {error}
                </div>
              )}
              <form onSubmit={handleVerifyDevice} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Code de vérification</label>
                  <input
                    type="text" value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground tracking-widest text-center text-lg font-bold"
                    placeholder="······" maxLength={8} required
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? t('common.loading') : 'Vérifier l\'appareil'}
                </button>
                <button type="button" onClick={() => { setDeviceStep(false); setError(''); setVerifyCode(''); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition text-center">
                  ← Retour à la connexion
                </button>
              </form>
            </>
          ) : groupView === 'email' ? (
            /* ── Étape 1 groupe : saisir l'email ── */
            <>
              <div className="mb-8 flex flex-col items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">Accès membre groupe</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Entrez l'email que l'organisateur a renseigné pour vous.
                  </p>
                </div>
              </div>
              {groupError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold flex-shrink-0">!</span>
                  {groupError}
                </div>
              )}
              <form onSubmit={handleGroupAccess} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Votre email</label>
                  <input
                    type="email" value={groupEmail}
                    onChange={(e) => setGroupEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                    placeholder="votre@email.com" required autoFocus
                  />
                </div>
                <button type="submit" disabled={groupLoading}
                  className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
                  {groupLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {groupLoading ? 'Vérification...' : 'Vérifier mon invitation'}
                </button>
                <button type="button" onClick={() => { setGroupView('none'); setGroupError(''); setGroupEmail(''); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition text-center">
                  ← Retour à la connexion
                </button>
              </form>
            </>
          ) : groupView === 'setup' ? (
            /* ── Étape 2 groupe : définir nom + mot de passe ── */
            <>
              <div className="mb-8 flex flex-col items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">Bienvenue !</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Invitation confirmée. Définissez votre profil pour accéder à la plateforme.
                  </p>
                </div>
              </div>
              {groupError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold flex-shrink-0">!</span>
                  {groupError}
                </div>
              )}
              <form onSubmit={handleGroupSetup} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Langue préférée</label>
                  <div className="flex gap-3">
                    {[{ v: 'fr', l: 'Français 🇫🇷' }, { v: 'ar', l: 'العربية 🇲🇷' }].map(({ v, l }) => (
                      <button key={v} type="button"
                        onClick={() => setLang(v as 'fr' | 'ar')}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${lang === v ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Nom complet</label>
                  <input
                    type="text" value={setupFullName}
                    onChange={(e) => setSetupFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                    placeholder="Prénom Nom" required autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Sexe</label>
                  <div className="flex gap-3">
                    {[{ v: 'male', l: 'Homme' }, { v: 'female', l: 'Femme' }].map(({ v, l }) => (
                      <button key={v} type="button"
                        onClick={() => setSetupGender(v)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${setupGender === v ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Profession</label>
                  <select value={setupProfession} onChange={(e) => setSetupProfession(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm" required>
                    <option value="">Sélectionner...</option>
                    {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Téléphone <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                    <input type="tel" value={setupPhone} onChange={(e) => setSetupPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                      placeholder="ex: 22000000" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Wilaya <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                    <select value={setupWilaya} onChange={(e) => setSetupWilaya(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm">
                      <option value="">Sélectionner...</option>
                      {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showSetupPwd ? 'text' : 'password'} value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                      placeholder="Minimum 8 caractères" required minLength={8}
                    />
                    <button type="button" onClick={() => setShowSetupPwd(!showSetupPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                      {showSetupPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Vous utiliserez ce mot de passe pour vos prochaines connexions.</p>
                </div>
                <button type="submit" disabled={groupLoading}
                  className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
                  {groupLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {groupLoading ? 'Création du compte...' : 'Créer mon compte et accéder'}
                </button>
              </form>
            </>
          ) : (
            /* ── Connexion normale ── */
            <>
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
                    placeholder="votre@email.com" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('auth.login.password')}</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm placeholder:text-muted-foreground"
                      placeholder="••••••••" required
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
              <div className="mt-6 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setGroupView('email'); setGroupError(''); setGroupEmail(''); }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-sm font-medium transition"
                >
                  <UserCheck className="w-4 h-4 text-violet-500" />
                  Membre d'un groupe ? Accéder ici
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

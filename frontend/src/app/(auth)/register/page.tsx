'use client';
import { Suspense, useState, useEffect, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi, settingsApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Loader2, Eye, EyeOff, Copy, CheckCheck, Upload, X, MessageCircle } from 'lucide-react';
import { LanguageSwitcherLight } from '@/components/LanguageSwitcher';

declare function gtag(...args: any[]): void;
const gtrack = (event: string, params?: Record<string, any>) => {
  if (typeof gtag !== 'undefined') gtag('event', event, params);
};

const pad = (n: number) => String(n).padStart(2, '0');

const CountdownTimer = memo(({ isAr }: { isAr: boolean }) => {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = new Date('2026-04-29T23:59:59').getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setT({ h: 0, m: 0, s: 0 }); return; }
      setT({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1.5 mt-1">
      {[
        { v: pad(t.h), l: isAr ? 'س' : 'h' },
        { v: pad(t.m), l: isAr ? 'د' : 'm' },
        { v: pad(t.s), l: isAr ? 'ث' : 's' },
      ].map(({ v, l }, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="bg-red-700 text-white font-extrabold text-sm px-2 py-0.5 rounded-md tabular-nums">{v}</span>
          <span className="text-red-400 text-xs font-semibold">{l}</span>
          {i < 2 && <span className="text-red-400 font-bold mx-0.5">:</span>}
        </div>
      ))}
    </div>
  );
});

const PROFESSIONS = [
  { value: 'etudiant_infirmier',  fr: 'Étudiant en sciences infirmières', ar: 'طالب علوم التمريض' },
  { value: 'etudiant_medecine',   fr: 'Étudiant en médecine',             ar: 'طالب طب' },
  { value: 'etudiant_pharmacie',  fr: 'Étudiant en pharmacie',            ar: 'طالب صيدلة' },
  { value: 'infirmier_diplome',   fr: 'Infirmier diplômé',                ar: 'ممرض متخرج' },
  { value: 'aide_soignant',       fr: 'Aide-soignant',                    ar: 'مساعد تمريض' },
  { value: 'medecin',             fr: 'Médecin',                          ar: 'طبيب' },
  { value: 'sage_femme',          fr: 'Sage-femme',                       ar: 'قابلة' },
  { value: 'technicien_labo',     fr: 'Technicien de laboratoire',        ar: 'تقني مخبر' },
  { value: 'autre',               fr: 'Autre professionnel de santé',     ar: 'مهني صحة آخر' },
];

const WILAYAS = [
  'Hodh Ech Chargui','Hodh El Gharbi','Assaba','Gorgol','Brakna',
  'Trarza','Adrar','Dakhlet Nouadhibou','Tagant','Guidimaka',
  'Tiris Zemmour','Inchiri','Nouakchott Ouest','Nouakchott Nord','Nouakchott Sud',
];

const OPERATORS = [
  { id: 'BANKILY', name: 'Bankily', image: '/images/bankily.png' },
  { id: 'MASRIVI', name: 'Masrivi', image: '/images/masrivi.png' },
  { id: 'SEDAD',   name: 'Sedad',   image: '/images/sedad.png'   },
];

function RegisterContent() {
  const searchParams = useSearchParams();
  const { t, lang } = useLang();
  const isAr = lang === 'ar';

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    phone: '', gender: '', profession: '', wilaya: '', password: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState('');

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
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [waPhone, setWaPhone] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.whatsapp().then((r) => setWaPhone(r.data.phone)).catch(() => {});
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

  const promoActive = new Date() <= new Date('2026-04-29T23:59:59');
  const promo = (p: number) => Math.round(p / 2);

  const solo1mBase = pricing.solo1m?.price ?? 500;
  const solo3mBase = pricing.solo3m?.price ?? 1200;
  const groupPerP  = pricing.groupPerP?.price ?? 400;
  const groupBase  = groupPerP * groupSize;

  const solo1mPrice = promoActive ? promo(solo1mBase) : solo1mBase;
  const solo3mPrice = promoActive ? promo(solo3mBase) : solo3mBase;
  const groupPrice  = promoActive ? promo(groupBase)  : groupBase;

  const computedAmount   = selectedPlan === 'SOLO_1M' ? solo1mPrice : selectedPlan === 'SOLO_3M' ? solo3mPrice : groupPrice;
  const computedDuration = selectedPlan === 'SOLO_3M' ? 90 : 30;

  function set(key: string, value: string) {
    if (!started) { setStarted(true); gtrack('register_start', { lang }); }
    setForm((p) => ({ ...p, [key]: value }));
  }

  function scrollTo(id: string) {
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  function fail(msg: string, fieldId: string, reason: string) {
    setFormError(msg);
    scrollTo(fieldId);
    gtrack('register_error', { reason });
  }

  async function handleSubmit() {
    setFormError('');
    gtrack('register_submit_attempt', { plan: selectedPlan, lang });

    if (!form.firstName.trim() || !form.lastName.trim())
      return fail(isAr ? 'الاسم الأول والأخير مطلوبان' : 'Prénom et nom requis', 'field-name', 'missing_name');
    if (!form.gender)
      return fail(isAr ? 'يرجى تحديد جنسك' : 'Veuillez sélectionner votre sexe', 'field-gender', 'missing_gender');
    if (!form.email.trim())
      return fail(isAr ? 'البريد الإلكتروني مطلوب' : 'Email requis', 'field-email', 'missing_email');
    if (!form.profession)
      return fail(isAr ? 'يرجى تحديد مهنتك' : 'Veuillez sélectionner votre profession', 'field-profession', 'missing_profession');
    if (!form.password || form.password.length < 8)
      return fail(isAr ? 'كلمة المرور 8 أحرف على الأقل' : 'Mot de passe minimum 8 caractères', 'field-password', 'weak_password');
    if (!selectedOp)
      return fail(isAr ? 'اختر مشغل الدفع' : 'Choisissez un opérateur de paiement', 'field-operator', 'missing_operator');
    if (!receipt)
      return fail(isAr ? 'يرجى رفع إيصال الدفع' : 'Veuillez uploader votre reçu de paiement', 'field-receipt', 'missing_receipt');

    if (selectedPlan === 'GROUP') {
      const emails = groupEmailsText.split('\n').map((e: string) => e.trim()).filter(Boolean);
      const required = groupSize - 1;
      if (emails.length !== required)
        return fail(isAr ? `يجب إدخال ${required} بريد إلكتروني بالضبط.` : `Vous devez entrer exactement ${required} email${required > 1 ? 's' : ''}.`, 'field-group-emails', 'group_emails_count');
      const invalid = emails.filter((e: string) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (invalid.length > 0)
        return fail((isAr ? 'بريد غير صالح: ' : 'Email invalide : ') + invalid[0], 'field-group-emails', 'invalid_email');
      const lowered = emails.map((e: string) => e.toLowerCase());
      if (new Set(lowered).size !== emails.length)
        return fail(isAr ? 'بعض الإيميلات مكررة.' : 'Certains emails sont en double.', 'field-group-emails', 'duplicate_emails');
      if (lowered.includes(form.email.trim().toLowerCase()))
        return fail(isAr ? 'بريدك لا يجب أن يظهر في قائمة الأعضاء.' : 'Votre email ne doit pas figurer dans la liste des membres.', 'field-group-emails', 'organizer_in_members');
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('fullName', `${form.firstName.trim()} ${form.lastName.trim()}`);
      fd.append('email', form.email.trim());
      fd.append('password', form.password);
      if (form.gender)       fd.append('gender', form.gender);
      if (form.phone.trim()) fd.append('phone', form.phone.trim());
      if (form.profession)   fd.append('profession', form.profession);
      if (form.wilaya)       fd.append('wilaya', form.wilaya);
      fd.append('operator', selectedOp);
      fd.append('amount', String(computedAmount));
      fd.append('paymentMethod', 'MOBILE_MONEY');
      fd.append('planType', selectedPlan);
      fd.append('durationDays', String(computedDuration));
      if (selectedPlan === 'GROUP') {
        fd.append('groupSize', String(groupSize));
        const emails = groupEmailsText.split('\n').map((e: string) => e.trim()).filter(Boolean);
        fd.append('groupEmails', JSON.stringify(emails));
      }
      fd.append('receipt', receipt!);

      await authApi.register(fd);
      const { data: ld } = await authApi.login({ email: form.email.trim(), password: form.password });
      const { default: Cookies } = await import('js-cookie');
      Cookies.set('access_token', ld.accessToken, { expires: 1 });
      Cookies.set('refresh_token', ld.refreshToken, { expires: 7 });

      gtrack('register_success', { plan: selectedPlan, operator: selectedOp, lang });
      window.location.href = '/pending';
    } catch (err: any) {
      const msg = err.response?.data?.message || 'server_error';
      setFormError(msg || (isAr ? 'حدث خطأ' : 'Une erreur est survenue'));
      gtrack('register_error', { reason: 'server_error', message: msg });
      setLoading(false);
    }
  }

  function copyPhone() {
    const phone = operators[selectedOp];
    if (phone) { navigator.clipboard.writeText(phone); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition text-sm placeholder:text-gray-400 text-gray-800';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';
  const selectedPhone = selectedOp ? operators[selectedOp] : null;
  const opt = isAr ? '(اختياري)' : '(optionnel)';

  const checkIcon = (
    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="h-screen flex overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Left panel — fixe, ne scrolle pas */}
      <div className="hidden lg:flex lg:w-[38%] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/3 left-0 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />

        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">{t('app.name')}</span>
        </div>

        <div className="relative space-y-8">
          <div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-3">
              {isAr ? 'مسابقة الصحة — موريتانيا' : 'Concours de santé — Mauritanie'}
            </p>
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              {isAr ? 'أنشئ حسابك' : 'Créez votre compte'}
            </h2>
            <p className="text-white/45 text-sm mt-3 leading-relaxed max-w-xs">
              {isAr
                ? 'أدخل معلوماتك وأرسل إيصال الدفع لتفعيل وصولك الكامل فوراً.'
                : 'Renseignez vos informations et envoyez votre reçu pour activer votre accès immédiatement.'}
            </p>
          </div>

          <div className="space-y-2.5">
            {(isAr
              ? ['+350 سؤال طبي معتمد', 'للممرضين والأطباء والتقنيين', 'مكيّف مع المسابقات الموريتانية', 'وصول فوري بعد التحقق']
              : ['350+ questions médicales validées', 'Pour infirmiers, médecins, techniciens', 'Adapté aux concours mauritaniens', 'Accès activé dès validation']
            ).map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                <span className="text-white/50 text-xs">{item}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-white/30 text-xs mb-2.5">{isAr ? 'يُقبل الدفع عبر' : 'Paiement accepté via'}</p>
            <div className="flex items-center gap-3">
              {OPERATORS.map((op) => (
                <img key={op.id} src={op.image} alt={op.name} className="h-7 w-auto object-contain opacity-75" />
              ))}
            </div>
          </div>
        </div>

        <p className="relative text-white/20 text-xs">© 2025 Al Bourour · Mauritanie</p>
      </div>

      {/* Right form — seule partie qui scrolle */}
      <div className="flex-1 flex items-start justify-center p-6 bg-gray-50 overflow-y-auto relative h-full">
        <div className="absolute top-4 right-4">
          <LanguageSwitcherLight />
        </div>
        <div className="w-full max-w-lg py-8">

          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">{t('app.name')}</span>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
            {isAr ? 'إنشاء حساب' : 'Créer un compte'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {isAr ? 'أكمل النموذج أدناه لتفعيل اشتراكك.' : 'Complétez le formulaire pour activer votre abonnement.'}
          </p>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm font-medium">{formError}</div>
          )}

          {/* ── Section 1 : Profil ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">
              {isAr ? '👤 ملفك الشخصي' : '👤 Votre profil'}
            </p>
            <div className="space-y-4">

              <div id="field-name" className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{isAr ? 'الاسم الأول' : 'Prénom'} <span className="text-red-400">*</span></label>
                  <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                    className={inputClass} placeholder={isAr ? 'محمد' : 'Mohamed'} />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'اللقب' : 'Nom'} <span className="text-red-400">*</span></label>
                  <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                    className={inputClass} placeholder={isAr ? 'ولد أحمد' : 'Ould Ahmed'} />
                </div>
              </div>

              <div id="field-gender">
                <label className={labelClass}>{isAr ? 'الجنس' : 'Sexe'} <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'masculin', fr: 'Masculin', ar: 'ذكر' },
                    { value: 'feminin',  fr: 'Féminin',  ar: 'أنثى' },
                  ].map((o) => (
                    <button key={o.value} type="button" onClick={() => set('gender', o.value)}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                        ${form.gender === o.value
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                      {isAr ? o.ar : o.fr}
                    </button>
                  ))}
                </div>
              </div>

              <div id="field-email">
                <label className={labelClass}>{isAr ? 'البريد الإلكتروني' : 'Email'} <span className="text-red-400">*</span></label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className={inputClass} placeholder="votre@email.com" dir="ltr" />
              </div>

              <div id="field-profession">
                <label className={labelClass}>{isAr ? 'المهنة' : 'Profession'} <span className="text-red-400">*</span></label>
                <select value={form.profession} onChange={(e) => set('profession', e.target.value)}
                  className={`${inputClass} cursor-pointer`}>
                  <option value="">{isAr ? 'اختر…' : 'Sélectionner…'}</option>
                  {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{isAr ? p.ar : p.fr}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{isAr ? 'الهاتف' : 'Téléphone'} <span className="text-gray-400 font-normal text-xs">{opt}</span></label>
                  <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                    className={inputClass} placeholder="+222 XX XX XX" dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>{isAr ? 'الولاية' : 'Wilaya'} <span className="text-gray-400 font-normal text-xs">{opt}</span></label>
                  <select value={form.wilaya} onChange={(e) => set('wilaya', e.target.value)}
                    className={`${inputClass} cursor-pointer`}>
                    <option value="">{isAr ? 'اختر…' : 'Sélectionner…'}</option>
                    {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div id="field-password">
                <label className={labelClass}>{isAr ? 'كلمة المرور' : 'Mot de passe'} <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    className={`${inputClass} ${isAr ? 'pl-12' : 'pr-12'}`}
                    placeholder={isAr ? '8 أحرف على الأقل' : 'Minimum 8 caractères'} dir="ltr" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className={`absolute ${isAr ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600`}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ── Section 2 : Abonnement & Paiement ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">
              {isAr ? '💳 اشتراكك ودفعك' : '💳 Votre abonnement & paiement'}
            </p>

            {promoActive && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 mb-5">
                <span className="text-xl flex-shrink-0">🎉</span>
                <div>
                  <p className="text-sm font-bold text-red-700">
                    {isAr ? 'عرض إطلاق — خصم 50% على جميع الخطط !' : 'Offre de lancement — -50% sur tous les plans !'}
                  </p>
                  <p className="text-xs text-red-500 mt-0.5">
                    {isAr ? 'ينتهي خلال' : 'Expire dans'}
                  </p>
                  <CountdownTimer isAr={isAr} />
                </div>
              </div>
            )}

            {/* Plans */}
            <div className="space-y-3 mb-5">
              {/* Solo 1 mois */}
              <button type="button" onClick={() => { setSelectedPlan('SOLO_1M'); gtrack('register_plan_selected', { plan: 'SOLO_1M' }); }}
                className={`relative w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left
                  ${selectedPlan === 'SOLO_1M' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{isAr ? 'فردي · شهر' : 'Solo · 1 mois'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{isAr ? 'وصول كامل 30 يوماً' : 'Accès complet 30 jours'}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  {promoActive && <p className="text-xs text-gray-400 line-through">{solo1mBase} MRU</p>}
                  <p className="font-extrabold text-violet-700 text-lg">{solo1mPrice} <span className="text-sm font-semibold">MRU</span></p>
                  {promoActive && <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">-50%</span>}
                </div>
                {selectedPlan === 'SOLO_1M' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">{checkIcon}</div>
                )}
              </button>

              {/* Solo 3 mois */}
              <button type="button" onClick={() => { setSelectedPlan('SOLO_3M'); gtrack('register_plan_selected', { plan: 'SOLO_3M' }); }}
                className={`relative w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left
                  ${selectedPlan === 'SOLO_3M' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div>
                  <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    {isAr ? 'فردي · 3 أشهر' : 'Solo · 3 mois'}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {isAr ? '⭐ الأكثر طلباً' : '⭐ Populaire'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{isAr ? 'وصول كامل 90 يوماً' : 'Accès complet 90 jours'}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  {promoActive && <p className="text-xs text-gray-400 line-through">{solo3mBase} MRU</p>}
                  <p className="font-extrabold text-violet-700 text-lg">{solo3mPrice} <span className="text-sm font-semibold">MRU</span></p>
                  {promoActive && <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">-50%</span>}
                </div>
                {selectedPlan === 'SOLO_3M' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">{checkIcon}</div>
                )}
              </button>

              {/* Groupe */}
              <button type="button" onClick={() => { setSelectedPlan('GROUP'); gtrack('register_plan_selected', { plan: 'GROUP' }); }}
                className={`relative w-full flex flex-col p-4 rounded-2xl border-2 transition-all text-left
                  ${selectedPlan === 'GROUP' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{isAr ? 'مجموعة · شهر' : 'Groupe · 1 mois'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isAr
                        ? `الحد الأدنى ${pricing.groupMin ?? 5} أعضاء · ${groupPerP} MRU/شخص`
                        : `Min. ${pricing.groupMin ?? 5} membres · ${groupPerP} MRU/personne`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    {promoActive && <p className="text-xs text-gray-400 line-through">{groupBase} MRU</p>}
                    <p className="font-extrabold text-violet-700 text-lg">{groupPrice} <span className="text-sm font-semibold">MRU</span></p>
                    {promoActive && <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">-50%</span>}
                  </div>
                  {selectedPlan === 'GROUP' && (
                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">{checkIcon}</div>
                  )}
                </div>
                {selectedPlan === 'GROUP' && (
                  <div className="mt-3 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-semibold text-gray-600">{isAr ? 'الأعضاء :' : 'Membres :'}</span>
                    <button type="button" onClick={() => setGroupSize(Math.max(pricing.groupMin ?? 5, groupSize - 1))}
                      className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-50">−</button>
                    <span className="w-6 text-center font-bold text-gray-900">{groupSize}</span>
                    <button type="button" onClick={() => setGroupSize(groupSize + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-50">+</button>
                    <span className="text-xs text-gray-500 ml-1">= <strong>{groupPrice} MRU</strong> {isAr ? 'إجمالاً' : 'total'}</span>
                  </div>
                )}
              </button>
            </div>

            {/* Emails membres groupe */}
            {selectedPlan === 'GROUP' && (
              <div id="field-group-emails" className="mb-5">
                <label className={labelClass}>
                  {isAr ? 'إيميلات الأعضاء' : 'Emails des membres'} <span className="text-red-400">*</span>
                  <span className="text-gray-400 font-normal ml-1 text-xs">
                    ({groupSize - 1} {isAr ? 'بريد مطلوب' : `email${groupSize - 1 > 1 ? 's' : ''} requis`})
                  </span>
                </label>
                <textarea
                  value={groupEmailsText}
                  onChange={(e) => setGroupEmailsText(e.target.value)}
                  rows={Math.max(3, groupSize - 1)}
                  placeholder={'membre1@email.com\nmembre2@email.com\n...'}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition text-sm placeholder:text-gray-400 text-gray-800 font-mono"
                  dir="ltr"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {isAr ? 'بريد إلكتروني واحد لكل سطر · أنت مدرج بالفعل كمنظم' : "Un email par ligne · Vous êtes déjà inclus en tant qu'organisateur"}
                </p>
              </div>
            )}

            {/* Opérateur */}
            <div id="field-operator" className="mb-5">
              <p className={labelClass}>{isAr ? 'مشغل الدفع' : 'Opérateur de paiement'} <span className="text-red-400">*</span></p>
              <div className="grid grid-cols-3 gap-3">
                {OPERATORS.map((op) => (
                  <button key={op.id} type="button" onClick={() => { setSelectedOp(op.id); gtrack('register_operator_selected', { operator: op.id }); }}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                      ${selectedOp === op.id ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    {selectedOp === op.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">{checkIcon}</div>
                    )}
                    <img src={op.image} alt={op.name} className="h-10 w-auto object-contain" />
                    <span className="text-xs font-bold text-gray-700">{op.name}</span>
                    {operators[op.id] && (
                      <span className="text-xs font-black text-violet-600 tracking-wider" dir="ltr">{operators[op.id].replace(/^\+?222\s*/, '')}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Numéro de paiement */}
            {selectedOp && selectedPhone && (
              <div className="mb-5 p-4 rounded-2xl bg-violet-50 border border-violet-200">
                <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">
                  {isAr ? 'رقم الدفع' : 'Numéro de paiement'}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-extrabold text-gray-900 tracking-wider" dir="ltr">{selectedPhone}</p>
                  <button type="button" onClick={copyPhone}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-violet-200 text-violet-600 hover:bg-violet-100 transition">
                    {copied
                      ? <><CheckCheck className="w-3.5 h-3.5" /> {isAr ? 'تم النسخ' : 'Copié'}</>
                      : <><Copy className="w-3.5 h-3.5" /> {isAr ? 'نسخ' : 'Copier'}</>}
                  </button>
                </div>
                <p className="text-xs text-violet-500 mt-2">
                  {isAr
                    ? 'أرسل المبلغ إلى هذا الرقم ثم ارفع الإيصال أدناه.'
                    : 'Envoyez le montant à ce numéro puis uploadez votre reçu ci-dessous.'}
                </p>
              </div>
            )}

            {selectedOp && !selectedPhone && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                {isAr ? 'رقم هذا المشغل لم يُضبط بعد. تواصل مع المسؤول.' : "Le numéro de cet opérateur n'est pas encore configuré. Contactez l'administrateur."}
              </div>
            )}

            {/* Upload reçu */}
            <div id="field-receipt">
              <p className={labelClass}>{isAr ? 'إيصال الدفع' : 'Reçu de paiement'} <span className="text-red-400">*</span></p>
              {receipt ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{receipt.name}</p>
                    <p className="text-xs text-gray-400">{(receipt.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={() => setReceipt(null)} className="text-gray-400 hover:text-red-500 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:border-violet-400 hover:bg-violet-50 cursor-pointer transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      {isAr ? 'انقر لرفع إيصالك' : 'Cliquez pour uploader votre reçu'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG {isAr ? 'حتى 10 MB' : "jusqu'à 10 MB"}</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0] || null; setReceipt(f); if (f) gtrack('register_receipt_uploaded'); }} />
                </label>
              )}
            </div>

            {/* WhatsApp support */}
            {waPhone && (
              <a
                href={`https://wa.me/${waPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition shadow-md mt-5"
                style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}
              >
                <MessageCircle className="w-4 h-4" />
                {isAr ? 'تواصل مع الدعم' : 'Contacter le support'}
                <span className="font-normal opacity-80 text-xs ml-1">· {waPhone}</span>
              </a>
            )}
          </div>

          {/* Submit */}
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60 shadow-lg shadow-violet-200"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> {isAr ? 'جارٍ الإرسال…' : 'Envoi en cours…'}</>
              : (isAr ? 'إنشاء حسابي الآن ←' : 'Créer mon compte maintenant →')}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            {isAr
              ? 'سيتم تفعيل وصولك فور التحقق من الدفع.'
              : 'Votre accès sera activé dès validation de votre paiement.'}
          </p>

          {/* Logos paiement mobile */}
          <div className="lg:hidden flex items-center justify-center gap-4 mt-4">
            {OPERATORS.map((op) => (
              <img key={op.id} src={op.image} alt={op.name} className="h-6 w-auto object-contain opacity-60" />
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-5">
            {t('auth.register.hasAccount')}{' '}
            <Link href="/login" className="text-violet-600 font-semibold hover:underline">{t('auth.register.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { paymentsApi, settingsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLang } from '@/components/LanguageProvider';
import { computePrices } from '@/lib/promo';
import {
  ArrowLeft, Check, CheckCheck, CheckCircle2, Clock, Copy, Crown, Loader2, MessageCircle, Minus, Plus, Upload, Users, X,
} from 'lucide-react';

const OPERATORS = [
  { id: 'BANKILY', name: 'Bankily', image: '/images/bankily.png' },
  { id: 'MASRIVI', name: 'Masrivi', image: '/images/masrivi.png' },
  { id: 'SEDAD', name: 'Sedad', image: '/images/sedad.png' },
];
const localPhone = (p: string) => p.replace(/^\+?222\s*/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Abonnement Premium depuis l'espace élève : mêmes formules, prix et promo que l'inscription
export default function AbonnementPage() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const t = (fr: string, ar: string) => (isAr ? ar : fr);
  const fmt = (n: number) => n.toLocaleString(isAr ? 'ar-EG' : 'fr-FR');

  const [pricing, setPricing] = useState({ solo: 2000, perPerson: 1500, groupMin: 3, concours: 1000 });
  const [promo, setPromo] = useState<any>(null);
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [pending, setPending] = useState(false); // paiement déjà envoyé, en attente de validation

  const [plan, setPlan] = useState<'SOLO_1M' | 'CONCOURS' | 'GROUP'>('CONCOURS');
  const [groupSize, setGroupSize] = useState(3);
  const [emails, setEmails] = useState('');
  const [operator, setOperator] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsApi.pricing().then((r) => {
      setPricing({ solo: r.data.solo1m?.price ?? 2000, perPerson: r.data.groupPerP?.price ?? 1500, groupMin: r.data.groupMin ?? 3, concours: r.data.concours?.price ?? 1000 });
      setGroupSize(r.data.groupMin ?? 3);
    }).catch(() => {});
    settingsApi.promo().then((r) => setPromo(r.data)).catch(() => {});
    settingsApi.operators().then((r) => setPhones(Object.fromEntries(r.data.map((o: any) => [o.id, o.phone])))).catch(() => {});
    settingsApi.whatsapp().then((r) => setWaPhone(r.data.phone)).catch(() => {});
    paymentsApi.myPayments().then((r) => setPending(r.data.some((p: any) => p.status === 'PENDING'))).catch(() => {});
  }, []);

  // Même calcul que l'inscription (prix promo fixes ou pourcentage)
  const prices = computePrices({
    soloBase: pricing.solo, perPerson: pricing.perPerson, groupSize, promo, isBiologiste: user?.profession === 'biologiste',
  });
  const bio = prices.isBioPromo;
  const promoActive = prices.active;
  const promoOnGroup = prices.onGroup;
  const promoEnd = prices.endDate;
  const soloPrice = prices.solo;
  const groupBase = prices.groupBase;
  const groupPrice = prices.group;
  const concoursPrice = pricing.concours ?? 1000;
  const amount = plan === 'SOLO_1M' ? soloPrice : plan === 'CONCOURS' ? concoursPrice : groupPrice;
  const emailList = emails.split('\n').map((e) => e.trim()).filter(Boolean);

  async function submit() {
    setError('');
    if (plan === 'GROUP') {
      const required = groupSize - 1;
      if (emailList.length !== required) return setError(t(`Entrez exactement ${required} email${required > 1 ? 's' : ''} pour vos amis.`, `أدخل ${required} بريداً إلكترونياً بالضبط لأصدقائك.`));
      const bad = emailList.find((e) => !EMAIL_RE.test(e));
      if (bad) return setError(t(`Email invalide : ${bad}`, `بريد غير صالح: ${bad}`));
      if (new Set(emailList.map((e) => e.toLowerCase())).size !== emailList.length) return setError(t('Certains emails sont en double.', 'بعض الإيميلات مكررة.'));
      if (user?.email && emailList.some((e) => e.toLowerCase() === user.email.toLowerCase())) return setError(t('Votre propre email ne doit pas figurer dans la liste.', 'بريدك لا يجب أن يظهر في القائمة.'));
    }
    if (!operator) return setError(t('Choisissez un opérateur de paiement.', 'اختر مشغل الدفع.'));
    if (!receipt) return setError(t('Ajoutez la capture de votre reçu.', 'أضف صورة الإيصال.'));

    setSending(true);
    try {
      const fd = new FormData();
      fd.append('amount', String(amount));
      fd.append('paymentMethod', 'MOBILE_MONEY');
      fd.append('operator', operator);
      fd.append('planType', plan);
      fd.append('durationDays', plan === 'CONCOURS' ? '365' : '30');
      if (plan === 'GROUP') {
        fd.append('groupSize', String(groupSize));
        fd.append('groupEmails', JSON.stringify(emailList));
      }
      fd.append('receipt', receipt);
      await paymentsApi.submit(fd);
      setSent(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setError(e?.response?.data?.message || t("Erreur lors de l'envoi.", 'حدث خطأ أثناء الإرسال.'));
    } finally {
      setSending(false);
    }
  }

  if (user?.role === 'PREMIUM') {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <Crown className="w-12 h-12 text-amber-500 mx-auto" />
        <h1 className="text-2xl font-extrabold mt-4">{t('Vous êtes déjà Premium', 'أنت مشترك في Premium')}</h1>
        <Link href="/practice" className="inline-block mt-6 text-primary font-semibold hover:underline">{t("S'entraîner", 'ابدأ التدرب')}</Link>
      </div>
    );
  }

  const waLink = waPhone ? `https://wa.me/${waPhone.replace(/\D/g, '')}` : null;

  if (sent || pending) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/15">
          {sent ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <Clock className="w-8 h-8 text-amber-500" />}
        </div>
        <h1 className="text-2xl font-extrabold mt-5">
          {sent ? t('Reçu envoyé !', 'تم إرسال الإيصال!') : t('Votre paiement est en cours de validation', 'دفعك قيد التحقق')}
        </h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          {t('Notre équipe vérifie votre paiement, en général en moins d’une heure. Votre accès Premium sera activé automatiquement. En attendant, vous pouvez continuer votre essai.',
            'يتحقق فريقنا من دفعك، عادةً في أقل من ساعة. سيتم تفعيل Premium تلقائياً. في الأثناء، يمكنك مواصلة تجربتك.')}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
              <MessageCircle className="w-4 h-4" /> {t('Accélérer sur WhatsApp', 'تسريع عبر واتساب')}
            </a>
          )}
          <Link href="/practice" className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-secondary transition">
            {t("Continuer l'essai", 'متابعة التجربة')}
          </Link>
        </div>
      </div>
    );
  }

  const stepTitle = (n: number, label: string) => (
    <h2 className="flex items-center gap-2.5 font-bold">
      <span className="w-7 h-7 rounded-full text-white text-sm font-black flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>{n}</span>
      {label}
    </h2>
  );
  const card = 'bg-card border border-border rounded-2xl p-5 sm:p-6';

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('Retour', 'رجوع')}
      </Link>

      {/* En-tête */}
      <div className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#6366f1 60%,#3b82f6 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm font-semibold text-white/80"><Crown className="w-4 h-4" /> Premium</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">{t('Débloquez toute la banque de questions', 'افتح بنك الأسئلة كاملاً')}</h1>
          <ul className="mt-4 grid sm:grid-cols-3 gap-2 text-sm text-white/90">
            {[t('Tous les thèmes et sous-thèmes', 'كل المواضيع والمواضيع الفرعية'), t('Plus de 1 000 questions', 'أكثر من 1000 سؤال'), t('Le mode examen sans limite', 'وضع الامتحان بدون حدود')].map((p) => (
              <li key={p} className="flex items-center gap-2"><Check className="w-4 h-4 flex-shrink-0" /> {p}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 1. Formule */}
      <section className={card}>
        {stepTitle(1, t('Choisissez votre formule', 'اختر الصيغة'))}

        {/* Promotion en cours : même bandeau que l'inscription */}
        {promoActive && (
          <div className={`relative overflow-hidden rounded-2xl mt-4 p-5 text-center text-white ${bio ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 via-orange-500 to-red-600'}`}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
            <div className="relative">
              <div className="inline-block bg-white rounded-2xl px-5 py-2 shadow-lg">
                {prices.upTo && <p className={`text-[11px] font-bold uppercase ${bio ? 'text-emerald-600' : 'text-red-600'}`}>{t("jusqu'à", 'حتى')}</p>}
                <p className={`font-black text-4xl leading-none ${bio ? 'text-emerald-600' : 'text-red-600'}`}>-{prices.maxPct}%</p>
              </div>
              <p className="font-extrabold text-sm mt-3">🎉 {t('Offre spéciale limitée', 'عرض خاص محدود')}</p>
              {promoOnGroup && <p className="text-xs text-white/90 mt-1">{t('Valable aussi sur le Pack Amis', 'صالح أيضاً على باك الأصدقاء')}</p>}
              {promoEnd && (
                <div className="mt-3 bg-white/20 border-2 border-white/40 rounded-xl px-4 py-2.5 inline-block">
                  <p className="text-white/80 text-[10px] uppercase tracking-widest font-bold">⏰ {t('Expire le', 'ينتهي في')}</p>
                  <p className="font-black text-lg sm:text-xl leading-tight">
                    {new Date(promoEnd).toLocaleDateString(isAr ? 'ar-EG' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <button type="button" onClick={() => setPlan('SOLO_1M')}
            className={`relative text-start rounded-2xl border-2 p-5 transition ${plan === 'SOLO_1M' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
            <p className="font-bold">Solo</p>
            <p className="text-xs text-muted-foreground mt-1">{t('Accès Premium pour vous', 'وصول Premium لك')}</p>
            <p className="mt-4">
              {promoActive && <span className="text-sm text-muted-foreground line-through me-2">{fmt(pricing.solo)}</span>}
              <span className="text-3xl font-black tabular-nums">{fmt(soloPrice)}</span> <span className="text-sm font-semibold">MRU</span>
            </p>
            {promoActive && prices.soloPct > 0 && <span className="inline-block mt-1 text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">-{prices.soloPct}%</span>}
            {plan === 'SOLO_1M' && <span className="absolute top-4 end-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" /></span>}
          </button>

          {/* Pack spécial jusqu'au concours (recommandé) */}
          <button type="button" onClick={() => setPlan('CONCOURS')}
            className={`relative text-start rounded-2xl border-2 p-5 transition ${plan === 'CONCOURS' ? 'border-amber-500 bg-amber-50' : 'border-amber-300 hover:border-amber-400'}`}>
            <span className="absolute -top-2.5 start-4 text-[11px] font-bold bg-amber-400 text-gray-900 px-2 py-0.5 rounded-full">⭐ {t('Recommandé', 'موصى به')}</span>
            <p className="font-bold">{t('Pack spécial', 'باك خاص')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("Jusqu'au concours · 1 an minimum", 'حتى المسابقة · سنة على الأقل')}</p>
            <p className="mt-4">
              <span className="text-sm text-muted-foreground line-through me-2">{fmt(1500)}</span>
              <span className="text-3xl font-black tabular-nums">{fmt(concoursPrice)}</span> <span className="text-sm font-semibold">MRU</span>
            </p>
            {plan === 'CONCOURS' && <span className="absolute top-4 end-4 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></span>}
          </button>

          <div role="button" tabIndex={0} onClick={() => setPlan('GROUP')} onKeyDown={(e) => e.key === 'Enter' && setPlan('GROUP')}
            className={`relative text-start rounded-2xl border-2 p-5 transition cursor-pointer ${plan === 'GROUP' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
            <p className="font-bold flex items-center gap-1.5"><Users className="w-4 h-4" /> {t('Pack Amis', 'باك الأصدقاء')}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">🎁 {t('Payez pour 2, venez à 3 !', 'ادفع لـ 2، وتعالوا 3!')}</p>
            <p className="mt-4">
              {promoOnGroup && <span className="text-sm text-muted-foreground line-through me-2">{fmt(groupBase)}</span>}
              <span className="text-3xl font-black tabular-nums">{fmt(groupPrice)}</span> <span className="text-sm font-semibold">MRU</span>
            </p>
            {promoOnGroup && prices.groupPct > 0 && <span className="inline-block mt-1 text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">-{prices.groupPct}%</span>}
            <p className="text-xs text-muted-foreground mt-1">{t(`soit ${fmt(Math.round(groupPrice / groupSize))} MRU par personne`, `أي ${fmt(Math.round(groupPrice / groupSize))} أوقية للشخص`)}</p>
            {plan === 'GROUP' && (
              <div className="flex items-center gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-semibold text-muted-foreground">{t('Personnes', 'الأشخاص')}</span>
                <button type="button" aria-label="-" onClick={() => setGroupSize(Math.max(pricing.groupMin, groupSize - 1))}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-6 text-center font-bold tabular-nums">{groupSize}</span>
                <button type="button" aria-label="+" onClick={() => setGroupSize(groupSize + 1)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary"><Plus className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {plan === 'GROUP' && <span className="absolute top-4 end-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" /></span>}
          </div>
        </div>

        {plan === 'GROUP' && (
          <label className="block mt-5">
            <span className="block text-sm font-semibold mb-1.5">
              {t(`Emails de vos ${groupSize - 1} amis`, `إيميلات أصدقائك (${groupSize - 1})`)}
            </span>
            <textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={Math.max(2, groupSize - 1)} dir="ltr"
              placeholder={'ami1@email.com\nami2@email.com'}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            <span className="block text-xs text-muted-foreground mt-1.5">
              {t('Un email par ligne. Vos amis seront Premium dès leur inscription avec cet email.', 'بريد واحد في كل سطر. سيصبح أصدقاؤك Premium عند تسجيلهم بهذا البريد.')}
            </span>
          </label>
        )}
      </section>

      {/* 2. Paiement */}
      <section className={card}>
        {stepTitle(2, t(`Envoyez ${fmt(amount)} MRU`, `أرسل ${fmt(amount)} أوقية`))}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {OPERATORS.map((op) => (
            <button key={op.id} type="button" onClick={() => setOperator(op.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${operator === op.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <img src={op.image} alt={op.name} className="h-9 w-auto object-contain" />
              <span className="text-xs font-bold">{op.name}</span>
            </button>
          ))}
        </div>
        {operator && (phones[operator] ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
            <div>
              <p className="text-xs text-muted-foreground">{t(`Numéro ${OPERATORS.find((o) => o.id === operator)?.name} à créditer`, 'الرقم المستلم')}</p>
              <p className="text-2xl font-black tracking-wider tabular-nums" dir="ltr">{localPhone(phones[operator])}</p>
              <p className="text-xs font-semibold text-amber-600 mt-1">{t(`Montant exact : ${fmt(amount)} MRU`, `المبلغ بالضبط: ${fmt(amount)} أوقية`)}</p>
            </div>
            <button type="button"
              onClick={() => { navigator.clipboard?.writeText(localPhone(phones[operator])); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition flex-shrink-0">
              {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('Copié', 'تم النسخ') : t('Copier', 'نسخ')}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-600">{t('Numéro non configuré pour cet opérateur, contactez le support.', 'رقم هذا المشغل غير مضبوط، تواصل مع الدعم.')}</p>
        ))}
      </section>

      {/* 3. Reçu */}
      <section className={card}>
        {stepTitle(3, t('Ajoutez la capture de votre reçu', 'أضف صورة الإيصال'))}
        <div className="mt-4">
          {receipt ? (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-500/5 px-5 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{receipt.name}</span>
              <button type="button" onClick={() => setReceipt(null)} aria-label={t('Retirer', 'إزالة')} className="text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-8 hover:border-primary/50 hover:bg-secondary/40 transition">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm font-semibold">{t('Choisir une image ou un PDF', 'اختر صورة أو ملف PDF')}</span>
              <span className="text-xs text-muted-foreground">{t('5 Mo maximum', 'الحد الأقصى 5 ميغابايت')}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 5 * 1024 * 1024) return setError(t('Le fichier ne doit pas dépasser 5 Mo.', 'يجب ألا يتجاوز الملف 5 ميغابايت.'));
              setError(''); setReceipt(f);
            }} />
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">{error}</p>}

      <button onClick={submit} disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-white hover:opacity-90 transition disabled:opacity-60 shadow-lg shadow-amber-500/20"
        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
        {t(`Envoyer mon reçu · ${fmt(amount)} MRU`, `إرسال الإيصال · ${fmt(amount)} أوقية`)}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        {t('Activation après vérification du paiement par notre équipe, en général en moins d’une heure.', 'التفعيل بعد تحقق فريقنا من الدفع، عادةً في أقل من ساعة.')}
      </p>
    </div>
  );
}

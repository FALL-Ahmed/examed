'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useLang } from '@/components/LanguageProvider';
import { LanguageSwitcherLight } from '@/components/LanguageSwitcher';
import { paymentsApi, settingsApi } from '@/lib/api';
import { BookOpen, Upload, X, Loader2, CheckCircle, Phone } from 'lucide-react';

const OPERATORS = [
  { id: 'BANKILY', name: 'Bankily', image: '/images/bankily.png', key: 'BANKILY_PHONE' },
  { id: 'MASRIVI', name: 'Masrivi', image: '/images/masrivi.png', key: 'MASRIVI_PHONE' },
  { id: 'SEDAD',   name: 'Sedad',   image: '/images/sedad.png',   key: 'SEDAD_PHONE'   },
];

export default function PendingPage() {
  const router = useRouter();
  const { user, loadUser, logout } = useAuthStore();
  const { lang } = useLang();
  const isAr = lang === 'ar';

  const [operators, setOperators] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState({ p1m: '500', p3m: '1200' });
  const [selectedPlan, setSelectedPlan] = useState<'SOLO_1M' | 'SOLO_3M'>('SOLO_1M');
  const [selectedOp, setSelectedOp] = useState('BANKILY');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadUser().then(() => {
      const u = useAuthStore.getState().user;
      if (!u) router.push('/login');
      else if (u.role === 'PREMIUM') router.push('/dashboard');
      else if (u.role === 'ADMIN') router.push('/admin');
    });
    settingsApi.operators().then((r) => {
      const map: Record<string, string> = {};
      r.data.forEach((op: any) => { map[op.id] = op.phone; });
      setOperators(map);
    }).catch(() => {});
    settingsApi.pricing().then((r) => {
      setPrices({ p1m: r.data.PRICE_1M ?? '500', p3m: r.data.PRICE_3M ?? '1200' });
    }).catch(() => {});
  }, []);

  async function submit() {
    if (!receipt) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('amount', selectedPlan === 'SOLO_1M' ? prices.p1m : prices.p3m);
      fd.append('paymentMethod', 'MOBILE_MONEY');
      fd.append('operator', selectedOp);
      fd.append('planType', selectedPlan);
      fd.append('durationDays', selectedPlan === 'SOLO_1M' ? '30' : '90');
      fd.append('receipt', receipt);
      await paymentsApi.submit(fd);
      setDone(true);
    } catch { /* erreur */ }
    setLoading(false);
  }

  const price = selectedPlan === 'SOLO_1M' ? prices.p1m : prices.p3m;
  const opPhone = operators[selectedOp] ?? '';

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl border border-border p-10 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">{isAr ? 'تم إرسال الطلب!' : 'Demande envoyée !'}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {isAr ? 'سيتم مراجعة طلبك وتفعيل حسابك في أقرب وقت.' : 'Votre paiement est en cours de vérification. Votre compte sera activé sous peu.'}
        </p>
        <button onClick={() => { logout(); router.push('/login'); }}
          className="text-sm text-muted-foreground hover:text-foreground underline">
          {isAr ? 'تسجيل الخروج' : 'Se déconnecter'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">Al Bourour</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcherLight />
          <button onClick={() => { logout(); router.push('/login'); }}
            className="text-xs text-muted-foreground hover:text-foreground underline">
            {isAr ? 'خروج' : 'Déconnexion'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-md space-y-5 pt-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{isAr ? 'فعّل حسابك' : 'Activez votre compte'}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isAr ? 'اختر خطة وارسل إيصال الدفع للتفعيل' : 'Choisissez un plan et envoyez votre reçu pour activer votre accès'}
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'SOLO_1M', label: isAr ? '1 شهر' : '1 mois', price: prices.p1m, days: 30 },
              { id: 'SOLO_3M', label: isAr ? '3 أشهر ⭐' : '3 mois ⭐', price: prices.p3m, days: 90 },
            ].map((plan) => (
              <button key={plan.id} onClick={() => setSelectedPlan(plan.id as any)}
                className={`rounded-2xl p-4 border-2 text-left transition ${selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'border-border bg-white'}`}>
                <p className="font-bold text-lg">{plan.price} MRU</p>
                <p className="text-sm text-muted-foreground">{plan.label}</p>
              </button>
            ))}
          </div>

          {/* Operators */}
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <p className="text-sm font-semibold">{isAr ? 'اختر المشغل' : 'Choisissez l\'opérateur'}</p>
            <div className="grid grid-cols-3 gap-2">
              {OPERATORS.map((op) => (
                <button key={op.id} onClick={() => setSelectedOp(op.id)}
                  className={`rounded-xl p-2 border-2 flex flex-col items-center gap-1 transition ${selectedOp === op.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <img src={op.image} alt={op.name} className="w-8 h-8 object-contain" />
                  <span className="text-xs font-medium">{op.name}</span>
                </button>
              ))}
            </div>
            {opPhone && (
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{isAr ? 'أرسل' : 'Envoyez'} <strong>{price} MRU</strong> {isAr ? 'إلى' : 'au'}</p>
                  <p className="font-bold text-sm">{opPhone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Receipt upload */}
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold mb-3">{isAr ? 'رفع الإيصال' : 'Uploader le reçu'}</p>
            {receipt ? (
              <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
                <Upload className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm font-medium flex-1 truncate">{receipt.name}</p>
                <button onClick={() => setReceipt(null)}><X className="w-4 h-4 text-muted-foreground hover:text-red-500" /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl py-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{isAr ? 'انقر لرفع الإيصال' : 'Cliquez pour uploader le reçu'}</p>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          <button onClick={submit} disabled={!receipt || loading}
            className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAr ? 'إرسال الطلب' : 'Envoyer la demande'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { paymentsApi, settingsApi } from '@/lib/api';
import {
  Crown,
  BookOpen,
  Zap,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  Clock,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  Upload,
  ChevronDown,
  Copy,
  CheckCheck,
} from 'lucide-react';

const OPERATOR_BASE = [
  { id: 'BANKILY', name: 'Bankily', image: '/images/bankily.png' },
  { id: 'MASRIVI', name: 'Masrivi', image: '/images/masrivi.png' },
  { id: 'SEDAD',   name: 'Sedad',   image: '/images/sedad.png'   },
];

const FEATURES: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: 'Questions par jour',       free: '3 / jour',   premium: 'Illimité'   },
  { label: 'Mode série chronométré',   free: false,        premium: true         },
  { label: 'Révision des erreurs',     free: false,        premium: true         },
  { label: 'Statistiques avancées',    free: false,        premium: true         },
  { label: 'Support prioritaire',      free: false,        premium: true         },
  { label: 'Accès hors ligne',         free: false,        premium: true         },
];

const STATUS = {
  PENDING:  { label: 'En attente', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock        },
  APPROVED: { label: 'Approuvé',   color: 'text-green-600',  bg: 'bg-green-100',  icon: CheckCircle  },
  REJECTED: { label: 'Rejeté',     color: 'text-red-600',    bg: 'bg-red-100',    icon: AlertCircle  },
};

const FAQ = [
  { q: "Combien de temps prend l'activation ?",          a: "Votre compte Premium sera activé sous 24 heures après validation de votre paiement." },
  { q: "Que faire si mon paiement n'est pas validé ?",   a: "Vérifiez que votre reçu est lisible et contient tous les détails nécessaires. Contactez-nous si le problème persiste." },
  { q: "Quel opérateur puis-je utiliser ?",              a: "Vous pouvez utiliser Bankily, Masrivi ou Sedad selon votre opérateur mobile." },
  { q: "Le paiement est-il sécurisé ?",                  a: "Oui, toutes les transactions sont sécurisées et vos données sont protégées." },
  { q: "Puis-je annuler mon abonnement ?",               a: "Vous pouvez annuler à tout moment depuis votre profil. L'accès reste actif jusqu'à la fin de la période payée." },
];

// ─── FAQ accordion ────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-4 text-left flex items-center justify-between hover:bg-secondary/50 transition px-2 rounded-lg"
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transform transition-transform duration-200 flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-4 px-2">
          <p className="text-muted-foreground text-sm">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Payment modal ─────────────────────────────────────────────────────────────

type Operator = { id: string; name: string; image: string; phone: string };

function PaymentModal({
  operator,
  price,
  onClose,
  onSuccess,
}: {
  operator: Operator;
  price: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [receiptFile, setReceiptFile]     = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [notes, setNotes]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [error, setError]                 = useState('');
  const [copied, setCopied]               = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  function copyPhone() {
    navigator.clipboard?.writeText(operator.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 5 MB'); return; }
    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptFile) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('amount', price.toString());
      fd.append('paymentMethod', 'MOBILE_MONEY');
      fd.append('operator', operator.id);
      fd.append('receipt', receiptFile);
      if (notes.trim()) fd.append('notes', notes.trim());
      await paymentsApi.submit(fd);
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-6 py-4 z-10">
          <div className="flex items-center gap-3">
            <img
              src={operator.image}
              alt={operator.name}
              className="w-9 h-9 rounded-xl object-contain bg-white border border-border p-1"
            />
            <div>
              <h3 className="font-bold leading-tight">Payer via {operator.name}</h3>
              <p className="text-xs text-muted-foreground">Mobile Money · {price} MRU</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Phone number */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Numéro à créditer</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl font-black tracking-widest text-primary">{operator.phone}</span>
              <button
                type="button"
                onClick={copyPhone}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg text-sm font-semibold text-primary transition"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
              <span className="text-xs font-bold text-amber-600">Montant exact : {price} MRU</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Reçu soumis avec succès ! Validation sous 24h.
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Reçu de paiement <span className="text-red-500">*</span>
              </label>
              <div
                className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                {receiptPreview ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <img src={receiptPreview} alt="Reçu" className="max-w-full h-28 object-contain mx-auto rounded-lg" />
                    <button
                      type="button"
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : receiptFile ? (
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-medium text-emerald-600 truncate">{receiptFile.name}</p>
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-secondary flex items-center justify-center">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Cliquez pour ajouter votre reçu</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, PDF — max 5 MB</p>
                  </div>
                )}
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Notes <span className="text-xs text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations supplémentaires..."
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !receiptFile}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Soumission en cours…</>
              ) : (
                <><CheckCircle className="w-4 h-4" />Soumettre le reçu</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const PROMO_END = new Date('2026-04-27T23:59:59');
const isPromoActive = () => new Date() <= PROMO_END;

export default function PaymentPage() {
  const { user }                            = useAuthStore();
  const [price, setPrice]                   = useState(500);
  const [operators, setOperators]           = useState<Operator[]>(OPERATOR_BASE.map((o) => ({ ...o, phone: '' })));
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [history, setHistory]               = useState<any[]>([]);

  const promoActive = isPromoActive();
  const finalPrice  = promoActive ? Math.round(price / 2) : price;

  useEffect(() => {
    settingsApi.price().then((r) => setPrice(r.data.price)).catch(() => {});
    settingsApi.operators().then((r) => setOperators(r.data)).catch(() => {});
    paymentsApi.myPayments().then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  function refreshHistory() {
    paymentsApi.myPayments().then((r) => setHistory(r.data)).catch(() => {});
  }

  // ── Premium already active ──
  if (user?.role === 'PREMIUM') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-white"
          style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,white 1px,transparent 0)', backgroundSize: '24px 24px' }}
          />
          <div className="relative flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold text-white tracking-wider">ACTIF</span>
              </div>
              <h2 className="text-2xl font-extrabold">Compte Premium</h2>
              {user.subscriptionEnd && (
                <p className="text-white/70 text-sm mt-0.5">
                  Valide jusqu'au{' '}
                  <strong className="text-white">
                    {new Date(user.subscriptionEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </strong>
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {[
            { icon: BookOpen, label: 'Questions illimitées chaque jour' },
            { icon: Zap,      label: 'Mode série chronométré'           },
            { icon: RefreshCw,label: 'Révision ciblée des erreurs'      },
            { icon: TrendingUp,label: 'Statistiques avancées par thème' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-sm font-medium flex-1">{label}</span>
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Non-premium ──
  return (
    <div className="max-w-3xl mx-auto space-y-14">

      {/* Promo banner */}
      {promoActive && (
        <div className="relative overflow-hidden rounded-2xl px-6 py-4 text-white text-center"
          style={{ background: 'linear-gradient(135deg,#dc2626,#f97316)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,white 1px,transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <p className="text-lg font-extrabold tracking-tight">🎉 -50% de réduction — Offre de lancement !</p>
            <p className="text-sm text-white/80 mt-0.5">Valable jusqu'au <strong className="text-white">lundi 27 avril 2026</strong> · Ne manquez pas cette opportunité</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-primary">Accès illimité</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Passez au niveau supérieur</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Tout ce qu'il vous faut pour préparer et réussir votre concours infirmier.
        </p>
      </div>

      {/* ── Pricing comparison ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_120px_140px]">
          <div className="px-6 py-5 border-b border-border" />

          {/* Free header */}
          <div className="px-4 py-5 border-b border-l border-border text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Gratuit</p>
            <p className="text-xl font-black">0</p>
            <p className="text-xs text-muted-foreground">MRU / mois</p>
          </div>

          {/* Premium header */}
          <div
            className="px-4 py-5 border-b border-l border-border text-center relative"
            style={{ background: 'linear-gradient(145deg,#0f0c29 0%,#302b63 55%,#24243e 100%)' }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-md">
                Recommandé
              </span>
            </div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Premium</p>
            {promoActive && (
              <p className="text-sm text-white/40 line-through">{price} MRU</p>
            )}
            <p className="text-xl font-black text-white">{finalPrice}</p>
            <p className="text-xs text-white/40">MRU / mois</p>
            {promoActive && (
              <span className="inline-block mt-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-50%</span>
            )}
          </div>
        </div>

        {/* Feature rows */}
        {FEATURES.map((f, idx) => (
          <div
            key={f.label}
            className={`grid grid-cols-[1fr_120px_140px] ${idx < FEATURES.length - 1 ? 'border-b border-border' : ''}`}
          >
            {/* Label */}
            <div className="px-6 py-4 flex items-center">
              <span className="text-sm font-medium">{f.label}</span>
            </div>

            {/* Free value */}
            <div className="px-4 py-4 border-l border-border flex items-center justify-center">
              {typeof f.free === 'boolean' ? (
                f.free
                  ? <Check className="w-4 h-4 text-emerald-500" />
                  : <X className="w-4 h-4 text-muted-foreground/40" />
              ) : (
                <span className="text-sm text-muted-foreground font-medium">{f.free}</span>
              )}
            </div>

            {/* Premium value */}
            <div
              className="px-4 py-4 border-l border-border flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg,#0f0c2915 0%,#302b6315 55%,#24243e15 100%)' }}
            >
              {typeof f.premium === 'boolean' ? (
                f.premium
                  ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )
                  : <X className="w-4 h-4 text-muted-foreground/40" />
              ) : (
                <span className="text-sm font-bold text-primary">{f.premium}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Operator selection ── */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold">Choisissez votre opérateur</h2>
          <p className="text-sm text-muted-foreground mt-1">Sélectionnez pour voir les instructions et soumettre votre reçu</p>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {operators.map((op) => (
            <button
              key={op.id}
              onClick={() => setSelectedOperator(op)}
              className="group flex flex-col items-center gap-4 p-6 rounded-2xl border border-border hover:border-primary bg-card hover:bg-primary/5 transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5"
            >
              <img
                src={op.image}
                alt={op.name}
                className="w-20 h-20 rounded-2xl object-contain bg-white border border-border p-2 group-hover:border-primary/30 transition"
              />
              <div className="text-center">
                <p className="font-bold text-sm">{op.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mobile Money</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Payment history ── */}
      {history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Historique des paiements</h3>
          <div className="space-y-3">
            {history.map((p: any) => {
              const s = STATUS[p.status as keyof typeof STATUS] || STATUS.PENDING;
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Mobile Money — {p.operator ?? ''}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{p.amount} MRU</p>
                    <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      <div>
        <h2 className="text-lg font-bold text-center mb-6">Questions fréquentes</h2>
        <div className="bg-card border border-border rounded-2xl px-6">
          {FAQ.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </div>

      {/* ── Modal ── */}
      {selectedOperator && (
        <PaymentModal
          operator={selectedOperator}
          price={finalPrice}
          onClose={() => setSelectedOperator(null)}
          onSuccess={refreshHistory}
        />
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { adminApi, settingsApi } from '@/lib/api';
import { Users, FileText, CreditCard, AlertCircle, Settings, Loader2, CheckCircle, Smartphone, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);

  const OPERATORS = [
    { id: 'BANKILY', name: 'Bankily', image: '/images/bankily.png' },
    { id: 'MASRIVI', name: 'Masrivi', image: '/images/masrivi.png' },
    { id: 'SEDAD',   name: 'Sedad',   image: '/images/sedad.png'   },
  ];
  const [phones, setPhones] = useState<Record<string, string>>({ BANKILY: '', MASRIVI: '', SEDAD: '' });
  const [savingPhone, setSavingPhone] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [savingWa, setSavingWa] = useState(false);
  const [savedWa, setSavedWa] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);

  useEffect(() => {
    adminApi.stats().then((r) => setStats(r.data)).catch(() => {});
    adminApi.getSettings().then((r) => {
      setSettings(r.data);
      setPriceInput(r.data.PREMIUM_PRICE ?? '500');
      setWhatsapp(r.data.WHATSAPP_PHONE ?? '');
      setSupportEmail(r.data.SUPPORT_EMAIL ?? '');
    }).catch(() => {});
    settingsApi.operators().then((r) => {
      const map: Record<string, string> = {};
      r.data.forEach((op: any) => { map[op.id] = op.phone; });
      setPhones(map);
    }).catch(() => {});
  }, []);

  async function savePhone(id: string) {
    setSavingPhone(id);
    try {
      await adminApi.setSetting(`${id}_PHONE`, phones[id]);
      setSavedPhone(id);
      setTimeout(() => setSavedPhone(null), 3000);
    } finally {
      setSavingPhone(null);
    }
  }

  async function saveSupportEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supportEmail.trim()) return;
    setSavingEmail(true);
    try {
      await adminApi.setSetting('SUPPORT_EMAIL', supportEmail.trim());
      setSavedEmail(true);
      setTimeout(() => setSavedEmail(false), 3000);
    } finally {
      setSavingEmail(false);
    }
  }

  async function saveWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsapp.trim()) return;
    setSavingWa(true);
    try {
      await adminApi.setSetting('WHATSAPP_PHONE', whatsapp.trim());
      setSavedWa(true);
      setTimeout(() => setSavedWa(false), 3000);
    } finally {
      setSavingWa(false);
    }
  }

  async function savePrice(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(priceInput);
    if (!val || val < 1) return;
    setSavingPrice(true);
    try {
      await adminApi.setSetting('PREMIUM_PRICE', String(val));
      setSettings((s) => ({ ...s, PREMIUM_PRICE: String(val) }));
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 3000);
    } finally {
      setSavingPrice(false);
    }
  }

  const kpis = stats ? [
    { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'bg-blue-500', href: '/admin/users' },
    { label: 'Validés', value: stats.premiumUsers, icon: CheckCircle, color: 'bg-emerald-500', href: '/admin/users' },
    { label: 'Questions', value: stats.totalQuestions, icon: FileText, color: 'bg-emerald-500', href: '/admin/questions' },
    { label: 'Paiements en attente', value: stats.pendingPayments, icon: CreditCard, color: stats.pendingPayments > 0 ? 'bg-red-500' : 'bg-slate-400', href: '/admin/payments' },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de ExaMed</p>
      </div>

      {stats?.pendingPayments > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
            {stats.pendingPayments} paiement(s) en attente de validation
          </p>
          <Link href="/admin/payments" className="ml-auto text-sm text-amber-700 dark:text-amber-400 underline font-medium">
            Voir
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition">
            <div className={`${k.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
              <k.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold">{k.value ?? '—'}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{k.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Actions rapides</h2>
          <div className="flex gap-3 flex-wrap">
            <Link href="/admin/upload" className="px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
              Importer des questions
            </Link>
            <Link href="/admin/payments" className="px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-semibold hover:bg-border transition">
              Valider paiements
            </Link>
            <Link href="/admin/questions" className="px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-semibold hover:bg-border transition">
              Gérer questions
            </Link>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">Paramètres</h2>
          </div>

          <form onSubmit={savePrice} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Prix d'inscription (MRU)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="500"
                />
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2"
                >
                  {savingPrice
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : priceSaved
                    ? <CheckCircle className="w-4 h-4" />
                    : null}
                  {priceSaved ? 'Sauvegardé' : 'Enregistrer'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ce montant s'affiche sur la page d'inscription lors du paiement.
              </p>
            </div>
          </form>

          <div className="border-t border-border pt-4 mt-4">
            <form onSubmit={saveWhatsapp}>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                Numéro WhatsApp support
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="+222 XX XX XX XX"
                />
                <button
                  type="submit"
                  disabled={savingWa}
                  className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2"
                >
                  {savingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : savedWa ? <CheckCircle className="w-4 h-4" /> : null}
                  {savedWa ? 'Sauvegardé' : 'Enregistrer'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                S'affiche sur la page d'attente et la page support utilisateur.
              </p>
            </form>
          </div>

          <div className="border-t border-border pt-4 mt-2">
            <form onSubmit={saveSupportEmail}>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                Email support
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="support@examed.mr"
                />
                <button
                  type="submit"
                  disabled={savingEmail}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2"
                >
                  {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : savedEmail ? <CheckCircle className="w-4 h-4" /> : null}
                  {savedEmail ? 'Sauvegardé' : 'Enregistrer'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Affiché aux utilisateurs dans la section support.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Operators */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Opérateurs Mobile Money</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Numéros affichés aux utilisateurs lors du paiement.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OPERATORS.map((op) => (
            <div key={op.id} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img src={op.image} alt={op.name} className="w-10 h-10 rounded-xl object-contain bg-white border border-border p-1" />
                <span className="font-semibold text-sm">{op.name}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phones[op.id] ?? ''}
                  onChange={(e) => setPhones((prev) => ({ ...prev, [op.id]: e.target.value }))}
                  placeholder="+222 XX XX XX XX"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  onClick={() => savePhone(op.id)}
                  disabled={savingPhone === op.id}
                  className="px-3 py-2 gradient-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingPhone === op.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : savedPhone === op.id
                    ? <CheckCircle className="w-3.5 h-3.5" />
                    : null}
                  {savedPhone === op.id ? 'OK' : 'Sauv.'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

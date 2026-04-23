'use client';
import { useEffect, useState } from 'react';
import { adminApi, settingsApi } from '@/lib/api';
import {
  Users, FileText, CreditCard, AlertCircle, Settings, Loader2, CheckCircle,
  Smartphone, MessageCircle, UserPlus, TrendingUp, Target, Zap,
  Star, BarChart2, ArrowUpRight, Activity, DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useLang } from '@/components/LanguageProvider';

function KpiCard({ icon: Icon, label, value, sub, color, href }: any) {
  const content = (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition h-full flex flex-col justify-between gap-3">
      <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-foreground">{value ?? '—'}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{content}</Link> : content;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [prices, setPrices] = useState({ p1m: '', p3m: '', pGroup: '', groupMin: '' });
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [savedPlan, setSavedPlan] = useState<string | null>(null);
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
  const [deviceVerif, setDeviceVerif] = useState(false);

  useEffect(() => {
    adminApi.stats().then((r) => setStats(r.data)).catch(() => {});
    adminApi.getSettings().then((r) => {
      setPriceInput(r.data.PREMIUM_PRICE ?? '500');
      setWhatsapp(r.data.WHATSAPP_PHONE ?? '');
      setSupportEmail(r.data.SUPPORT_EMAIL ?? '');
      setPrices({ p1m: r.data.PRICE_1M ?? '500', p3m: r.data.PRICE_3M ?? '1200', pGroup: r.data.PRICE_GROUP_PER_PERSON ?? '400', groupMin: r.data.GROUP_MIN_MEMBERS ?? '5' });
      setDeviceVerif(r.data.DEVICE_VERIFICATION === 'true');
    }).catch(() => {});
    settingsApi.operators().then((r) => {
      const map: Record<string, string> = {};
      r.data.forEach((op: any) => { map[op.id] = op.phone; });
      setPhones(map);
    }).catch(() => {});
  }, []);

  async function savePhone(id: string) {
    setSavingPhone(id);
    await adminApi.setSetting(`${id}_PHONE`, phones[id]).catch(() => {});
    setSavedPhone(id); setTimeout(() => setSavedPhone(null), 3000);
    setSavingPhone(null);
  }
  async function savePlan(key: string, value: string, id: string) {
    setSavingPlan(id);
    await adminApi.setSetting(key, value).catch(() => {});
    setSavedPlan(id); setTimeout(() => setSavedPlan(null), 2500);
    setSavingPlan(null);
  }
  async function savePrice(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(priceInput);
    if (!val || val < 1) return;
    setSavingPrice(true);
    await adminApi.setSetting('PREMIUM_PRICE', String(val)).catch(() => {});
    setPriceSaved(true); setTimeout(() => setPriceSaved(false), 3000);
    setSavingPrice(false);
  }
  async function saveWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsapp.trim()) return;
    setSavingWa(true);
    await adminApi.setSetting('WHATSAPP_PHONE', whatsapp.trim()).catch(() => {});
    setSavedWa(true); setTimeout(() => setSavedWa(false), 3000);
    setSavingWa(false);
  }
  async function saveSupportEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supportEmail.trim()) return;
    setSavingEmail(true);
    await adminApi.setSetting('SUPPORT_EMAIL', supportEmail.trim()).catch(() => {});
    setSavedEmail(true); setTimeout(() => setSavedEmail(false), 3000);
    setSavingEmail(false);
  }
  async function toggleDeviceVerif() {
    const next = !deviceVerif;
    setDeviceVerif(next);
    await adminApi.setSetting('DEVICE_VERIFICATION', String(next)).catch(() => setDeviceVerif(!next));
  }

  const { t } = useLang();
  const s = stats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.nav.dashboard')}</h1>
        <p className="text-muted-foreground text-sm">{t('admin.label')}</p>
      </div>

      {s?.pendingGroupPayments > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{s.pendingGroupPayments} demande{s.pendingGroupPayments > 1 ? 's' : ''} de groupe en attente</p>
            <p className="text-xs text-emerald-600 mt-0.5">Vérifiez les emails invités avant de valider.</p>
          </div>
          <Link href="/admin/payments" className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition">Voir</Link>
        </div>
      )}
      {s?.pendingPayments > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-400 font-medium flex-1">{s.pendingPayments} paiement{s.pendingPayments > 1 ? 's' : ''} en attente</p>
          <Link href="/admin/payments" className="text-sm text-amber-700 underline font-medium">Voir</Link>
        </div>
      )}

      {/* Utilisateurs */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Utilisateurs</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users}       label="Total utilisateurs"     value={s?.totalUsers}         color="bg-blue-500"    href="/admin/users" />
          <KpiCard icon={CheckCircle} label="Membres premium"        value={s?.premiumUsers}       color="bg-emerald-500" href="/admin/users"
            sub={s ? `${s.conversionRate}% de conversion FREE→PRO` : undefined} />
          <KpiCard icon={TrendingUp}  label="Inscrits 7 derniers j." value={s?.weekRegistrations}  color="bg-violet-500"
            sub={s ? `dont ${s.todayRegistrations} aujourd'hui` : undefined} />
          <KpiCard icon={Activity}    label="Actifs 7 derniers j."   value={s?.activeUsersWeek}   color="bg-sky-500"
            sub={s && s.totalUsers ? `${Math.round((s.activeUsersWeek / s.totalUsers) * 100)}% de la base` : undefined} />
        </div>
      </section>

      {/* Revenus */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Revenus</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign}   label="Revenus totaux"       value={s ? `${s.revenueTotal.toLocaleString()} MRU` : '—'} color="bg-emerald-600" />
          <KpiCard icon={ArrowUpRight} label="Revenus ce mois"      value={s ? `${s.revenueMonth.toLocaleString()} MRU` : '—'} color="bg-teal-500" />
          <KpiCard icon={Target}       label="Taux de conversion"   value={s ? `${s.conversionRate}%` : '—'} color="bg-orange-500" sub="FREE → PREMIUM" />
          <KpiCard icon={CreditCard}   label="Paiements en attente" value={s?.pendingPayments}
            color={s?.pendingPayments > 0 ? 'bg-red-500' : 'bg-slate-400'} href="/admin/payments" />
        </div>
      </section>

      {/* Pédagogie */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Activité pédagogique</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FileText}  label="Questions (base)"    value={s?.totalQuestions}                  color="bg-indigo-500" href="/admin/questions" />
          <KpiCard icon={Zap}       label="Tentatives totales"  value={s?.totalAttempts?.toLocaleString()} color="bg-purple-500"
            sub={s ? `${s.completionRate}% complétées` : undefined} />
          <KpiCard icon={BarChart2} label="Réponses données"    value={s?.totalAnswers?.toLocaleString()}  color="bg-pink-500"
            sub={s ? `${s.accuracyRate}% correctes` : undefined} />
          <KpiCard icon={Star}      label="Score moyen global"  value={s ? `${s.avgScore}%` : '—'}        color="bg-amber-500" sub="Sessions terminées" />
        </div>
      </section>

      {/* Paramètres */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><Settings className="w-4 h-4 text-muted-foreground" /><h2 className="font-semibold">Paramètres</h2></div>
        <form onSubmit={savePrice}>
          <label className="block text-sm font-semibold mb-2">Prix d'inscription (MRU)</label>
          <div className="flex gap-2">
            <input type="number" min={1} value={priceInput} onChange={(e) => setPriceInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="500" />
            <button type="submit" disabled={savingPrice} className="px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2">
              {savingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : priceSaved ? <CheckCircle className="w-4 h-4" /> : null}
              {priceSaved ? 'Sauvegardé' : 'Enregistrer'}
            </button>
          </div>
        </form>
        <div className="border-t border-border pt-4 mt-4">
          <form onSubmit={saveWhatsapp}>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp support</label>
            <div className="flex gap-2">
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+222 XX XX XX XX"
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="submit" disabled={savingWa} className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2">
                {savingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : savedWa ? <CheckCircle className="w-4 h-4" /> : null}
                {savedWa ? 'OK' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
        <div className="border-t border-border pt-4 mt-2">
          <form onSubmit={saveSupportEmail}>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-blue-500" /> Email support</label>
            <div className="flex gap-2">
              <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@bourour.mr"
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="submit" disabled={savingEmail} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2">
                {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : savedEmail ? <CheckCircle className="w-4 h-4" /> : null}
                {savedEmail ? 'OK' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
        <div className="border-t border-border pt-4 mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-primary" /> Vérification d'appareil</p>
            <p className="text-xs text-muted-foreground mt-0.5">Code email requis sur nouvel appareil.</p>
          </div>
          <button type="button" onClick={toggleDeviceVerif} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${deviceVerif ? 'bg-primary' : 'bg-border'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${deviceVerif ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Tarifs */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><Settings className="w-4 h-4 text-muted-foreground" /><h2 className="font-semibold">Tarifs</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: 'p1m', key: 'PRICE_1M', label: 'Solo — 1 mois (MRU)', field: 'p1m' },
            { id: 'p3m', key: 'PRICE_3M', label: 'Solo — 3 mois (MRU) ⭐', field: 'p3m' },
            { id: 'pGroup', key: 'PRICE_GROUP_PER_PERSON', label: 'Groupe — prix/personne (MRU)', field: 'pGroup' },
            { id: 'groupMin', key: 'GROUP_MIN_MEMBERS', label: 'Groupe — membres minimum', field: 'groupMin' },
          ].map((plan) => (
            <div key={plan.id} className="border border-border rounded-xl p-4 space-y-2">
              <label className="text-sm font-semibold">{plan.label}</label>
              <div className="flex gap-2">
                <input type="number" min={1} value={prices[plan.field as keyof typeof prices]}
                  onChange={(e) => setPrices((p) => ({ ...p, [plan.field]: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={() => savePlan(plan.key, prices[plan.field as keyof typeof prices], plan.id)} disabled={savingPlan === plan.id}
                  className="px-3 py-2 gradient-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center gap-1.5">
                  {savingPlan === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPlan === plan.id ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                  {savedPlan === plan.id ? 'OK' : 'Sauv.'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opérateurs */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><Smartphone className="w-4 h-4 text-muted-foreground" /><h2 className="font-semibold">Opérateurs Mobile Money</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OPERATORS.map((op) => (
            <div key={op.id} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img src={op.image} alt={op.name} className="w-10 h-10 rounded-xl object-contain bg-white border border-border p-1" />
                <span className="font-semibold text-sm">{op.name}</span>
              </div>
              <div className="flex gap-2">
                <input type="text" value={phones[op.id] ?? ''} onChange={(e) => setPhones((prev) => ({ ...prev, [op.id]: e.target.value }))} placeholder="+222 XX XX XX XX"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                <button onClick={() => savePhone(op.id)} disabled={savingPhone === op.id}
                  className="px-3 py-2 gradient-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center gap-1.5">
                  {savingPhone === op.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPhone === op.id ? <CheckCircle className="w-3.5 h-3.5" /> : null}
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

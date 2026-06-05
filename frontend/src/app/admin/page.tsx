'use client';
import { useEffect, useState } from 'react';
import { adminApi, settingsApi, pushApi } from '@/lib/api';
import {
  Users, FileText, CreditCard, AlertCircle, Settings, Loader2, CheckCircle,
  Smartphone, MessageCircle, UserPlus, TrendingUp, Zap,
  Star, BarChart2, ArrowUpRight, Activity, DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useLang } from '@/components/LanguageProvider';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

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
  const [regData, setRegData] = useState<any[]>([]);
  const [regDays, setRegDays] = useState(30);
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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState('30');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoIncludesGroup, setPromoIncludesGroup] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [savedPromo, setSavedPromo] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
      ).catch(() => {});
    }
    adminApi.stats().then((r) => setStats(r.data)).catch(() => {});
    adminApi.registrationsPerDay(regDays).then((r) => setRegData(r.data)).catch(() => {});
    adminApi.getSettings().then((r) => {
      setPriceInput(r.data.PREMIUM_PRICE ?? '500');
      setWhatsapp(r.data.WHATSAPP_PHONE ?? '');
      setSupportEmail(r.data.SUPPORT_EMAIL ?? '');
      setPrices({ p1m: r.data.PRICE_1M ?? '500', p3m: r.data.PRICE_3M ?? '1200', pGroup: r.data.PRICE_GROUP_PER_PERSON ?? '400', groupMin: r.data.GROUP_MIN_MEMBERS ?? '3' });
      setDeviceVerif(r.data.DEVICE_VERIFICATION === 'true');
      setPromoEnabled(r.data.PROMO_ACTIVE === 'true');
      setPromoDiscount(r.data.PROMO_DISCOUNT ?? '30');
      setPromoEndDate(r.data.PROMO_END_DATE ?? '');
      setPromoIncludesGroup(r.data.PROMO_INCLUDES_GROUP === 'true');
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
  async function togglePush() {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await pushApi.unsubscribe(sub.endpoint).catch(() => {});
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const { data } = await pushApi.vapidKey();
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: data.publicKey,
        });
        const json = sub.toJSON();
        await pushApi.subscribe({
          endpoint: sub.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        });
        setPushEnabled(true);
      }
    } catch { /* permission refusée ou erreur */ }
    setPushLoading(false);
  }

  async function toggleDeviceVerif() {
    const next = !deviceVerif;
    setDeviceVerif(next);
    await adminApi.setSetting('DEVICE_VERIFICATION', String(next)).catch(() => setDeviceVerif(!next));
  }
  async function togglePromo() {
    const next = !promoEnabled;
    setPromoEnabled(next);
    await adminApi.setSetting('PROMO_ACTIVE', String(next)).catch(() => setPromoEnabled(!next));
  }
  async function togglePromoGroup() {
    const next = !promoIncludesGroup;
    setPromoIncludesGroup(next);
    await adminApi.setSetting('PROMO_INCLUDES_GROUP', String(next)).catch(() => setPromoIncludesGroup(!next));
  }
  async function savePromoDiscount() {
    setSavingPromo(true);
    await Promise.all([
      adminApi.setSetting('PROMO_DISCOUNT', promoDiscount),
      adminApi.setSetting('PROMO_END_DATE', promoEndDate),
    ]).catch(() => {});
    setSavedPromo(true); setTimeout(() => setSavedPromo(false), 3000);
    setSavingPromo(false);
  }

  useEffect(() => {
    adminApi.registrationsPerDay(regDays).then((r) => setRegData(r.data)).catch(() => {});
  }, [regDays]);

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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard icon={Users}      label="Total utilisateurs"     value={s?.totalUsers} color="bg-blue-500" href="/admin/users" />
          <KpiCard icon={TrendingUp} label="Inscrits 7 derniers j." value={s?.weekRegistrations} color="bg-violet-500"
            sub={s ? `dont ${s.todayRegistrations} aujourd'hui` : undefined} />
          <KpiCard icon={Activity}   label="Actifs 7 derniers j."   value={s?.activeUsersWeek}  color="bg-sky-500"
            sub={s && s.totalUsers ? `${Math.round((s.activeUsersWeek / s.totalUsers) * 100)}% de la base` : undefined} />
        </div>
      </section>

      {/* Graphe inscriptions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Inscriptions par jour</p>
          <div className="flex gap-1">
            {[7, 14, 30, 90].map((d) => (
              <button key={d} onClick={() => setRegDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${regDays === d ? 'bg-violet-600 text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                {d}j
              </button>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={regData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: any, name: string) => [value, name === 'count' ? 'Inscrits/jour' : 'Cumulatif']}
                labelFormatter={(l) => `📅 ${l}`}
              />
              <Legend formatter={(v) => v === 'count' ? 'Inscrits/jour' : 'Cumulatif'} />
              <Bar yAxisId="left" dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.85} />
              <Line yAxisId="right" type="monotone" dataKey="cumul" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Revenus */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Revenus</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard icon={DollarSign}   label="Revenus totaux"       value={s ? `${Math.max(0, s.revenueTotal - 7 * 500).toLocaleString()} MRU` : '—'} color="bg-emerald-600" />
          <KpiCard icon={ArrowUpRight} label="Revenus ce mois"      value={s ? `${Math.max(0, s.revenueMonth - 7 * 500).toLocaleString()} MRU` : '—'} color="bg-teal-500" />
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
        <div className="border-t border-border pt-4 mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold flex items-center gap-1.5">🔔 Notifications paiements</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pushEnabled ? 'Activées sur cet appareil.' : 'Recevoir un push à chaque paiement en attente.'}</p>
          </div>
          <button type="button" onClick={togglePush} disabled={pushLoading}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${pushEnabled ? 'bg-primary' : 'bg-border'}`}>
            {pushLoading
              ? <Loader2 className="absolute top-1 left-2.5 w-4 h-4 animate-spin text-muted-foreground" />
              : <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />}
          </button>
        </div>
        <div className="border-t border-border pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">🏷️ Promotion Free Trial</p>
              <p className="text-xs text-muted-foreground mt-0.5">{promoEnabled ? `Promo active — ${promoDiscount}% de réduction` : 'Aucune promo affichée.'}</p>
            </div>
            <button type="button" onClick={togglePromo} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${promoEnabled ? 'bg-orange-500' : 'bg-border'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${promoEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">👥 Pack amis inclus</p>
              <p className="text-xs text-muted-foreground mt-0.5">{promoIncludesGroup ? 'Promo appliquée au pack amis' : 'Pack amis au prix normal'}</p>
            </div>
            <button type="button" onClick={togglePromoGroup} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${promoIncludesGroup ? 'bg-orange-500' : 'bg-border'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${promoIncludesGroup ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <div className="flex items-center border border-border rounded-xl overflow-hidden flex-1 bg-background">
              <input type="number" min={1} max={90} value={promoDiscount}
                onChange={(e) => setPromoDiscount(e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent text-sm focus:outline-none" placeholder="30" />
              <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary">%</span>
            </div>
            <button onClick={savePromoDiscount} disabled={savingPromo}
              className="px-4 py-2 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center gap-1.5">
              {savingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedPromo ? <CheckCircle className="w-3.5 h-3.5" /> : null}
              {savedPromo ? 'OK' : 'Sauv.'}
            </button>
          </div>
          <input type="date" value={promoEndDate} onChange={(e) => setPromoEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-muted-foreground" />
        </div>
      </div>

      {/* Tarifs */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><Settings className="w-4 h-4 text-muted-foreground" /><h2 className="font-semibold">Tarifs</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: 'p1m', key: 'PRICE_1M', label: 'Solo — jusqu\'au concours (MRU)', field: 'p1m' },
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

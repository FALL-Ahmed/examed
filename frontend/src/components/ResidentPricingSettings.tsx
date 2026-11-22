'use client';
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, Stethoscope } from 'lucide-react';
import { adminApi } from '@/lib/api';

// Tarifs et promo du Résidanat — réglages RES_* totalement indépendants des tarifs infirmier / sage-femme / biologiste.
const PRICE_FIELDS = [
  { key: 'RES_PRICE_1M',               label: 'Solo — 6 mois (MRU)',                fallback: '1000' },
  { key: 'RES_PRICE_CONCOURS',         label: "Pack spécial — jusqu'au concours (MRU)", fallback: '1000' },
  { key: 'RES_PRICE_GROUP_PER_PERSON', label: 'Groupe — prix par personne (MRU)',    fallback: '700' },
  { key: 'RES_GROUP_MIN_MEMBERS',      label: 'Groupe — membres minimum',            fallback: '3' },
];
const PROMO_FIELDS = [
  { key: 'RES_PROMO_DISCOUNT',       label: 'Réduction (%)',                         fallback: '30', type: 'number' },
  { key: 'RES_PROMO_PRICE_SOLO',     label: 'Prix promo Solo fixe (MRU, facultatif)', fallback: '',  type: 'number' },
  { key: 'RES_PROMO_PRICE_GROUP_PP', label: 'Prix promo Groupe / pers. (facultatif)', fallback: '',  type: 'number' },
  { key: 'RES_PROMO_END_DATE',       label: 'Fin de la promo',                       fallback: '',  type: 'date' },
];

export function ResidentPricingSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getSettings().then((r) => {
      const v: Record<string, string> = {};
      [...PRICE_FIELDS, ...PROMO_FIELDS].forEach((f) => { v[f.key] = r.data[f.key] ?? f.fallback; });
      v.RES_PROMO_ACTIVE = r.data.RES_PROMO_ACTIVE ?? 'false';
      v.RES_PROMO_INCLUDES_GROUP = r.data.RES_PROMO_INCLUDES_GROUP ?? 'false';
      setValues(v);
    }).catch(() => {});
  }, []);

  async function save(key: string, value: string) {
    setSaving(key);
    try {
      await adminApi.setSetting(key, value);
      setValues((p) => ({ ...p, [key]: value }));
      setSaved(key);
      setTimeout(() => setSaved((s) => (s === key ? null : s)), 2000);
    } finally {
      setSaving(null);
    }
  }

  const field = (f: { key: string; label: string; type?: string }) => (
    <div key={f.key} className="border border-border rounded-xl p-4 space-y-2">
      <label className="text-sm font-semibold">{f.label}</label>
      <div className="flex gap-2">
        <input type={f.type ?? 'number'} min={f.type === 'date' ? undefined : 0} value={values[f.key] ?? ''}
          onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
          className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
        <button onClick={() => save(f.key, values[f.key] ?? '')} disabled={saving === f.key}
          className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 flex items-center gap-1.5">
          {saving === f.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved === f.key ? <CheckCircle className="w-3.5 h-3.5" /> : null}
          {saved === f.key ? 'OK' : 'Sauv.'}
        </button>
      </div>
    </div>
  );

  const toggle = (key: string, label: string) => {
    const on = values[key] === 'true';
    return (
      <button type="button" onClick={() => save(key, on ? 'false' : 'true')} disabled={saving === key}
        className={`flex items-center justify-between gap-3 w-full border rounded-xl p-4 text-left transition ${on ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30' : 'border-border'}`}>
        <span className="text-sm font-semibold">{label}</span>
        <span className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition ${on ? 'bg-sky-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
      </button>
    );
  };

  return (
    <div className="bg-card border border-sky-200 dark:border-sky-900 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1"><Stethoscope className="w-4 h-4 text-sky-600" /><h2 className="font-semibold">Tarifs Résidanat</h2></div>
      <p className="text-xs text-muted-foreground mb-5">S'appliquent uniquement aux comptes Résident. Les tarifs infirmier, sage-femme et biologiste ne changent pas.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{PRICE_FIELDS.map(field)}</div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-6 mb-3">Promo Résidanat</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toggle('RES_PROMO_ACTIVE', 'Promo active')}
        {toggle('RES_PROMO_INCLUDES_GROUP', 'Promo valable aussi pour le groupe')}
        {PROMO_FIELDS.map(field)}
      </div>
    </div>
  );
}

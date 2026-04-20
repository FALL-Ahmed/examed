'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Users, MapPin, Briefcase } from 'lucide-react';

const PROFESSION_LABELS: Record<string, string> = {
  etudiant_infirmier: 'Étudiant infirmier',
  etudiant_medecine:  'Étudiant médecine',
  etudiant_pharmacie: 'Étudiant pharmacie',
  infirmier_diplome:  'Infirmier diplômé',
  aide_soignant:      'Aide-soignant',
  medecin:            'Médecin',
  sage_femme:         'Sage-femme',
  technicien_labo:    'Technicien labo',
  autre:              'Autre',
};

function BarChart({ data, colorClass }: { data: { label: string; count: number }[]; colorClass: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium truncate max-w-[65%]">{d.label}</span>
            <span className="font-bold text-slate-800 tabular-nums">{d.count}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ male, female, unknown }: { male: number; female: number; unknown: number }) {
  const total = male + female + unknown || 1;
  const mPct = Math.round((male / total) * 100);
  const fPct = Math.round((female / total) * 100);
  const uPct = 100 - mPct - fPct;

  const r = 40;
  const circ = 2 * Math.PI * r;
  const mDash = (male / total) * circ;
  const fDash = (female / total) * circ;
  const uDash = circ - mDash - fDash;

  let offset = 0;
  const segments = [
    { dash: mDash, color: '#6366f1', label: 'Masculin', pct: mPct, count: male },
    { dash: fDash, color: '#f472b6', label: 'Féminin', pct: fPct, count: female },
    { dash: uDash, color: '#e2e8f0', label: 'Non renseigné', pct: uPct, count: unknown },
  ];

  return (
    <div className="flex items-center gap-8">
      <svg width="110" height="110" viewBox="0 0 100 100" className="flex-shrink-0">
        {segments.map((seg, i) => {
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
              strokeDashoffset={-offset + circ / 4}
              transform="rotate(-90 50 50)"
            />
          );
          offset += seg.dash;
          return el;
        })}
        <text x="50" y="46" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e293b">{total}</text>
        <text x="50" y="58" textAnchor="middle" fontSize="7" fill="#94a3b8">total</text>
      </svg>
      <div className="space-y-2">
        {segments.filter((s) => s.count > 0).map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-bold text-slate-800 ml-auto pl-4">{s.count} <span className="text-slate-400 font-normal">({s.pct}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.analytics().then((r) => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return null;

  const genderMap: Record<string, number> = {};
  (data.byGender || []).forEach((g: any) => { genderMap[g.gender ?? 'null'] = g._count._all; });
  const male    = genderMap['masculin'] ?? 0;
  const female  = genderMap['feminin']  ?? 0;
  const unknown = (genderMap['null'] ?? 0) + (genderMap[''] ?? 0);

  const wilayas = (data.byWilaya || [])
    .filter((w: any) => w.wilaya)
    .map((w: any) => ({ label: w.wilaya, count: w._count._all }));

  const professions = (data.byProfession || [])
    .filter((p: any) => p.profession)
    .map((p: any) => ({ label: PROFESSION_LABELS[p.profession] || p.profession, count: p._count._all }));

  const roleMap: Record<string, number> = {};
  (data.byRole || []).forEach((r: any) => { roleMap[r.role] = r._count._all; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analyse des utilisateurs</h1>
        <p className="text-slate-500 text-sm mt-0.5">Répartition par sexe, wilaya et profession</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En attente', value: roleMap['FREE'] ?? 0, color: 'bg-amber-100 text-amber-700' },
          { label: 'Validés', value: roleMap['PREMIUM'] ?? 0, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Total', value: (roleMap['FREE'] ?? 0) + (roleMap['PREMIUM'] ?? 0), color: 'bg-blue-100 text-blue-700' },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className={`text-3xl font-black ${k.color.split(' ')[1]}`}>{k.value}</p>
            <p className="text-sm text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Répartition par sexe</h2>
          </div>
          <DonutChart male={male} female={female} unknown={unknown} />
        </div>

        {/* Profession */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Répartition par profession</h2>
          </div>
          {professions.length === 0
            ? <p className="text-slate-400 text-sm">Aucune donnée</p>
            : <BarChart data={professions} colorClass="bg-indigo-500" />}
        </div>

        {/* Wilaya */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Répartition par wilaya (top 10)</h2>
          </div>
          {wilayas.length === 0
            ? <p className="text-slate-400 text-sm">Aucune donnée</p>
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1">
                {wilayas.map((w: any) => {
                  const max = Math.max(...wilayas.map((x: any) => x.count), 1);
                  return (
                    <div key={w.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">{w.label}</span>
                        <span className="font-bold text-slate-800 tabular-nums">{w.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                        <div className="h-full rounded-full bg-blue-500 transition-all duration-700"
                          style={{ width: `${(w.count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

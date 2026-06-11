'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  CheckCircle, Shield, User, Search, ToggleLeft, ToggleRight,
  RotateCcw, Trash2, Users, Crown, UserCheck, X,
} from 'lucide-react';

type Tab = 'ALL' | 'SOLO_1M' | 'GROUP' | 'EXPIRING' | 'ACTIVITE';

const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'ALL',      label: 'Tous',           icon: <User className="w-4 h-4" />,    color: 'slate' },
  { id: 'SOLO_1M',  label: 'Solo — concours', icon: <UserCheck className="w-4 h-4" />, color: 'indigo' },
  { id: 'GROUP',    label: 'Groupes',         icon: <Users className="w-4 h-4" />,   color: 'emerald' },
  { id: 'EXPIRING', label: '⚠️ Expire ≤7j',  icon: null,                             color: 'amber' },
  { id: 'ACTIVITE', label: '📊 Activité',    icon: null,                             color: 'violet' },
];

const COLOR_MAP: Record<string, string> = {
  slate:   'bg-slate-100 text-slate-700 border-slate-200',
  indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  violet:  'bg-violet-100 text-violet-700 border-violet-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-100 text-amber-700 border-amber-200',
};
const ACTIVE_MAP: Record<string, string> = {
  slate:   'bg-white border-slate-300 text-slate-800 shadow-sm',
  indigo:  'bg-indigo-500 border-indigo-500 text-white shadow-sm',
  violet:  'bg-violet-500 border-violet-500 text-white shadow-sm',
  emerald: 'bg-emerald-500 border-emerald-500 text-white shadow-sm',
  amber:   'bg-amber-500 border-amber-500 text-white shadow-sm',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('ALL');
  const [data, setData] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [customDays, setCustomDays] = useState('');
  const [profFilter, setProfFilter] = useState<'infirmier' | 'sage_femme' | 'biologiste' | null>(null);

  useEffect(() => {
    if (tab === 'GROUP') { loadGroups(); }
    else if (tab === 'ACTIVITE') { loadActivity(); }
    else { load(); }
  }, [tab, page, search, profFilter]);

  async function load() {
    const params: any = { page, search };
    if (tab === 'EXPIRING') {
      params.expiringSoon = 'true';
    } else if (tab !== 'ALL') {
      params.planType = tab;
    }
    if (profFilter) params.profession = profFilter;
    const { data: d } = await adminApi.users(params);
    setData(d);
  }

  async function loadGroups() {
    const { data: d } = await adminApi.groups();
    setGroups(d);
  }

  async function loadActivity() {
    setActivityLoading(true);
    const { data: d } = await adminApi.userActivity(profFilter ?? undefined);
    setActivityData(d);
    setActivityLoading(false);
  }

  async function toggle(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setProcessing(id + '_toggle');
    await adminApi.toggleUser(id).catch(() => {});
    await load();
    setProcessing(null);
  }

  async function resetSub(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!confirm(`Remettre "${name}" en attente de renouvellement ?`)) return;
    setProcessing(id + '_reset');
    await adminApi.resetSubscription(id).catch(() => {});
    await load();
    setProcessing(null);
  }

  async function deleteUser(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!confirm(`Supprimer définitivement "${name}" ? Cette action est irréversible.`)) return;
    setProcessing(id + '_delete');
    await adminApi.deleteUser(id).catch(() => {});
    await load();
    setProcessing(null);
  }

  function switchTab(t: Tab) {
    setTab(t);
    setPage(1);
    setSearch('');
    setData(null);
    setGroups([]);
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const ids = data?.users?.map((u: any) => u.id) ?? [];
    setSelected(prev => prev.size === ids.length ? new Set() : new Set(ids));
  }

  async function bulkGrant(days: number) {
    setBulkModal(false);
    setProcessing('bulk');
    await adminApi.bulkGrantPremium([...selected], days).catch(() => {});
    setSelected(new Set());
    await load();
    setProcessing(null);
  }

  const expiringCount = tab === 'EXPIRING' ? data?.total : null;

  const roleIcon = (role: string) => {
    if (role === 'ADMIN') return <Shield className="w-4 h-4 text-blue-600" />;
    if (role === 'PREMIUM') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    return <User className="w-4 h-4 text-slate-400" />;
  };

  const roleLabel = (role: string) => {
    if (role === 'ADMIN') return { label: 'Admin', cls: 'bg-blue-100 text-blue-700' };
    if (role === 'PREMIUM') return { label: 'Premium', cls: 'bg-emerald-100 text-emerald-700' };
    return { label: 'En attente', cls: 'bg-amber-100 text-amber-700' };
  };

  const professionBadge = (profession: string | null) => {
    if (!profession) return null;
    const map: Record<string, { label: string; cls: string }> = {
      sage_femme:         { label: '👶 Sage-femme',     cls: 'bg-pink-100 text-pink-700' },
      etudiant_infirmier: { label: '🏥 Infirmier',      cls: 'bg-blue-100 text-blue-700' },
      infirmier_diplome:  { label: '🏥 Inf. diplômé',   cls: 'bg-indigo-100 text-indigo-700' },
      aide_soignant:      { label: '🩺 Aide-soignant',  cls: 'bg-cyan-100 text-cyan-700' },
      etudiant_medecine:  { label: '⚕️ Médecine',       cls: 'bg-violet-100 text-violet-700' },
      medecin:            { label: '⚕️ Médecin',        cls: 'bg-violet-100 text-violet-700' },
      etudiant_pharmacie: { label: '💊 Pharmacie',      cls: 'bg-teal-100 text-teal-700' },
      biologiste:         { label: '🔬 Biologiste',      cls: 'bg-emerald-100 text-emerald-700' },
      technicien_labo:    { label: '🔬 Labo',           cls: 'bg-orange-100 text-orange-700' },
      autre:              { label: 'Autre',              cls: 'bg-slate-100 text-slate-500' },
    };
    return map[profession] ?? { label: profession, cls: 'bg-slate-100 text-slate-500' };
  };

  return (
    <div className="space-y-6">

      {/* Barre de sélection flottante */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <span className="text-sm font-semibold">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
          <button onClick={() => { setCustomDays(''); setBulkModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold transition">
            <CheckCircle className="w-4 h-4" /> Renouveler
          </button>
          <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal renouvellement bulk */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBulkModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">Renouveler {selected.size} abonnement{selected.size > 1 ? 's' : ''}</p>
              <button onClick={() => setBulkModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[7, 15, 30, 60, 90, 180].map((d) => (
                <button key={d} onClick={() => bulkGrant(d)}
                  className="py-2.5 rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-700 font-bold text-sm hover:bg-violet-100 hover:border-violet-400 transition">
                  {d}j
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="number" min="1" placeholder="Autre (jours)"
                value={customDays} onChange={(e) => setCustomDays(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              <button onClick={() => { const d = parseInt(customDays); if (d > 0) bulkGrant(d); }}
                disabled={!customDays || parseInt(customDays) < 1}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition disabled:opacity-40">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Utilisateurs</h1>

        {/* Cards profession — cliquables pour filtrer */}
        {data && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => { setProfFilter(profFilter === 'infirmier' ? null : 'infirmier'); setPage(1); }}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 border transition cursor-pointer ${profFilter === 'infirmier' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
            >
              <span className="text-2xl">🏥</span>
              <div className="text-left">
                <p className={`text-xs font-medium ${profFilter === 'infirmier' ? 'text-blue-100' : 'text-blue-500'}`}>Infirmiers</p>
                <p className={`text-2xl font-black ${profFilter === 'infirmier' ? 'text-white' : 'text-blue-700'}`}>{data.infirmierCount ?? '—'}</p>
              </div>
            </button>
            <button
              onClick={() => { setProfFilter(profFilter === 'sage_femme' ? null : 'sage_femme'); setPage(1); }}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 border transition cursor-pointer ${profFilter === 'sage_femme' ? 'bg-pink-500 border-pink-500 text-white' : 'bg-pink-50 border-pink-200 hover:bg-pink-100'}`}
            >
              <span className="text-2xl">👶</span>
              <div className="text-left">
                <p className={`text-xs font-medium ${profFilter === 'sage_femme' ? 'text-pink-100' : 'text-pink-500'}`}>Sage-femmes</p>
                <p className={`text-2xl font-black ${profFilter === 'sage_femme' ? 'text-white' : 'text-pink-700'}`}>{data.sageFemmeCount ?? '—'}</p>
              </div>
            </button>
            <button
              onClick={() => { setProfFilter(profFilter === 'biologiste' ? null : 'biologiste'); setPage(1); }}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 border transition cursor-pointer ${profFilter === 'biologiste' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
            >
              <span className="text-2xl">🔬</span>
              <div className="text-left">
                <p className={`text-xs font-medium ${profFilter === 'biologiste' ? 'text-emerald-100' : 'text-emerald-500'}`}>Biologistes</p>
                <p className={`text-2xl font-black ${profFilter === 'biologiste' ? 'text-white' : 'text-emerald-700'}`}>{data.biologisteCount ?? '—'}</p>
              </div>
            </button>
          </div>
        )}

        {tab === 'EXPIRING' && data && (
          <p className="text-amber-600 font-medium">
            {data.total === 0
              ? 'Aucun compte n\'expire dans les 7 prochains jours ✓'
              : `⚠️ ${data.total} compte${data.total > 1 ? 's' : ''} expirent dans les 7 prochains jours`}
          </p>
        )}
        {tab !== 'GROUP' && tab !== 'EXPIRING' && tab !== 'ACTIVITE' && data && (
          <p className="text-muted-foreground">{data.total} au total</p>
        )}
        {tab === 'GROUP' && (
          <p className="text-muted-foreground">{groups.length} groupe{groups.length > 1 ? 's' : ''}</p>
        )}
        </div>
        <button
          onClick={async () => {
            const r = await adminApi.backfillProfession().catch(() => null);
            if (r) alert(`✅ ${r.data.updated} utilisateurs mis à jour`);
          }}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition flex-shrink-0"
          title="Mettre à jour les utilisateurs sans profession (une seule fois)">
          🔧 Backfill profession
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition
                ${isActive ? ACTIVE_MAP[t.color] : COLOR_MAP[t.color] + ' hover:brightness-95'}`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Onglet Activité */}
      {tab === 'ACTIVITE' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Activité aujourd'hui vs hier</h3>
              <p className="text-xs text-slate-400 mt-0.5">Utilisateurs actifs sur les 2 derniers jours · trié par activité du jour</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setProfFilter(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${!profFilter ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Tous</button>
              <button onClick={() => { setProfFilter('infirmier'); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${profFilter === 'infirmier' ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>🏥 Infirmiers</button>
              <button onClick={() => { setProfFilter('sage_femme'); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${profFilter === 'sage_femme' ? 'bg-pink-500 text-white border-pink-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>👶 Sage-femmes</button>
              <button onClick={() => { setProfFilter('biologiste'); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${profFilter === 'biologiste' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>🔬 Biologistes</button>
            </div>
          </div>
          {activityLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !activityData.length ? (
            <p className="text-center text-slate-400 text-sm py-16">Aucune activité sur les 2 derniers jours</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-slate-500">Utilisateur</th>
                  <th className="text-center px-4 py-3 font-medium text-blue-500">Aujourd'hui</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-400">Hier</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-400">Évolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityData.map((u: any) => {
                  const diff = u.questionsToday - u.questionsYesterday;
                  const pct = u.questionsYesterday > 0 ? Math.round(Math.abs(diff) / u.questionsYesterday * 100) : null;
                  const trend = diff > 0
                    ? <span className="text-emerald-600 font-semibold">↑ {pct !== null ? `+${pct}%` : 'nouveau'}</span>
                    : diff < 0
                    ? <span className="text-red-500 font-semibold">↓ -{pct}%</span>
                    : u.questionsToday > 0
                    ? <span className="text-slate-400">= même</span>
                    : <span className="text-slate-300">—</span>;
                  return (
                    <tr key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">{u.fullName}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-black ${u.questionsToday > 0 ? 'text-blue-700' : 'text-slate-300'}`}>{u.questionsToday}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${u.questionsYesterday > 0 ? 'text-slate-600' : 'text-slate-300'}`}>{u.questionsYesterday}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">{trend}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* User table for ALL / SOLO tabs */}
      {tab !== 'GROUP' && tab !== 'ACTIVITE' && (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par nom, email ou téléphone..."
              className="w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox"
                      checked={!!data?.users?.length && selected.size === data.users.length}
                      onChange={toggleSelectAll}
                      className="rounded cursor-pointer accent-violet-600" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Filière</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Opérateur</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Expiration</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Inscription</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.users?.map((u: any) => {
                  const subEnd = u.subscriptionEnd ? new Date(u.subscriptionEnd) : null;
                  const daysLeft = subEnd ? Math.ceil((subEnd.getTime() - Date.now()) / 86400000) : null;
                  return (
                    <tr key={u.id}
                      className={`hover:bg-slate-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="rounded cursor-pointer accent-violet-600" />
                      </td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/admin/users/${u.id}`)}>
                        <div className="flex items-center gap-2">
                          {roleIcon(u.role)}
                          <div>
                            <p className="font-medium">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                            {u.phone && <p className="text-xs text-muted-foreground/70">{u.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell cursor-pointer" onClick={() => router.push(`/admin/users/${u.id}`)}>
                        {(() => { const r = roleLabel(u.role); return (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.cls}`}>{r.label}</span>
                        ); })()}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell cursor-pointer" onClick={() => router.push(`/admin/users/${u.id}`)}>
                        {(() => {
                          const b = professionBadge(u.profession);
                          if (!b) return <span className="text-slate-300 text-xs">—</span>;
                          return <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${b.cls}`}>{b.label}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {(() => {
                          const op = u.payments?.[0]?.operator?.toLowerCase();
                          if (!op) return <span className="text-slate-300 text-xs">—</span>;
                          const colors: Record<string, string> = {
                            bankily: 'bg-yellow-100 text-yellow-700',
                            masrivi: 'bg-green-100 text-green-700',
                            sedad:   'bg-blue-100 text-blue-700',
                          };
                          return (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[op] ?? 'bg-slate-100 text-slate-600'}`}>
                              {op}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs">
                        {subEnd ? (
                          <span className={daysLeft !== null && daysLeft <= 7 ? 'text-red-500 font-semibold' : 'text-slate-500'}>
                            {subEnd.toLocaleDateString('fr-FR')}
                            {daysLeft !== null && (
                              <span className="ml-1 text-slate-400">
                                ({daysLeft <= 0 ? 'expiré' : `${daysLeft}j`})
                              </span>
                            )}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role === 'PREMIUM' && (
                            <button onClick={(e) => resetSub(e, u.id, u.fullName)}
                              disabled={!!processing}
                              title="Remettre en attente"
                              className="text-amber-400 hover:text-amber-600 transition disabled:opacity-40">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={(e) => toggle(e, u.id)}
                            disabled={!!processing}
                            title={u.isActive ? 'Désactiver' : 'Activer'}
                            className="text-muted-foreground hover:text-foreground transition">
                            {u.isActive
                              ? <ToggleRight className="w-5 h-5 text-green-500" />
                              : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button onClick={(e) => deleteUser(e, u.id, u.fullName)}
                            disabled={!!processing}
                            title="Supprimer"
                            className="text-slate-300 hover:text-red-500 transition disabled:opacity-40">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition
                    ${p === page ? 'bg-primary text-white' : 'border hover:bg-secondary'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Groups tab */}
      {tab === 'GROUP' && (
        <div className="space-y-4">
          {groups.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">Aucun groupe validé</p>
            </div>
          )}
          {groups.map((g: any) => {
            const subEnd = g.organizer?.subscriptionEnd
              ? new Date(g.organizer.subscriptionEnd)
              : null;
            const daysLeft = subEnd
              ? Math.ceil((subEnd.getTime() - Date.now()) / 86400000)
              : null;

            return (
              <div key={g.id} className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                <div className="p-5 space-y-4">

                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-500" />
                      <span className="font-bold text-slate-800">
                        Groupe · {g.groupSize ?? g.members.length + 1} membres
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{g.amount} MRU</span>
                      {g.validatedAt && (
                        <span>· validé le {new Date(g.validatedAt).toLocaleDateString('fr-FR')}</span>
                      )}
                      {subEnd && (
                        <span className={`font-semibold ${daysLeft !== null && daysLeft <= 7 ? 'text-red-500' : 'text-slate-500'}`}>
                          · expire {subEnd.toLocaleDateString('fr-FR')}
                          {daysLeft !== null && ` (${daysLeft <= 0 ? 'expiré' : daysLeft + 'j'})`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Organizer */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Organisateur</p>
                    <div
                      onClick={() => g.organizer && router.push(`/admin/users/${g.organizer.id}`)}
                      className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100 transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{g.organizer?.fullName}</p>
                        <p className="text-xs text-slate-500">{g.organizer?.email}</p>
                        {g.organizer?.phone && <p className="text-xs text-slate-400">{g.organizer.phone}</p>}
                      </div>
                      <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold border border-emerald-200">
                        Premium
                      </span>
                    </div>
                  </div>

                  {/* Members */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Membres — {g.members.filter((m: any) => m.isUsed).length}/{g.members.length} inscrits
                    </p>
                    <div className="space-y-1.5">
                      {g.members.map((m: any) => (
                        <div
                          key={m.email}
                          onClick={() => m.user && router.push(`/admin/users/${m.user.id}`)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition
                            ${m.user ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60'}
                            ${m.isUsed ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                            ${m.isUsed ? 'bg-gradient-to-br from-blue-400 to-indigo-500' : 'bg-slate-300'}`}>
                            {m.isUsed ? (m.user?.fullName?.charAt(0).toUpperCase() ?? '?') : '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            {m.user ? (
                              <>
                                <p className="font-medium text-slate-800 text-sm">{m.user.fullName}</p>
                                <p className="text-xs text-slate-500">{m.email}</p>
                              </>
                            ) : (
                              <p className="text-xs text-slate-500 font-mono">{m.email}</p>
                            )}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
                            ${m.isUsed
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            {m.isUsed ? '✓ inscrit' : 'en attente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

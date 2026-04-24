'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  CheckCircle, Shield, User, Search, ToggleLeft, ToggleRight,
  RotateCcw, Trash2, Users, Crown, UserCheck,
} from 'lucide-react';

type Tab = 'ALL' | 'SOLO_1M' | 'SOLO_3M' | 'GROUP';

const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'ALL',     label: 'Tous',        icon: <User className="w-4 h-4" />,    color: 'slate' },
  { id: 'SOLO_1M', label: 'Solo 1 mois', icon: <UserCheck className="w-4 h-4" />, color: 'indigo' },
  { id: 'SOLO_3M', label: 'Solo 3 mois', icon: <UserCheck className="w-4 h-4" />, color: 'violet' },
  { id: 'GROUP',   label: 'Groupes',     icon: <Users className="w-4 h-4" />,   color: 'emerald' },
];

const COLOR_MAP: Record<string, string> = {
  slate:   'bg-slate-100 text-slate-700 border-slate-200',
  indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  violet:  'bg-violet-100 text-violet-700 border-violet-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const ACTIVE_MAP: Record<string, string> = {
  slate:   'bg-white border-slate-300 text-slate-800 shadow-sm',
  indigo:  'bg-indigo-500 border-indigo-500 text-white shadow-sm',
  violet:  'bg-violet-500 border-violet-500 text-white shadow-sm',
  emerald: 'bg-emerald-500 border-emerald-500 text-white shadow-sm',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('ALL');
  const [data, setData] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'GROUP') { loadGroups(); }
    else { load(); }
  }, [tab, page, search]);

  async function load() {
    const params: any = { page, search };
    if (tab !== 'ALL') params.planType = tab;
    const { data: d } = await adminApi.users(params);
    setData(d);
  }

  async function loadGroups() {
    const { data: d } = await adminApi.groups();
    setGroups(d);
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
  }

  const roleIcon = (role: string) => {
    if (role === 'ADMIN') return <Shield className="w-4 h-4 text-blue-600" />;
    if (role === 'PREMIUM') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    return <User className="w-4 h-4 text-slate-400" />;
  };

  const roleLabel = (role: string) => {
    if (role === 'ADMIN') return { label: 'Admin', cls: 'bg-blue-100 text-blue-700' };
    if (role === 'PREMIUM') return { label: 'Premium', cls: 'bg-emerald-100 text-emerald-700' };
    return { label: 'Gratuit', cls: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        {tab !== 'GROUP' && data && (
          <p className="text-muted-foreground">{data.total} au total</p>
        )}
        {tab === 'GROUP' && (
          <p className="text-muted-foreground">{groups.length} groupe{groups.length > 1 ? 's' : ''}</p>
        )}
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

      {/* User table for ALL / SOLO tabs */}
      {tab !== 'GROUP' && (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Statut</th>
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
                      onClick={() => router.push(`/admin/users/${u.id}`)}
                      className={`hover:bg-slate-50 cursor-pointer ${!u.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {roleIcon(u.role)}
                          <div>
                            <p className="font-medium">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {(() => { const r = roleLabel(u.role); return (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.cls}`}>{r.label}</span>
                        ); })()}
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

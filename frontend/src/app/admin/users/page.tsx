'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { CheckCircle, Shield, User, Search, ToggleLeft, ToggleRight, RotateCcw, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { load(); }, [page, search]);

  async function load() {
    const { data: d } = await adminApi.users({ page, search });
    setData(d);
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

  const roleIcon = (role: string) => {
    if (role === 'ADMIN') return <Shield className="w-4 h-4 text-blue-600" />;
    if (role === 'PREMIUM') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    return <User className="w-4 h-4 text-slate-400" />;
  };

  const roleLabel = (role: string) => {
    if (role === 'ADMIN') return { label: 'Admin', cls: 'bg-blue-100 text-blue-700' };
    if (role === 'PREMIUM') return { label: 'Validé', cls: 'bg-emerald-100 text-emerald-700' };
    return { label: 'En attente', cls: 'bg-amber-100 text-amber-700' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        {data && <p className="text-muted-foreground">{data.total} au total</p>}
      </div>

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
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { CheckCircle, Shield, User, Search, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AdminUsersPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { load(); }, [page, search]);

  async function load() {
    const { data: d } = await adminApi.users({ page, search });
    setData(d);
  }

  async function toggle(id: string) {
    setProcessing(id);
    await adminApi.toggleUser(id).catch(() => {});
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Inscription</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.users?.map((u: any) => (
              <tr key={u.id} className={`hover:bg-slate-50 ${!u.isActive ? 'opacity-50' : ''}`}>
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
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggle(u.id)}
                    disabled={!!processing}
                    className="text-muted-foreground hover:text-foreground transition"
                    title={u.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {u.isActive
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition
                ${p === page ? 'bg-primary text-white' : 'border hover:bg-secondary'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

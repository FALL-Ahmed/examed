'use client';
import { useEffect, useState, useMemo } from 'react';
import { examenBlancApi } from '@/lib/api';
import { Users, Phone, MapPin, CheckCircle, Clock, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';

const PROF_LABEL: Record<string, string> = {
  INFIRMIER: 'Infirmier',
  SAGE_FEMME: 'Sage-femme',
  BIOLOGISTE: 'Biologiste',
};
const PROF_COLOR: Record<string, string> = {
  INFIRMIER:  'bg-violet-100 text-violet-700 border-violet-200',
  SAGE_FEMME: 'bg-pink-100 text-pink-700 border-pink-200',
  BIOLOGISTE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProf, setFilterProf] = useState<string>('');
  const [filterRegistered, setFilterRegistered] = useState<string>('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    examenBlancApi.adminUniqueLeads()
      .then((r) => setLeads(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterProf && !l.professions.includes(filterProf)) return false;
      if (filterRegistered === 'yes' && !l.isRegistered) return false;
      if (filterRegistered === 'no' && l.isRegistered) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = `${l.nom} ${l.prenom}`.toLowerCase();
        if (!name.includes(q) && !l.telephone?.includes(q) && !l.ville?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [leads, filterProf, filterRegistered, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    infirmier: leads.filter(l => l.professions.includes('INFIRMIER')).length,
    sageFemme: leads.filter(l => l.professions.includes('SAGE_FEMME')).length,
    biologiste: leads.filter(l => l.professions.includes('BIOLOGISTE')).length,
    registered: leads.filter(l => l.isRegistered).length,
    multi: leads.filter(l => l.sessionsCount > 1).length,
  }), [leads]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Leads uniques</h1>
          <p className="text-sm text-muted-foreground">{stats.total} leads · {stats.multi} ont participé à plusieurs examens</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-100 text-slate-800' },
          { label: 'Infirmier', value: stats.infirmier, color: 'bg-violet-100 text-violet-800' },
          { label: 'Sage-femme', value: stats.sageFemme, color: 'bg-pink-100 text-pink-800' },
          { label: 'Biologiste', value: stats.biologiste, color: 'bg-emerald-100 text-emerald-800' },
          { label: 'Inscrits app', value: stats.registered, color: 'bg-blue-100 text-blue-800' },
          { label: '2+ examens', value: stats.multi, color: 'bg-amber-100 text-amber-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, téléphone, ville…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-background"
          />
        </div>
        <select value={filterProf} onChange={e => setFilterProf(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-2 bg-background">
          <option value="">Toutes professions</option>
          <option value="INFIRMIER">Infirmier</option>
          <option value="SAGE_FEMME">Sage-femme</option>
          <option value="BIOLOGISTE">Biologiste</option>
        </select>
        <select value={filterRegistered} onChange={e => setFilterRegistered(e.target.value)}
          className="text-sm border border-border rounded-xl px-3 py-2 bg-background">
          <option value="">Tous</option>
          <option value="yes">Inscrit app</option>
          <option value="no">Non inscrit</option>
        </select>
        <span className="text-sm text-muted-foreground font-medium ml-auto">{filtered.length} résultats</span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 700 }}>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Téléphone</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ville</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Professions</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Examens</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Complétés</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">App</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const isExpanded = expanded === lead.telephone;
                return (
                  <>
                    <tr
                      key={lead.telephone}
                      className="border-b border-border hover:bg-muted/20 transition cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : lead.telephone)}
                    >
                      <td className="px-4 py-3 font-semibold">
                        {lead.nom} {lead.prenom}
                        {lead.lang === 'ar' && <span className="ml-2 text-xs text-muted-foreground">🇲🇷</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-mono">{lead.telephone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          {lead.ville || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {lead.professions.map((p: string) => (
                            <span key={p} className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${PROF_COLOR[p] || 'bg-gray-100 text-gray-700'}`}>
                              {PROF_LABEL[p] || p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-black text-base ${lead.sessionsCount > 1 ? 'text-amber-600' : 'text-foreground'}`}>
                          {lead.sessionsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${lead.completedCount > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {lead.completedCount}/{lead.sessionsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {lead.isRegistered
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                              <CheckCircle className="w-3 h-3" /> Inscrit
                            </span>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        }
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${lead.telephone}-detail`} className="bg-muted/10">
                        <td colSpan={8} className="px-6 py-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Détail des sessions :</p>
                          <div className="flex flex-wrap gap-2">
                            {lead.sessions.map((s: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs bg-background border border-border rounded-lg px-3 py-1.5">
                                <span className={`w-2 h-2 rounded-full ${s.isCompleted ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="font-semibold">{s.title}</span>
                                <span className={`px-1.5 py-0.5 rounded-full border ${PROF_COLOR[s.target] || ''}`}>{PROF_LABEL[s.target] || s.target}</span>
                                {s.isCompleted && s.score != null && (
                                  <span className="font-mono text-muted-foreground">{s.score.toFixed(0)}%</span>
                                )}
                                {!s.isCompleted && <span className="text-muted-foreground italic">Non complété</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Aucun lead trouvé</div>
        )}
      </div>
    </div>
  );
}

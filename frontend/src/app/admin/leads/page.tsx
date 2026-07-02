'use client';
import { useEffect, useState, useMemo } from 'react';
import { examenBlancApi } from '@/lib/api';
import { Users, Phone, MapPin, CheckCircle, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 100;

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

const BOT_CAPTIONS: Record<'fr' | 'ar', string> = {
  fr: `Salamoualeykoum,\n\nLien inscription :\n https://albourour.com/register\n\n Promo -30%`,
  ar: `السلام عليكم،\n\nرابط التسجيل:\n https://albourour.com/register\n\n خصم 30%`,
};

function buildBotWaUrl(telephone: string, lang: string): string {
  const msg = BOT_CAPTIONS[lang === 'ar' ? 'ar' : 'fr'];
  let phone = (telephone ?? '').replace(/\D/g, '');
  if (phone.startsWith('00222')) phone = phone.slice(2);
  else if (phone.startsWith('0') && phone.length <= 9) phone = '222' + phone.slice(1);
  else if (phone.length === 8) phone = '222' + phone;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProf, setFilterProf] = useState<string>('');
  const [filterRegistered, setFilterRegistered] = useState<string>('no');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [botLeads, setBotLeads] = useState<any[]>([]);
  const [botQueueOpen, setBotQueueOpen] = useState(false);
  const [botQueueIdx, setBotQueueIdx] = useState(0);

  const loadBotLeads = () => {
    examenBlancApi.adminWhatsappBotLeads()
      .then((r) => setBotLeads(r.data?.leads ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    examenBlancApi.adminUniqueLeads()
      .then((r) => setLeads(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    loadBotLeads();
  }, []);

  const botStats = useMemo(() => {
    const byProf = (p: string) => botLeads.filter(l => l.target === p);
    return {
      total: botLeads.length,
      sent: botLeads.filter(l => l.sent).length,
      remaining: botLeads.filter(l => !l.sent).length,
      infirmier: byProf('INFIRMIER').length,
      sageFemme: byProf('SAGE_FEMME').length,
      biologiste: byProf('BIOLOGISTE').length,
    };
  }, [botLeads]);

  const botQueue = useMemo(() => botLeads.filter(l => !l.sent), [botLeads]);

  const markBotLeadSent = async (telephone: string) => {
    setBotLeads(prev => prev.map(l => l.telephone === telephone ? { ...l, sent: true } : l));
    try { await examenBlancApi.adminMarkWhatsappBotLeadSent(telephone, true); } catch {}
  };

  const filtered = useMemo(() => {
    setPage(1);
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const nonReg = leads.filter(l => !l.isRegistered);
    return {
      total: nonReg.length,
      infirmier: nonReg.filter(l => l.professions.includes('INFIRMIER')).length,
      sageFemme: nonReg.filter(l => l.professions.includes('SAGE_FEMME')).length,
      biologiste: nonReg.filter(l => l.professions.includes('BIOLOGISTE')).length,
      multi: nonReg.filter(l => l.sessionsCount > 1).length,
    };
  }, [leads]);

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
          { label: '2+ examens', value: stats.multi, color: 'bg-amber-100 text-amber-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bot WhatsApp (envoi manuel séquentiel) */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </div>
        <div className="flex-1 min-w-48">
          <p className="font-bold text-foreground">Bot WhatsApp (envoi manuel)</p>
          <p className="text-xs text-muted-foreground">
            {botStats.total} leads ciblés — {botStats.sent} envoyés · {botStats.remaining} restants
            {' '}(Infirmier {botStats.infirmier} · Sage-femme {botStats.sageFemme} · Bio {botStats.biologiste})
          </p>
        </div>
        <button
          onClick={() => { setBotQueueIdx(0); setBotQueueOpen(true); }}
          disabled={botQueue.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white hover:opacity-80 transition bg-[#25D366] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Envoyer ({botQueue.length})
        </button>
      </div>

      {/* Modale envoi séquentiel Bot WhatsApp */}
      {botQueueOpen && botQueueIdx < botQueue.length && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center space-y-5">
            <p className="text-xs text-muted-foreground">{botQueueIdx + 1} / {botQueue.length}</p>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-[#25D366] h-1.5 rounded-full transition-all" style={{ width: `${((botQueueIdx + 1) / botQueue.length) * 100}%` }} />
            </div>
            <div>
              <span className={`inline-block mb-2 text-xs px-2 py-0.5 rounded-full border font-semibold ${PROF_COLOR[botQueue[botQueueIdx].target] || ''}`}>
                {PROF_LABEL[botQueue[botQueueIdx].target] || botQueue[botQueueIdx].target}
              </span>
              <p className="font-black text-foreground text-xl">{botQueue[botQueueIdx].prenom} {botQueue[botQueueIdx].nom}</p>
              <p className="text-muted-foreground text-sm">{botQueue[botQueueIdx].telephone} · {botQueue[botQueueIdx].ville}</p>
              <p className="text-xs mt-1">{botQueue[botQueueIdx].lang === 'ar' ? '🇲🇷 AR' : '🇫🇷 FR'} · score {botQueue[botQueueIdx].score?.toFixed?.(1) ?? botQueue[botQueueIdx].score}%</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
              🎥 N'oublie pas de joindre la vidéo manuellement : {botQueue[botQueueIdx].lang === 'ar' ? 'videos/ar.mp4' : 'videos/fr.mp4'}
            </div>
            <a
              href={buildBotWaUrl(botQueue[botQueueIdx].telephone, botQueue[botQueueIdx].lang)}
              target="_blank" rel="noreferrer"
              onClick={() => setTimeout(() => { markBotLeadSent(botQueue[botQueueIdx].telephone); setBotQueueIdx(i => i + 1); }, 800)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-white bg-[#25D366] hover:opacity-90 transition text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Envoyer sur WhatsApp
            </a>
            <div className="flex gap-2">
              <button onClick={() => setBotQueueIdx(i => i + 1)}
                className="flex-1 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition">
                Passer →
              </button>
              <button onClick={() => setBotQueueOpen(false)}
                className="flex-1 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition">
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
      {botQueueOpen && botQueueIdx >= botQueue.length && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <p className="font-black text-foreground text-xl">Envoi terminé !</p>
            <p className="text-muted-foreground text-sm">Tous les leads restants ont été traités</p>
            <button onClick={() => setBotQueueOpen(false)}
              className="w-full py-3 rounded-2xl font-bold text-sm text-white hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              Fermer
            </button>
          </div>
        </div>
      )}

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
          <option value="">Tous (inscrit + non inscrit)</option>
          <option value="no">Non inscrits seulement</option>
          <option value="yes">Déjà inscrits</option>
        </select>
        <span className="text-sm text-muted-foreground font-medium ml-auto">{filtered.length} résultats</span>
      </div>

      {/* Pagination top */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} / {totalPages} · {filtered.length} leads</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1.5 rounded-lg text-sm border border-border disabled:opacity-40 hover:bg-muted transition">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition">
              <ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const n = start + i;
              return n <= totalPages ? (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold border transition ${n === page ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}>
                  {n}
                </button>
              ) : null;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition">
              <ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1.5 rounded-lg text-sm border border-border disabled:opacity-40 hover:bg-muted transition">»</button>
          </div>
        </div>
      )}

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
              {paginated.map((lead) => {
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

      {/* Pagination bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pb-4">
          <button onClick={() => setPage(1)} disabled={page === 1}
            className="px-2 py-1.5 rounded-lg text-sm border border-border disabled:opacity-40 hover:bg-muted transition">«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition">
            <ChevronLeft className="w-4 h-4" /></button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const n = start + i;
            return n <= totalPages ? (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold border transition ${n === page ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}>
                {n}
              </button>
            ) : null;
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition">
            <ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
            className="px-2 py-1.5 rounded-lg text-sm border border-border disabled:opacity-40 hover:bg-muted transition">»</button>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import { examenBlancApi } from '@/lib/api';
import { Trophy, Users, TrendingUp, MapPin, AlertTriangle, Plus, RefreshCw, Eye, CheckCircle, XCircle, Clock, Download, ChevronDown, Pencil, FlaskConical } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');
function formatDate(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatTime(sec: number) { const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h}h${pad(m)}` : `${m}min`; }

const LIEN_PREMIUM = 'https://albourour.com/register';

const LIEN_FREE = 'https://albourour.com/free-practice';

function buildWhatsAppUrl(l: any): string {
  const isAr = l.lang === 'ar';
  const prenom = l.prenom ?? '';
  const nom = l.nom ?? '';

  // Cas : a commencé mais pas terminé
  if (!l.isCompleted) {
    const msg = isAr
      ? `مرحباً ${prenom} ${nom}،\nلقد بدأت امتحان البرور التجريبي ولكنك لم تكمله.\n\nرابط بريميوم: ${LIEN_PREMIUM}\nرابط التجربة المجانية: ${LIEN_FREE}\n\nقرر المراجعة بشكل منظم، تابع تقدمك (الإحصائيات) وترتيبك مقارنة بزملائك.`
      : `Bonjour ${prenom} ${nom},\nVous avez entamé l'examen Blanc Albourour, mais ne l'avez pas fini.\n\nLien premium : ${LIEN_PREMIUM}\nLien Essai gratuit : ${LIEN_FREE}\n\nDécidez de réviser de façon organisée, suivez votre progression (statistiques) et votre classement par rapport aux autres collègues.`;
    let phone = (l.telephone ?? '').replace(/\D/g, '');
    if (phone.startsWith('00222')) phone = phone.slice(2);
    else if (phone.startsWith('0') && phone.length <= 9) phone = '222' + phone.slice(1);
    else if (phone.length === 8) phone = '222' + phone;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  const score = l.score != null ? l.score.toFixed(1) : '—';
  const classement = l.classement ? `${l.classement}/${l.totalParticipants}` : 'XX';

  const headerFr = `Bonsoir ${prenom} ${nom}, votre score à l'examen blanc était de ${score}%, votre classement est ${classement}.\n`;
  const headerAr = `مساء الخير ${prenom} ${nom}، درجتك في الامتحان التجريبي كانت ${score}%، وترتيبك هو ${classement}.\n`;

  let body = '';
  const s = l.score ?? -1;

  if (s < 30) {
    body = isAr
      ? `درجة ${score}% هي إنذار: طريقتك الحالية في المراجعة قد لا تكفي. قرر اليوم التوقف عن المراجعة العشوائية. مع أكثر من 600 أسئلة متعددة الاختيارات وتفسيرات أطبائنا، حوّل نقاط ضعفك إلى نقاط قوة. اتقن أخيراً المفاهيم الأساسية، تابع تطورك وارتقِ في الترتيب الوطني لتأمين مستقبلك. استعد بجدية.\n${LIEN_PREMIUM}`
      : `Ton score de ${score}% est un signal d'alarme : ta méthode actuelle peut ne pas suffire pour le concours. Décide aujourd'hui de ne plus réviser au hasard. Avec plus de 600 QCM et les explications de nos médecins, transforme tes lacunes en forces. Maîtrise enfin les concepts clés, suis ton évolution et remonte dans le classement national pour sécuriser ton avenir. Prépare-toi sérieusement.\n${LIEN_PREMIUM}`;
  } else if (s < 50) {
    body = isAr
      ? `بحصولك على ${score}%، لديك الأساسيات ولكنك لا تزال في منطقة الخطر. للنجاح في الاكتتاب، عليك الانتقال لمستوى أعلى. اتخذ القرار بتنظيم نجاحك: استفد من 600 سؤال مشروح لفهم منطق الامتحان. تابع ترتيبك بين زملائك واضمن تفوقك على المتوسط الوطني يومياً. نجاحك يستحق هذا المجهود.\n${LIEN_PREMIUM}`
      : `Avec ${score}%, tu as les bases, mais tu es encore dans la zone d'incertitude. Pour réussir le recrutement, tu dois passer à la vitesse supérieure. Décide de structurer ta réussite : accède à nos 600 QCM commentés pour comprendre la logique de l'examen. Suis ton rang par rapport aux autres candidats et assure-toi de dépasser la moyenne nationale chaque jour. Ton succès mérite cet investissement.\n${LIEN_PREMIUM}`;
  } else if (s < 65) {
    body = isAr
      ? `أحسنت بحصولك على ${score}%، أنت قريب من الهدف! لكن احذر، فالاكتتاب يُحسم بالتفاصيل الصغيرة. قرر أن لا تترك شيئاً للصدفة. استخدم منصة "البرور" لإتقان المواضيع الصعبة عبر شروحاتنا الطبية. بمتابعة ترتيبك الوطني المباشر، ستعرف بالضبط كيف تسبق منافسيك. اجعل هدفك التميز وليس فقط النجاح.\n${LIEN_PREMIUM}`
      : `Bravo pour tes ${score}%, tu es proche du but ! Mais attention, le recrutement se joue sur les détails qui font la différence. Décide de ne rien laisser au hasard. Utilise Albourour pour perfectionner les thèmes difficiles avec nos médecins. En suivant ton évolution et ton classement national en temps réel, tu sauras exactement comment rester devant tes concurrents. Vise l'excellence, pas seulement la moyenne.\n${LIEN_PREMIUM}`;
  } else {
    body = isAr
      ? `هنيئاً لك نتيجتك ${score}%، أنت الآن من النخبة! لم يعد السؤال هو "هل ستنجح؟" بل "كيف تضمن صدارة الناجحين؟". لتبقى في القمة، تحتاج إلى 600 سؤال من المستوى العالي وشروحاتنا الطبية الدقيقة. لا تسمح لأحد بتجاوزك: تابع ترتيبك الوطني لحظة بلحظة وحافظ على تفوقك. قرر تثبيت مكانتك في الصدارة الآن.\n${LIEN_PREMIUM}`
      : `Félicitations pour ton score de ${score}%, tu fais partie de l'élite ! La question n'est plus de réussir, mais de garantir ta place de Major. Pour rester au sommet, tu as besoin de nos 600 QCM de haut niveau et des commentaires détaillés des médecins. Ne laisse personne te rattraper : suis ton classement national heure par heure et continue de dominer la préparation. Décide de confirmer ton rang dès maintenant.\n${LIEN_PREMIUM}`;
  }

  const msg = (isAr ? headerAr : headerFr) + body;
  let phone = (l.telephone ?? '').replace(/\D/g, '');
  // Normalisation indicatif Mauritanie (+222)
  if (phone.startsWith('00222')) phone = phone.slice(2);       // 00222XXXXXXXX → 222XXXXXXXX
  else if (phone.startsWith('0') && phone.length <= 9) phone = '222' + phone.slice(1); // 0XXXXXXXX → 222XXXXXXXX
  else if (phone.length === 8) phone = '222' + phone;          // XXXXXXXX → 222XXXXXXXX
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

const defaultForm = { title: 'Examen Blanc National', descriptionFr: '', descriptionAr: '', startsAt: '', endsAt: '', resultsAt: '', totalQ: 80, durationMin: 120 };

export default function AdminExamenBlancPage() {
  const [tab, setTab] = useState<'sessions' | 'create' | 'stats' | 'leads'>('sessions');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsSession, setLeadsSession] = useState<string>('all');
  const [leadsFilter, setLeadsFilter] = useState<'all' | 'prospects' | 'registered'>('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'incomplete' | 'lt30' | '30-50' | '50-65' | 'gt65'>('all');
  const [sendQueue, setSendQueue] = useState<any[] | null>(null);
  const [sendIdx, setSendIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLang, setStatsLang] = useState<'fr' | 'ar'>('fr');
  const [form, setForm] = useState(defaultForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [editing, setEditing] = useState<Record<string, any>>({});
  const [expandedEdit, setExpandedEdit] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try { const { data } = await examenBlancApi.adminSessions(); setSessions(data); } catch {}
    setLoading(false);
  }, []);

  const loadLeads = useCallback(async () => {
    try { const { data } = await examenBlancApi.adminParticipants(); setLeads(data); } catch {}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { if (tab === 'leads') loadLeads(); }, [tab, loadLeads]);

  async function loadStats(id: string, lang?: 'fr' | 'ar') {
    setStatsLoading(true); setStats(null);
    try { const { data } = await examenBlancApi.adminGetStats(id, lang); setStats(data); } catch {}
    setStatsLoading(false);
  }

  async function switchStatsLang(lang: 'fr' | 'ar') {
    setStatsLang(lang);
    if (selectedSession) loadStats(selectedSession.id, lang);
  }

  async function handleCreate() {
    setCreateError(''); setCreateSuccess('');
    if (!form.startsAt || !form.endsAt) return setCreateError('Dates de début et fin requises');
    if (new Date(form.endsAt) <= new Date(form.startsAt)) return setCreateError('La date de fin doit être après la date de début');
    setCreating(true);
    try {
      await examenBlancApi.adminCreateSession(form);
      setCreateSuccess(`✅ Session créée avec ${form.totalQ} questions sélectionnées automatiquement`);
      setForm(defaultForm); loadSessions(); setTab('sessions');
    } catch (err: any) { setCreateError(err.response?.data?.message || 'Erreur lors de la création'); }
    setCreating(false);
  }

  async function toggleActive(id: string, current: boolean) {
    try { await examenBlancApi.adminUpdateSession(id, { isActive: !current }); loadSessions(); } catch {}
  }

  async function saveEdit(id: string) {
    const data = editing[id]; if (!data) return;
    try { await examenBlancApi.adminUpdateSession(id, data); setEditing(e => { const n = { ...e }; delete n[id]; return n; }); loadSessions(); } catch {}
  }

  function exportLeadsCsv() {
    const header = 'Prénom,Nom,Téléphone,Wilaya,Langue,Session,Score,Terminé,Créé le';
    const rows = leads.map(l => `${l.prenom},${l.nom},${l.telephone},${l.ville},${l.lang === 'ar' ? 'AR' : 'FR'},"${l.examenBlanc?.title || ''}",${l.score ?? ''},${l.isCompleted ? 'Oui' : 'Non'},${new Date(l.createdAt).toLocaleDateString('fr-FR')}`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'participants_examen_blanc.csv'; a.click();
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-background text-foreground';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1';

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Examen Blanc</h1>
            <p className="text-xs text-muted-foreground">Gestion des sessions d'examen blanc national</p>
          </div>
        </div>
        <button onClick={loadSessions} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:bg-accent transition">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
        {([
          { id: 'sessions', label: `Sessions (${sessions.length})` },
          { id: 'create',   label: '+ Créer' },
          { id: 'stats',    label: 'Statistiques' },
          { id: 'leads',    label: `Leads (${leads.length || '…'})` },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SESSIONS ── */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune session. Créez la première via l'onglet "+ Créer".</p>
            </div>
          ) : sessions.map(s => {
            const now = new Date();
            const isOpen = new Date(s.startsAt) <= now && now <= new Date(s.endsAt);
            const isClosed = now > new Date(s.endsAt);
            const isResultsReady = now >= new Date(s.resultsAt);
            const ed = editing[s.id];

            const statusColor = !s.isActive ? 'bg-slate-400' : isOpen ? 'bg-emerald-500' : isClosed && isResultsReady ? 'bg-violet-500' : isClosed ? 'bg-amber-500' : 'bg-blue-400';
            const statusLabel = !s.isActive ? 'Inactive' : isOpen ? 'Ouverte' : isClosed && isResultsReady ? 'Résultats dispo' : isClosed ? 'En attente résultats' : 'À venir';
            const isEditing = expandedEdit === s.id;

            return (
              <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">

                {/* Colored top bar by status */}
                <div className={`h-1 w-full ${statusColor}`} />

                <div className="p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
                      <h3 className="font-bold text-foreground truncate">{s.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                        !s.isActive ? 'bg-muted text-muted-foreground' :
                        isOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        isClosed && isResultsReady ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                        isClosed ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>{statusLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <TestButton sessionId={s.id} />
                      <button onClick={() => { setSelectedSession(s); setTab('stats'); loadStats(s.id, statsLang); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:bg-accent transition">
                        <Eye className="w-3.5 h-3.5" /> Stats
                      </button>
                      <button onClick={() => toggleActive(s.id, s.isActive)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${s.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                        {s.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => setExpandedEdit(isEditing ? null : s.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${isEditing ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                        <Pencil className="w-3.5 h-3.5" />
                        <ChevronDown className={`w-3 h-3 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {(s.descriptionFr || s.descriptionAr) && (
                    <div className="space-y-1">
                      {s.descriptionFr && <p className="text-sm text-muted-foreground leading-relaxed">🇫🇷 {s.descriptionFr}</p>}
                      {s.descriptionAr && <p className="text-sm text-muted-foreground leading-relaxed text-right" dir="rtl">🇲🇷 {s.descriptionAr}</p>}
                    </div>
                  )}

                  {/* Compact metrics row */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Users className="w-3.5 h-3.5 text-violet-500" /> {s.participantCount ?? 0} inscrits
                    </span>
                    <span className="text-muted-foreground">{s.totalQ} questions · {s.durationMin} min</span>
                    <span className="text-muted-foreground">📅 {formatDate(s.startsAt)}</span>
                    <span className="text-muted-foreground">🔒 {formatDate(s.endsAt)}</span>
                    <span className="text-muted-foreground">🏆 {formatDate(s.resultsAt)}</span>
                  </div>

                  {/* Edit panel — collapsible */}
                  {isEditing && (
                    <div className="pt-4 border-t border-border space-y-3">
                      <div>
                        <label className={labelCls}>Titre</label>
                        <input className={inputCls} defaultValue={s.title}
                          onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], title: e.target.value } }))} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Description 🇫🇷</label>
                          <textarea className={inputCls} defaultValue={s.descriptionFr ?? ''}
                            style={{ overflow: 'hidden', resize: 'none' }}
                            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                            onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], descriptionFr: e.target.value } }))} />
                        </div>
                        <div>
                          <label className={labelCls}>Description 🇲🇷</label>
                          <textarea className={inputCls} defaultValue={s.descriptionAr ?? ''} dir="rtl"
                            style={{ overflow: 'hidden', resize: 'none' }}
                            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                            onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], descriptionAr: e.target.value } }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Nb questions</label>
                          <input type="number" min={10} max={200} className={inputCls} defaultValue={s.totalQ}
                            onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], totalQ: Number(e.target.value) } }))} />
                        </div>
                        <div>
                          <label className={labelCls}>Durée (minutes)</label>
                          <input type="number" min={30} max={360} className={inputCls} defaultValue={s.durationMin}
                            onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], durationMin: Number(e.target.value) } }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(['startsAt', 'endsAt', 'resultsAt'] as const).map(field => (
                          <div key={field}>
                            <label className={labelCls}>{field === 'startsAt' ? 'Ouverture' : field === 'endsAt' ? 'Fermeture' : 'Résultats'}</label>
                            <input type="datetime-local" className={inputCls}
                              defaultValue={new Date(s[field]).toISOString().slice(0, 16)}
                              onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], [field]: e.target.value } }))} />
                          </div>
                        ))}
                      </div>
                      {ed && (
                        <button onClick={() => { saveEdit(s.id); setExpandedEdit(null); }}
                          className="px-5 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                          Enregistrer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE ── */}
      {tab === 'create' && (
        <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-500" /> Nouvelle session
          </h2>

          {createError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">{createError}</div>}
          {createSuccess && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm">{createSuccess}</div>}

          <div>
            <label className={labelCls}>Titre</label>
            <input className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Description 🇫🇷 (optionnel)</label>
              <textarea className={inputCls} rows={2} value={form.descriptionFr} onChange={e => setForm(p => ({ ...p, descriptionFr: e.target.value }))} placeholder="Description en français…" />
            </div>
            <div>
              <label className={labelCls}>Description 🇲🇷 (اختياري)</label>
              <textarea className={inputCls} rows={2} value={form.descriptionAr} onChange={e => setForm(p => ({ ...p, descriptionAr: e.target.value }))} placeholder="وصف بالعربية…" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ouverture <span className="text-red-400">*</span></label>
              <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={e => setForm(p => ({ ...p, startsAt: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Fermeture <span className="text-red-400">*</span></label>
              <input type="datetime-local" className={inputCls} value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Révélation résultats (vide = fermeture + 24h)</label>
            <input type="datetime-local" className={inputCls} value={form.resultsAt} onChange={e => setForm(p => ({ ...p, resultsAt: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre de questions</label>
              <input type="number" min={10} max={200} className={inputCls} value={form.totalQ} onChange={e => setForm(p => ({ ...p, totalQ: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={labelCls}>Durée (minutes)</label>
              <input type="number" min={30} max={360} className={inputCls} value={form.durationMin} onChange={e => setForm(p => ({ ...p, durationMin: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 text-sm text-violet-700 dark:text-violet-300">
            <p className="font-semibold mb-1">🧠 Sélection automatique</p>
            <p className="text-xs opacity-80">Les {form.totalQ} questions sont choisies automatiquement : 1 question minimum par sous-thème, uniquement les questions avec commentaire, puis complétées aléatoirement.</p>
          </div>

          <button onClick={handleCreate} disabled={creating}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {creating
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération en cours…</>
              : '🚀 Créer la session'}
          </button>
        </div>
      )}

      {/* ── STATS ── */}
      {tab === 'stats' && (
        <div className="space-y-6">
          {!selectedSession && !statsLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Cliquez sur "Stats" depuis une session pour voir ses statistiques.</p>
            </div>
          ) : statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-bold text-foreground">{stats.session?.title}</h2>
                {/* Language toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                  {([
                    { lang: 'fr' as const, label: '🇫🇷 Français', count: stats.langCounts?.fr ?? 0 },
                    { lang: 'ar' as const, label: '🇲🇷 Arabe',    count: stats.langCounts?.ar ?? 0 },
                  ]).map(({ lang, label, count }) => (
                    <button key={lang} onClick={() => switchStatsLang(lang)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${statsLang === lang ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {label} <span className="ml-1 opacity-60">({count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total inscrits',       val: stats.stats.total,            color: 'bg-blue-500' },
                  { label: `Terminé (${stats.stats.completionRate}%)`, val: stats.stats.completed, color: 'bg-emerald-500' },
                  { label: 'Score moyen',           val: `${stats.stats.avgScore}%`,   color: 'bg-violet-500' },
                  { label: 'Taux réussite ≥50%',   val: `${stats.stats.passRate}%`,   color: 'bg-amber-500' },
                ].map(({ label, val, color }, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-2xl font-black text-foreground">{val}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {stats.stats.tricherieCount > 0 && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-400 text-sm font-semibold">
                    {stats.stats.tricherieCount} participant(s) détecté(s) pour triche (≥5 changements d'onglet)
                  </p>
                </div>
              )}

              {/* Histogram — vertical, FR+AR combinés */}
              {stats.histogramAll && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-500" /> Distribution des notes
                  </h3>
                  <p className="text-xs text-muted-foreground mb-5">FR + AR combinés — {stats.histogramAll.reduce((s: number, b: any) => s + b.count, 0)} participants</p>
                  {(() => {
                    const maxC = Math.max(...stats.histogramAll.map((b: any) => b.count), 1);
                    const MAX_H = 120;
                    const colors = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#6366f1','#8b5cf6'];
                    return (
                      <div>
                        <div className="flex items-end gap-1.5" style={{ height: MAX_H }}>
                          {stats.histogramAll.map((bar: any, i: number) => {
                            const h = bar.count > 0 ? Math.max(12, Math.round((bar.count / maxC) * MAX_H)) : 3;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                                {bar.count > 0 && <span className="text-[11px] font-bold text-foreground mb-0.5">{bar.count}</span>}
                                <div className="w-full rounded-t-md" style={{ height: h, background: bar.count > 0 ? colors[i] : '#e5e7eb' }} />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          {stats.histogramAll.map((_: any, i: number) => (
                            <div key={i} className="flex-1 text-center">
                              <span className="text-[10px] text-muted-foreground">{i * 10}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* City breakdown */}
              {stats.cityBreakdown?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-violet-500" /> Répartition par wilaya
                  </h3>
                  <div className="space-y-3">
                    {stats.cityBreakdown.map((c: any, i: number) => {
                      const max = stats.cityBreakdown[0]?.count || 1;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-muted-foreground text-sm w-40 flex-shrink-0 truncate">{c.ville}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                          </div>
                          <span className="text-muted-foreground text-sm w-6 text-right">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Questions les plus ratées */}
              {stats.questionStats?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">❌ Questions les plus ratées</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Triées par score partiel moyen croissant — top 30</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          {['#', 'Q°', 'Question', 'Thème', 'Rép.', '✅ Juste', '🔶 Partiel', '❌ Négatif', 'Score moy.'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.questionStats.map((q: any, i: number) => (
                          <tr key={q.questionId} className="border-t border-border hover:bg-muted/50">
                            <td className="px-4 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-violet-600 whitespace-nowrap">
                              {q.numQuestion ? `#${q.numQuestion}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-foreground max-w-xs">
                              <p className="line-clamp-2">{q.text}</p>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              <p>{q.theme}</p>
                              <p className="text-xs opacity-60">{q.subTheme}</p>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{q.total}</td>
                            <td className="px-4 py-2.5 font-bold text-emerald-600">{q.fullPct}%</td>
                            <td className="px-4 py-2.5 font-bold text-amber-500">{q.partialPct}%</td>
                            <td className="px-4 py-2.5 font-bold text-red-500">{q.negativePct}%</td>
                            <td className="px-4 py-2.5">
                              <span className={`font-bold ${q.avgPartial < 0 ? 'text-red-500' : q.avgPartial < 0.5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                {q.avgPartial.toFixed(3)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top participants */}
              {stats.topParticipants?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">🏆 Top participants</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {['#', 'Nom', 'Wilaya', 'Téléphone', 'Score', 'Temps', 'Triche'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topParticipants.map((p: any) => (
                          <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                            <td className="px-4 py-2.5 font-bold text-muted-foreground">{p.rank}</td>
                            <td className="px-4 py-2.5 font-semibold text-foreground">{p.prenom} {p.nom}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{p.ville}</td>
                            <td className="px-4 py-2.5 text-muted-foreground font-mono">{p.telephone}</td>
                            <td className="px-4 py-2.5 font-bold text-violet-600">{p.score?.toFixed(1)}%</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{formatTime(p.timeTaken || 0)}</td>
                            <td className="px-4 py-2.5">
                              {p.tricherie
                                ? <span className="flex items-center gap-1 text-red-500 text-xs"><AlertTriangle className="w-3 h-3" />{p.tabSwitches}</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── LEADS ── */}
      {tab === 'leads' && (() => {
        const bySession = leadsSession === 'all' ? leads : leads.filter(l => l.examenBlancId === leadsSession);
        const prospects = bySession.filter(l => !l.isRegistered);
        const registered = bySession.filter(l => l.isRegistered);
        const byStatus = leadsFilter === 'prospects' ? prospects : leadsFilter === 'registered' ? registered : bySession;
        const filtered = byStatus.filter(l => {
          if (scoreFilter === 'incomplete') return !l.isCompleted;
          if (!l.isCompleted || l.score == null) return scoreFilter === 'all';
          if (scoreFilter === 'lt30') return l.score < 30;
          if (scoreFilter === '30-50') return l.score >= 30 && l.score < 50;
          if (scoreFilter === '50-65') return l.score >= 50 && l.score < 65;
          if (scoreFilter === 'gt65') return l.score >= 65;
          return true;
        });
        return (
        <div className="space-y-4">
          {/* Filtre session */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Session :</span>
            <button onClick={() => { setLeadsSession('all'); setLeadsFilter('all'); setScoreFilter('all'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${leadsSession === 'all' ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              Toutes ({leads.length})
            </button>
            {sessions.map(s => (
              <button key={s.id} onClick={() => { setLeadsSession(s.id); setLeadsFilter('all'); setScoreFilter('all'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${leadsSession === s.id ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {s.title} ({leads.filter(l => l.examenBlancId === s.id).length})
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-500" /> Participants ({bySession.length})
              <span className="text-xs font-normal text-muted-foreground">— {prospects.length} prospects · {registered.length} inscrits{leadsSession !== 'all' ? ` · ${sessions.find(s => s.id === leadsSession)?.title}` : ''}</span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'prospects', 'registered'] as const).map(f => (
                <button key={f} onClick={() => { setLeadsFilter(f); setScoreFilter('all'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${leadsFilter === f ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {f === 'all' ? `Tous (${bySession.length})` : f === 'prospects' ? `Prospects (${prospects.length})` : `Inscrits (${registered.length})`}
                </button>
              ))}
              {leadsFilter === 'prospects' && (<>
                <div className="w-px h-5 bg-border" />
                {([['all','Tous scores'],['incomplete','Non terminé'],['lt30','< 30%'],['30-50','30-50%'],['50-65','50-65%'],['gt65','> 65%']] as const).map(([f, label]) => (
                  <button key={f} onClick={() => setScoreFilter(f as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${scoreFilter === f ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {label}
                  </button>
                ))}
              </>)}
              {filtered.filter(l => !l.isRegistered && l.telephone).length > 0 && (
                <button onClick={() => { setSendQueue(filtered.filter(l => !l.isRegistered && l.telephone)); setSendIdx(0); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white hover:opacity-80 transition bg-[#25D366]">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Envoyer à tous ({filtered.filter(l => !l.isRegistered && l.telephone).length})
                </button>
              )}
              <button onClick={exportLeadsCsv}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white hover:opacity-80 transition"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                <Download className="w-4 h-4" /> CSV
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} participant(s) affiché(s)</p>

          {/* Panneau envoi séquentiel */}
          {sendQueue && sendIdx < sendQueue.length && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center space-y-5">
                <p className="text-xs text-muted-foreground">{sendIdx + 1} / {sendQueue.length}</p>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-[#25D366] h-1.5 rounded-full transition-all" style={{ width: `${((sendIdx + 1) / sendQueue.length) * 100}%` }} />
                </div>
                <div>
                  <p className="font-black text-foreground text-xl">{sendQueue[sendIdx].prenom} {sendQueue[sendIdx].nom}</p>
                  <p className="text-muted-foreground text-sm">{sendQueue[sendIdx].telephone} · {sendQueue[sendIdx].ville}</p>
                  <p className="text-xs mt-1">{sendQueue[sendIdx].lang === 'ar' ? '🇲🇷 AR' : '🇫🇷 FR'} · {sendQueue[sendIdx].isCompleted ? `${sendQueue[sendIdx].score?.toFixed(1)}%` : 'Non terminé'}</p>
                </div>
                <a href={buildWhatsAppUrl(sendQueue[sendIdx])} target="_blank" rel="noreferrer"
                  onClick={() => setTimeout(() => setSendIdx(i => i + 1), 800)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-white bg-[#25D366] hover:opacity-90 transition text-sm">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Envoyer sur WhatsApp
                </a>
                <div className="flex gap-2">
                  <button onClick={() => setSendIdx(i => i + 1)}
                    className="flex-1 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition">
                    Passer →
                  </button>
                  <button onClick={() => { setSendQueue(null); setSendIdx(0); }}
                    className="flex-1 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition">
                    Terminer
                  </button>
                </div>
              </div>
            </div>
          )}
          {sendQueue && sendIdx >= sendQueue.length && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
                <div className="text-4xl">✅</div>
                <p className="font-black text-foreground text-xl">Envoi terminé !</p>
                <p className="text-muted-foreground text-sm">{sendQueue.length} messages envoyés</p>
                <button onClick={() => { setSendQueue(null); setSendIdx(0); }}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white hover:opacity-90 transition"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                  Fermer
                </button>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div>
              <table className="w-full text-xs">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    {['Statut', 'Nom complet', 'Téléphone', 'Wilaya', 'Lg', 'Score', 'Rang', 'Résultats vus', 'WA', 'Temps'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Aucun participant</td></tr>
                  ) : filtered.map((l: any) => (
                    <tr key={l.id} className={`border-t border-border hover:bg-muted/50 ${l.isRegistered ? '' : 'bg-amber-50/30 dark:bg-amber-900/5'}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {l.isRegistered
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="w-3 h-3" />Inscrit</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Prospect</span>}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{l.prenom} {l.nom}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground text-xs whitespace-nowrap">{l.telephone}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{l.ville}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap">{l.lang === 'ar' ? '🇲🇷' : '🇫🇷'}</td>
                      <td className="px-3 py-2.5 font-bold text-violet-600 whitespace-nowrap">{l.score != null ? `${l.score.toFixed(1)}%` : '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{l.classement ? `${l.classement}/${l.totalParticipants}` : '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {l.resultsViewedAt
                          ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold"><Eye className="w-3.5 h-3.5" />{new Date(l.resultsViewedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {!l.isRegistered && l.telephone ? (
                          <a href={buildWhatsAppUrl(l)} target="_blank" rel="noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/25 transition"
                            title={`Message WhatsApp — ${l.prenom}`}>
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        ) : <span />}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{l.timeTaken ? formatTime(l.timeTaken) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function TestButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');

  const handleTest = async () => {
    setLoading(true);
    try {
      const { data } = await examenBlancApi.adminTestSession(sessionId, lang);
      localStorage.setItem('examen_blanc_test_state', JSON.stringify({
        sessionId: data.sessionId,
        examenBlancId: data.examenBlancId,
        isTest: true,
        durationMin: data.durationMin,
        totalQ: data.totalQ,
        startedAt: data.startedAt,
        endsAt: data.endsAt,
        resultsAt: data.resultsAt,
        participant: data.participant,
        questions: data.questions,
        answers: {},
      }));
      window.open('/examen-blanc/exam?mode=test', '_blank');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors du démarrage du test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={handleTest} disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-l-lg bg-amber-50 text-amber-700 border border-amber-300 text-xs font-semibold hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700 transition disabled:opacity-50">
        <FlaskConical className="w-3.5 h-3.5" />
        {loading ? '...' : 'Tester'}
      </button>
      <select value={lang} onChange={(e) => setLang(e.target.value as 'fr' | 'ar')}
        className="px-1.5 py-1.5 rounded-r-lg bg-amber-50 text-amber-700 border border-l-0 border-amber-300 text-xs font-semibold focus:outline-none hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700 transition">
        <option value="fr">FR</option>
        <option value="ar">AR</option>
      </select>
    </div>
  );
}

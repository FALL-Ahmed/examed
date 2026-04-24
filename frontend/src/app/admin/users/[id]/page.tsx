'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Calendar,
  CheckCircle, Clock, XCircle, FileImage, ExternalLink, X,
  RotateCcw, ToggleLeft, ToggleRight, Trash2, Target, Zap, Star, BarChart2, KeyRound,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

const PROFESSION_LABELS: Record<string, string> = {
  etudiant_infirmier: 'Étudiant infirmier', etudiant_medecine: 'Étudiant médecine',
  etudiant_pharmacie: 'Étudiant pharmacie', infirmier_diplome: 'Infirmier diplômé',
  aide_soignant: 'Aide-soignant', medecin: 'Médecin', sage_femme: 'Sage-femme',
  technicien_labo: 'Technicien labo', autre: 'Autre',
};

const MODE_LABELS: Record<string, { label: string; color: string }> = {
  PRACTICE: { label: 'Entraînement', color: 'bg-blue-100 text-blue-700' },
  EXAM:     { label: 'Examen',       color: 'bg-purple-100 text-purple-700' },
  REVIEW:   { label: 'Révision',     color: 'bg-amber-100 text-amber-700' },
};

function ReceiptModal({ url, onClose }: { url: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().endsWith('.pdf');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
          <span className="font-semibold text-sm text-slate-700">Reçu de paiement</span>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition">
              <ExternalLink className="w-3.5 h-3.5" /> Ouvrir
            </a>
            <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-200 flex items-center justify-center transition text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-6">
          {isPdf
            ? <iframe src={url} className="w-full h-[70vh] rounded-xl border shadow" title="Reçu PDF" />
            : <img src={url} alt="Reçu" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg" />}
        </div>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<'profil' | 'activite' | 'paiements' | 'appareils'>('profil');
  const [pwdModal, setPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data } = await adminApi.getUser(id);
    setUser(data);
    setLoading(false);
  }

  async function toggle() {
    setProcessing(true);
    await adminApi.toggleUser(id).catch(() => {});
    await load();
    setProcessing(false);
  }

  async function resetSub() {
    if (!confirm('Remettre cet utilisateur en attente de renouvellement ?')) return;
    setProcessing(true);
    await adminApi.resetSubscription(id).catch(() => {});
    await load();
    setProcessing(false);
  }

  async function changePassword() {
    if (!newPwd.trim()) return;
    setPwdLoading(true);
    await adminApi.changePassword(id, newPwd).catch(() => {});
    setPwdLoading(false);
    setPwdModal(false);
    setNewPwd('');
  }

  async function grantPremium() {
    const input = prompt('Durée en jours (ex: 30, 90) :');
    if (!input) return;
    const days = parseInt(input);
    if (!days || days < 1) return;
    setProcessing(true);
    await adminApi.grantPremium(id, days).catch(() => {});
    await load();
    setProcessing(false);
  }

  async function deleteUser() {
    if (!confirm(`Supprimer définitivement "${user.fullName}" ? Cette action est irréversible.`)) return;
    setProcessing(true);
    await adminApi.deleteUser(id).catch(() => {});
    router.push('/admin/users');
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <div className="text-center py-32 text-slate-400">Utilisateur introuvable</div>;

  const subEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
  const daysLeft = subEnd ? Math.ceil((subEnd.getTime() - Date.now()) / 86400000) : null;
  const roleLabel = user.role === 'PREMIUM' ? 'Validé' : user.role === 'ADMIN' ? 'Admin' : 'En attente';
  const roleCls = user.role === 'PREMIUM' ? 'bg-emerald-100 text-emerald-700' : user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
  const act = user.activity;

  const TABS = [
    { key: 'profil',    label: 'Profil' },
    { key: 'activite',  label: 'Activité' },
    { key: 'paiements', label: `Paiements (${user.payments?.length ?? 0})` },
    { key: 'appareils', label: `Appareils (${user.trustedDevices?.length ?? 0})` },
  ];

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/admin/users')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex items-center gap-2">
          {user.role === 'FREE' && (
            <button onClick={grantPremium} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50">
              <CheckCircle className="w-3.5 h-3.5" /> Activer Premium
            </button>
          )}
          {user.role === 'PREMIUM' && (
            <button onClick={resetSub} disabled={processing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-amber-200 text-amber-600 hover:bg-amber-50 transition disabled:opacity-50">
              <RotateCcw className="w-3.5 h-3.5" /> Remettre en attente
            </button>
          )}
          <button onClick={toggle} disabled={processing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
            {user.isActive ? <ToggleRight className="w-3.5 h-3.5 text-green-500" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {user.isActive ? 'Désactiver' : 'Activer'}
          </button>
          <button onClick={() => { setNewPwd(''); setPwdModal(true); }} disabled={processing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
            <KeyRound className="w-3.5 h-3.5" /> Mot de passe
          </button>
          <button onClick={deleteUser} disabled={processing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" /> Supprimer
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user.fullName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-slate-900">{user.fullName}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleCls}`}>{roleLabel}</span>
              {!user.isActive && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Désactivé</span>}
            </div>
            {user.pseudo && <p className="text-slate-400 text-sm">@{user.pseudo}</p>}
            {act?.lastSeen && (
              <p className="text-xs text-slate-400 mt-1">
                Dernière activité : {new Date(act.lastSeen).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Mini KPIs */}
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[
            { icon: Zap,       label: 'Tentatives',     value: user._count?.attempts ?? 0 },
            { icon: Target,    label: 'Précision',      value: act ? `${act.accuracyRate}%` : '—' },
            { icon: BarChart2, label: 'Score moyen',    value: act ? `${act.avgScore}%` : '—' },
            { icon: Star,      label: 'Favoris',        value: act?.favorites ?? 0 },
          ].map((k) => (
            <div key={k.label} className="bg-slate-50 rounded-xl p-3 text-center">
              <k.icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-xl font-black text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {subEnd && (
          <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
            daysLeft !== null && daysLeft <= 7 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            Abonnement jusqu'au {subEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            {daysLeft !== null && <span className="ml-1 opacity-70">({daysLeft <= 0 ? 'expiré' : `${daysLeft}j restants`})</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 text-sm font-semibold py-2 rounded-xl transition ${tab === t.key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Profil */}
      {tab === 'profil' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Mail,      label: 'Email',      value: user.email },
              { icon: Phone,     label: 'Téléphone',  value: user.phone || '—' },
              { icon: User,      label: 'Sexe',       value: user.gender === 'masculin' ? 'Masculin' : user.gender === 'feminin' ? 'Féminin' : '—' },
              { icon: Briefcase, label: 'Profession', value: PROFESSION_LABELS[user.profession] || user.profession || '—' },
              { icon: MapPin,    label: 'Wilaya',     value: user.wilaya || '—' },
              { icon: Calendar,  label: 'Inscrit le', value: new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <f.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{f.label}</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Activité */}
      {tab === 'activite' && (
        <div className="space-y-4">
          {/* Stats globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Réponses données',  value: act?.totalAnswers?.toLocaleString() ?? '0' },
              { label: 'Réponses correctes', value: act?.correctAnswers?.toLocaleString() ?? '0' },
              { label: 'Taux de précision', value: act ? `${act.accuracyRate}%` : '—' },
              { label: 'Score moyen',       value: act ? `${act.avgScore}%` : '—' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-black text-slate-800">{k.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Top sous-thèmes */}
          {act?.topSubThemes?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Sous-thèmes les plus pratiqués</h3>
              <div className="space-y-3">
                {act.topSubThemes.map((ts: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{ts.subTheme?.name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{ts.subTheme?.theme?.name ?? ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-800">{ts.avgScore}%</p>
                      <p className="text-xs text-slate-400">{ts.attempts} session{ts.attempts > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique tentatives */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Dernières sessions ({user.attempts?.length ?? 0})</h3>
            </div>
            {!user.attempts?.length ? (
              <p className="text-center text-slate-400 text-sm py-10">Aucune session</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {user.attempts.map((a: any) => {
                  const mode = MODE_LABELS[a.mode] ?? { label: a.mode, color: 'bg-slate-100 text-slate-600' };
                  const pct = a.totalQ > 0 ? Math.round((a.correctQ / a.totalQ) * 100) : 0;
                  return (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mode.color}`}>{mode.label}</span>
                          {a.subTheme && <span className="text-xs text-slate-500 truncate">{a.subTheme.theme?.name} › {a.subTheme.name}</span>}
                        </div>
                        <p className="text-xs text-slate-400">{new Date(a.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {a.isCompleted ? (
                          <>
                            <p className="text-sm font-black text-slate-800">{pct}%</p>
                            <p className="text-xs text-slate-400">{a.correctQ}/{a.totalQ}</p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Incomplète</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Paiements */}
      {tab === 'paiements' && (
        <div className="space-y-3">
          {!user.payments?.length ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-14 text-center">
              <p className="text-slate-400 text-sm">Aucun paiement soumis</p>
            </div>
          ) : user.payments.map((p: any) => {
            const receiptUrl = p.receiptUrl ? (p.receiptUrl.startsWith('http') ? p.receiptUrl : `${API_URL}${p.receiptUrl}`) : null;
            const statusMap: Record<string, { label: string; cls: string; icon: any }> = {
              PENDING:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700', icon: Clock },
              VALIDATED: { label: 'Validé',     cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
              REJECTED:  { label: 'Rejeté',     cls: 'bg-red-100 text-red-600', icon: XCircle },
            };
            const st = statusMap[p.status] ?? statusMap.PENDING;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-5">
                {receiptUrl ? (
                  <button onClick={() => setPreviewUrl(receiptUrl)}
                    className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 hover:border-blue-400 transition group relative">
                    <img src={receiptUrl} alt="Reçu" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </button>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <FileImage className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-lg font-black text-slate-900">{p.amount} MRU</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    {p.planType && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{p.planType}</span>}
                    {p.operator && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{p.operator}</span>}
                  </div>
                  <p className="text-xs text-slate-400">Soumis le {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {p.validatedAt && <p className="text-xs text-emerald-600 mt-0.5">Validé le {new Date(p.validatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                  {p.rejectionReason && <p className="text-xs text-red-500 mt-0.5">Raison : {p.rejectionReason}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Appareils */}
      {tab === 'appareils' && (
        <div className="space-y-2">
          {!user.trustedDevices?.length ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-10 text-center">
              <p className="text-slate-400 text-sm">Aucun appareil enregistré</p>
            </div>
          ) : user.trustedDevices.map((d: any) => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{d.deviceName}</p>
                  <p className="text-xs text-slate-400">
                    Ajouté {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {d.lastUsedAt && ` · Dernière utilisation ${new Date(d.lastUsedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
              </div>
              <button onClick={async () => { if (!confirm('Révoquer cet appareil ?')) return; await adminApi.revokeDevice(d.id).catch(() => {}); load(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" /> Révoquer
              </button>
            </div>
          ))}
        </div>
      )}

      {previewUrl && <ReceiptModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}

      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPwdModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Changer le mot de passe</h2>
            <p className="text-xs text-slate-500 mb-4">{user.fullName} — {user.email}</p>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && changePassword()}
              placeholder="Nouveau mot de passe"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPwdModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">
                Annuler
              </button>
              <button onClick={changePassword} disabled={!newPwd.trim() || pwdLoading}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50">
                {pwdLoading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useLang } from '@/components/LanguageProvider';
import { examenBlancApi } from '@/lib/api';
import { ClipboardList, Trophy, Clock, Users, Play, RefreshCw, Loader2, ChevronDown, ChevronUp, Eye, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const WILAYAS = ['Nouakchott','Nouadhibou','Rosso','Kaédi','Zouerate','Kiffa','Tidjikja','Atar','Aleg','Sélibaby','Aioun','Néma','Akjoujt','Boutilimit','Autre'];

const TARGET_LABEL: Record<string, Record<string, string>> = {
  INFIRMIER:  { fr: 'Infirmier',  ar: 'ممرض' },
  SAGE_FEMME: { fr: 'Sage-femme', ar: 'قابلة' },
  BIOLOGISTE: { fr: 'Biologiste', ar: 'بيولوجي' },
};

const TARGET_COLOR: Record<string, string> = {
  INFIRMIER: '#8b5cf6',
  SAGE_FEMME: '#ec4899',
  BIOLOGISTE: '#10b981',
};

function translateTitle(title: string, ar = false) {
  if (!ar) return title;
  return title
    .replace('Examen Blanc National Final', 'الامتحانات التجريبية الوطنية النهائية')
    .replace('Examen Blanc National', 'الامتحانات التجريبية الوطنية')
    .replace('N°', 'رقم ');
}

function formatDate(d: string, ar = false) {
  return new Date(d).toLocaleDateString(ar ? 'ar-MA' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ScoreBadge({ score }: { score: number }) {
  const isGood = score >= 70, isMed = score >= 50;
  const cls = isGood
    ? 'text-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-500/30'
    : isMed
    ? 'text-amber-600 bg-amber-500/10 ring-1 ring-amber-500/30'
    : 'text-red-500 bg-red-500/10 ring-1 ring-red-500/20';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold tabular-nums ${cls}`}>
      {score.toFixed(1)}%
    </span>
  );
}

interface Attempt { sessionId: string; participantId: string; score: number; rank: number; total: number; date: string }
interface EB {
  id: string; title: string; target: string; startsAt: string; endsAt: string; resultsAt: string;
  totalQ: number; durationMin: number; participantCount: number;
  myBestScore: number | null; myBestRank: number | null; myAttempts: Attempt[];
}

export default function HistoriqueEBPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const profession = (user as any)?.profession || '';
  const target = profession.includes('sage') || profession.includes('femme')
    ? 'SAGE_FEMME'
    : profession.includes('bio')
    ? 'BIOLOGISTE'
    : 'INFIRMIER';

  const { t, isRTL } = useLang();
  const userPhone = (user as any)?.phone || '';
  const accentColor = TARGET_COLOR[target] || '#8b5cf6';

  const [ebs, setEbs] = useState<EB[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [modal, setModal] = useState<{ eb: EB; mode: 'start' | 'retry' } | null>(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', ville: '', lang: 'fr' });
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState('');

  function loadHistory(phone?: string) {
    setLoading(true);
    examenBlancApi.history(target, phone || undefined)
      .then(r => setEbs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadHistory(userPhone || undefined);
  }, [target, userPhone]);

  function openModal(eb: EB, mode: 'start' | 'retry') {
    setForm({ nom: '', prenom: '', telephone: userPhone || '', ville: '', lang: 'fr' });
    setFormError('');
    setModal({ eb, mode });
  }

  async function handleStart() {
    if (!form.nom.trim() || !form.prenom.trim() || !form.telephone.trim() || !form.ville) {
      setFormError(t('eb.required'));
      return;
    }
    setFormError('');
    setStarting(true);
    try {
      const { data } = await examenBlancApi.registerPast({
        nom: form.nom, prenom: form.prenom, telephone: form.telephone,
        ville: form.ville, examenBlancId: modal!.eb.id, lang: form.lang,
      });
      const state = {
        sessionId: data.sessionId, participantId: data.participantId,
        examenBlancId: data.examenBlancId, durationMin: data.durationMin,
        totalQ: data.totalQ, startsAt: data.startsAt, endsAt: data.endsAt,
        resultsAt: data.resultsAt, startedAt: data.startedAt,
        isCompleted: false, isRetry: true, target: data.target,
        lang: form.lang, participant: data.participant, questions: data.questions, answers: {},
      };
      localStorage.setItem('examen_blanc_state', JSON.stringify(state));
      router.push(`/examen-blanc/exam?target=${data.target.toLowerCase().replace('_', '-')}`);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Erreur lors du démarrage');
    } finally {
      setStarting(false);
    }
  }

  const participated = ebs.filter(e => e.myAttempts.length > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}18` }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentColor }} />
          </div>
          <p className="text-sm text-muted-foreground">{t('eb.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Hero header */}
      <div className="relative rounded-2xl overflow-hidden p-6" style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}08 100%)`, border: `1px solid ${accentColor}20` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor }}>{t('eb.title')}</span>
            </div>
            <h1 className="text-2xl font-bold">{TARGET_LABEL[target]?.[isRTL ? 'ar' : 'fr'] || target}</h1>
            <p className="text-sm text-muted-foreground mt-1">{ebs.length} {ebs.length !== 1 ? t('eb.sessions_pl') : t('eb.sessions')}</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{participated}</p>
              <p className="text-xs text-muted-foreground">{t('eb.completed')}</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">{ebs.length - participated}</p>
              <p className="text-xs text-muted-foreground">{t('eb.remaining')}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Liste */}
      {ebs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('eb.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {ebs.map((eb, idx) => {
            const isExpanded = expanded === eb.id;
            const hasDone = eb.myAttempts.length > 0;
            const now = new Date();
            const isPast = now > new Date(eb.endsAt);
            const resultsReady = now >= new Date(eb.resultsAt);
            const number = ebs.length - idx;

            return (
              <div key={eb.id} className={`rounded-2xl overflow-hidden transition-all border ${hasDone ? 'bg-card border-border' : 'bg-card border-border'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Numéro + statut */}
                    <div className="flex-shrink-0 mt-0.5">
                      {hasDone
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-muted-foreground/30" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-muted-foreground">#{number}</span>
                            <p className="font-semibold text-sm truncate">{translateTitle(eb.title, isRTL)}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{formatDate(eb.endsAt, isRTL)}</span>
                            {isPast
                              ? <span className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-semibold">{t('eb.ended')}</span>
                              : <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-semibold">{t('eb.ongoing')}</span>
                            }
                          </div>
                        </div>
                        {hasDone && eb.myBestScore !== null && (
                          <ScoreBadge score={eb.myBestScore} />
                        )}
                      </div>

                      {/* Méta stats */}
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{eb.participantCount}</span>
                        <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" />{eb.totalQ} Q</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{eb.durationMin} min</span>
                        {hasDone && eb.myAttempts.length > 1 && (
                          <span className="flex items-center gap-1 text-primary font-medium">{eb.myAttempts.length} {t('eb.attempts')}</span>
                        )}
                      </div>

                      {/* Classement */}
                      {hasDone && eb.myBestRank !== null && resultsReady && (
                        <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                          <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black tabular-nums leading-none" style={{ color: accentColor }}>#{eb.myBestRank}</span>
                            <span className="text-xs text-muted-foreground font-medium">{t('eb.on')} {eb.myAttempts[0]?.total} {t('eb.participants')}</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <button
                          onClick={() => openModal(eb, hasDone ? 'retry' : 'start')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ background: accentColor }}
                        >
                          {hasDone ? <RefreshCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          {hasDone ? t('eb.retry') : t('eb.start')}
                        </button>
                        {hasDone && resultsReady && eb.myAttempts[0] && (
                          <button
                            onClick={() => {
                              const att = eb.myAttempts[0];
                              localStorage.setItem('examen_blanc_state', JSON.stringify({ sessionId: att.sessionId, participantId: att.participantId, isCompleted: true, target: eb.target }));
                              router.push('/examen-blanc/results');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-secondary/50 hover:bg-secondary transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {t('eb.view_results')}
                          </button>
                        )}
                        {eb.myAttempts.length > 1 && (
                          <button
                            onClick={() => setExpanded(isExpanded ? null : eb.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition ml-auto"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {t('eb.history')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tentatives détaillées */}
                {isExpanded && (
                  <div className="border-t border-border bg-secondary/30">
                    {eb.myAttempts.map((att, i) => (
                      <div key={att.sessionId} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0">
                        <span className="text-xs text-muted-foreground font-mono w-5">#{i + 1}</span>
                        <ScoreBadge score={att.score ?? 0} />
                        {resultsReady && <span className="text-xs text-muted-foreground">{t('eb.rank')} #{att.rank} / {att.total}</span>}
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(att.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}</span>
                        {resultsReady && (
                          <button
                            onClick={() => {
                              localStorage.setItem('examen_blanc_state', JSON.stringify({ sessionId: att.sessionId, participantId: att.participantId, isCompleted: true, target: eb.target }));
                              router.push('/examen-blanc/results');
                            }}
                            className="text-xs font-semibold hover:underline"
                            style={{ color: accentColor }}
                          >
                            {t('eb.view')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div className="px-5 py-4 border-b border-border" style={{ background: `${accentColor}0a` }}>
              <div className="flex items-center gap-2">
                {modal.mode === 'retry' ? <RefreshCw className="w-4 h-4" style={{ color: accentColor }} /> : <Play className="w-4 h-4" style={{ color: accentColor }} />}
                <p className="font-bold text-sm">{modal.mode === 'retry' ? t('eb.modal_retry') : t('eb.modal_start')}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 pl-6">{translateTitle(modal.eb.title, isRTL)}</p>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder={isRTL ? 'الاسم الأول' : 'Prénom'} value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                  className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" placeholder={isRTL ? 'اللقب' : 'Nom'} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <input type="tel" placeholder={isRTL ? 'الهاتف' : 'Téléphone'} value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              <select value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">{isRTL ? 'اختر الولاية' : 'Choisir une wilaya'}</option>
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {target !== 'BIOLOGISTE' && (
                <div className="grid grid-cols-2 gap-2">
                  {['fr', 'ar'].map(l => (
                    <button key={l} onClick={() => setForm(f => ({ ...f, lang: l }))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.lang === l ? 'border-transparent text-white' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                      style={form.lang === l ? { background: accentColor } : {}}>
                      {l === 'fr' ? '🇫🇷 Français' : '🇸🇦 العربية'}
                    </button>
                  ))}
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition">
                  {t('eb.cancel')}
                </button>
                <button onClick={handleStart} disabled={starting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: accentColor }}>
                  {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {t('eb.launch')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { concoursApi, examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import {
  ConcoursShell, Spinner, PROFESSION, WILAYAS, WILAYAS_AR, CONCOURS_STATE_KEY, WINNERS_COUNT, concoursHome, concoursTheme, readConcoursState,
} from '../_shared';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = searchParams.get('target') === 'SAGE_FEMME' ? 'SAGE_FEMME' : 'INFIRMIER';
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const th = concoursTheme(target);

  const [session, setSession] = useState<any>(undefined);
  const [formLang, setFormLang] = useState<'fr' | 'ar'>(isAr ? 'ar' : 'fr');
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', ville: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    concoursApi.current(target).then((r) => {
      const s = r.data.session;
      // Déjà inscrit à ce concours sur cet appareil → reprendre là où on en était
      const saved = readConcoursState();
      if (s && saved?.examenBlancId === s.id) {
        router.replace(saved.isCompleted ? '/concours/results' : `/concours/exam?target=${target}`);
        return;
      }
      setSession(s);
    }).catch(() => setSession(null));
  }, [target, router]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const t = (fr: string, ar: string) => (formLang === 'ar' ? ar : fr);

  async function handleSubmit() {
    setError('');
    if (!form.prenom.trim()) return setError(t('Prénom requis', 'الاسم الأول مطلوب'));
    if (!form.nom.trim()) return setError(t('Nom requis', 'اللقب مطلوب'));
    if (form.telephone.replace(/\D/g, '').length < 8) return setError(t('Numéro de téléphone invalide', 'رقم الهاتف غير صحيح'));
    if (!form.ville) return setError(t('Veuillez sélectionner votre wilaya', 'يرجى اختيار الولاية'));

    setSubmitting(true);
    try {
      const { data } = await examenBlancApi.register({
        nom: form.nom.trim(), prenom: form.prenom.trim(), telephone: form.telephone.trim(),
        ville: form.ville, examenBlancId: session.id, lang: formLang,
      });
      // Reprise d'une participation commencée : on récupère les réponses déjà données
      const answers: Record<string, string> = {};
      (data.questions ?? []).forEach((q: any) => { if (q.savedAnswer) answers[q.id] = q.savedAnswer; });
      localStorage.setItem(CONCOURS_STATE_KEY, JSON.stringify({
        sessionId: data.sessionId,
        participantId: data.participantId,
        examenBlancId: data.examenBlancId,
        durationMin: data.durationMin,
        totalQ: data.totalQ,
        startedAt: data.startedAt,
        endsAt: data.endsAt,
        resultsAt: data.resultsAt,
        participant: data.participant,
        questions: data.questions,
        target,
        answers,
      }));
      router.push(`/concours/exam?target=${target}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t('Une erreur est survenue', 'حدث خطأ، حاول مجدداً'));
      setSubmitting(false);
    }
  }

  if (session === undefined) return <Spinner target={target} />;

  const inputCls = `w-full px-4 py-3 border rounded-xl text-white focus:outline-none focus:ring-2 transition text-sm ${th.input}`;
  const labelCls = `block text-sm font-semibold mb-1.5 ${th.textDim}`;

  return (
    <ConcoursShell target={target}>
      <div className="max-w-md mx-auto px-4 pt-4 pb-16">
        <h1 className="text-2xl font-black text-white text-center">
          {isAr ? 'التسجيل في التحدي' : 'Inscription au challenge'}
        </h1>
        <p className={`${th.textMuted} text-sm text-center mt-1 mb-6`}>
          {isAr ? PROFESSION[target].ar : PROFESSION[target].fr}
          {session && <> · {session.totalQ} {isAr ? 'سؤال' : 'questions'} · {session.durationMin} min</>}
        </p>

        {!session?.isOpen ? (
          <div className={`rounded-3xl border p-7 text-center ${th.card}`}>
            <p className="text-white font-semibold">{isAr ? 'التحدي غير مفتوح حالياً' : "Le challenge n'est pas ouvert actuellement"}</p>
            <Link href={concoursHome(target)} className={`inline-block mt-4 text-sm font-semibold hover:underline ${th.accentText}`}>
              {isAr ? 'العودة' : 'Retour'}
            </Link>
          </div>
        ) : (
          <div className={`rounded-3xl border p-6 sm:p-7 space-y-4 ${th.card}`} dir={formLang === 'ar' ? 'rtl' : 'ltr'}>
            {error && (
              <div role="alert" className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div>
              <p className={labelCls}>{t('Langue des questions', 'لغة الأسئلة')}</p>
              <div className="grid grid-cols-2 gap-3" dir="ltr">
                {(['fr', 'ar'] as const).map((l) => (
                  <button key={l} type="button" onClick={() => setFormLang(l)}
                    className={`py-3 rounded-xl border-2 font-bold text-sm transition ${formLang === l ? th.choiceOn : th.choiceOff}`}>
                    {l === 'fr' ? '🇫🇷 Français' : '🇲🇷 العربية'}
                  </button>
                ))}
              </div>
              <p className={`${th.textFaint} text-xs mt-1.5`}>{t('Toutes les questions seront dans cette langue', 'ستكون كل الأسئلة بهذه اللغة')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={labelCls}>{t('Prénom', 'الاسم الأول')}</span>
                <input value={form.prenom} onChange={(e) => set('prenom', e.target.value)} className={inputCls} autoComplete="given-name" />
              </label>
              <label>
                <span className={labelCls}>{t('Nom', 'اللقب')}</span>
                <input value={form.nom} onChange={(e) => set('nom', e.target.value)} className={inputCls} autoComplete="family-name" />
              </label>
            </div>

            <label className="block">
              <span className={labelCls}>{t('Téléphone (WhatsApp)', 'رقم الهاتف (واتساب)')}</span>
              <input type="tel" inputMode="numeric" value={form.telephone} dir="ltr" placeholder="XX XX XX XX"
                onChange={(e) => set('telephone', e.target.value.replace(/[^0-9+\s]/g, ''))} className={inputCls} />
              <span className={`block text-xs mt-1.5 ${th.textFaint}`}>
                {WINNERS_COUNT > 0
                  ? t('Les gagnants sont contactés sur ce numéro. Une seule participation par numéro.', 'سيتم التواصل مع الفائزين على هذا الرقم. مشاركة واحدة لكل رقم.')
                  : t('Une seule participation par numéro.', 'مشاركة واحدة لكل رقم.')}
              </span>
            </label>

            <label className="block">
              <span className={labelCls}>{t('Wilaya', 'الولاية')}</span>
              {/* Liste des wilayas sur fond blanc, plus lisible que le champ sombre */}
              <select value={form.ville} onChange={(e) => set('ville', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 border-white bg-white text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/60 ${form.ville ? 'text-gray-900' : 'text-gray-500'}`}>
                <option value="" style={{ background: '#ffffff', color: '#6b7280' }}>{t('Sélectionner…', 'اختر…')}</option>
                {WILAYAS.map((w) => (
                  <option key={w} value={w} style={{ background: '#ffffff', color: '#111827' }}>{formLang === 'ar' ? WILAYAS_AR[w] ?? w : w}</option>
                ))}
              </select>
            </label>

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full mt-2 py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
              style={{ background: th.accent }}>
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> {t('Inscription…', 'جارٍ التسجيل…')}</>
                : <>{t('Commencer le challenge', 'ابدأ التحدي')} <ChevronRight className="w-5 h-5 rtl:rotate-180" /></>}
            </button>
            <p className={`text-center text-xs ${th.textFaint}`}>
              {t('Le chronomètre démarre dès que vous cliquez.', 'يبدأ العد التنازلي فور الضغط.')}
            </p>
          </div>
        )}
      </div>
    </ConcoursShell>
  );
}

export default function ConcoursRegisterPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <RegisterContent />
    </Suspense>
  );
}

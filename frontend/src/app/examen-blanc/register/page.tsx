'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { examenBlancApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { BookOpen, Loader2, ChevronRight, AlertCircle } from 'lucide-react';

const WILAYAS = [
  'Hodh Ech Chargui', 'Hodh El Gharbi', 'Assaba', 'Gorgol', 'Brakna',
  'Trarza', 'Adrar', 'Dakhlet Nouadhibou', 'Tagant', 'Guidimaka',
  'Tiris Zemmour', 'Inchiri', 'Nouakchott Ouest', 'Nouakchott Nord', 'Nouakchott Sud',
];

const WILAYAS_AR: Record<string, string> = {
  'Hodh Ech Chargui': 'الحوض الشرقي', 'Hodh El Gharbi': 'الحوض الغربي',
  'Assaba': 'العصابة', 'Gorgol': 'كركول', 'Brakna': 'البراكنة',
  'Trarza': 'الترارزة', 'Adrar': 'آدرار', 'Dakhlet Nouadhibou': 'داخلة نواذيبو',
  'Tagant': 'التاكانت', 'Guidimaka': 'كيدي ماغا', 'Tiris Zemmour': 'تيرس زمور',
  'Inchiri': 'إنشيري', 'Nouakchott Ouest': 'نواكشوط الغربية',
  'Nouakchott Nord': 'نواكشوط الشمالية', 'Nouakchott Sud': 'نواكشوط الجنوبية',
};

const EB_STATE_KEY = 'examen_blanc_state';

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const examenBlancId = searchParams.get('id') || '';

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formLang, setFormLang] = useState<'fr' | 'ar'>('fr');
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', ville: '' });
  const isFormAr = formLang === 'ar';

  useEffect(() => {
    // Check if already registered
    const saved = localStorage.getItem(EB_STATE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.sessionId && state.examenBlancId) {
          router.replace('/examen-blanc/exam');
          return;
        }
      } catch {}
    }

    // Load session info
    examenBlancApi.current().then(r => {
      setSession(r.data.session);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit() {
    setError('');
    if (!form.prenom.trim()) return setError(isFormAr ? 'الاسم الأول مطلوب' : 'Prénom requis');
    if (!form.nom.trim()) return setError(isFormAr ? 'اللقب مطلوب' : 'Nom requis');
    if (!form.telephone.trim()) return setError(isFormAr ? 'رقم الهاتف مطلوب' : 'Numéro de téléphone requis');
    if (!form.ville) return setError(isFormAr ? 'يرجى اختيار الولاية' : 'Veuillez sélectionner votre wilaya');

    const id = examenBlancId || session?.id;
    if (!id) return setError(isFormAr ? 'لا توجد جلسة نشطة' : 'Aucune session active');

    setSubmitting(true);
    try {
      const { data } = await examenBlancApi.register({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        telephone: form.telephone.trim(),
        ville: form.ville,
        examenBlancId: id,
        lang: formLang,
      });

      localStorage.setItem(EB_STATE_KEY, JSON.stringify({
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
        answers: {},
      }));

      router.push('/examen-blanc/exam');
    } catch (err: any) {
      setError(err.response?.data?.message || (isFormAr ? 'حدث خطأ، حاول مجدداً' : 'Une erreur est survenue'));
      setSubmitting(false);
    }
  }

  const inputCls = 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition text-sm';
  const labelCls = 'block text-sm font-semibold text-white/70 mb-1.5';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
      <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/examen-blanc" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Al Bourour</span>
          </Link>
          <h1 className="text-2xl font-black text-white mb-2">
            {isAr ? '📝 تسجيل الدخول للامتحان' : '📝 Inscription à l\'examen'}
          </h1>
          {session && (
            <p className="text-white/40 text-sm">{session.title}</p>
          )}
        </div>

        {/* Session info banner */}
        {session && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 mb-6 flex flex-wrap gap-4">
            {[
              { label: isAr ? 'الأسئلة' : 'Questions', val: session.totalQ },
              { label: isAr ? 'المدة' : 'Durée', val: `${session.durationMin} min` },
              { label: isAr ? 'النتائج' : 'Résultats', val: isAr ? 'بعد 24 ساعة' : 'Dans 24h' },
            ].map(({ label, val }, i) => (
              <div key={i} className="text-center flex-1">
                <p className="text-violet-300 font-black text-lg">{val}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-7" dir={isFormAr ? 'rtl' : 'ltr'}>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">
            {isFormAr ? '👤 معلوماتك' : '👤 Vos informations'}
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">

            {/* Langue des questions — EN PREMIER */}
            <div>
              <label className={labelCls}>{isFormAr ? 'لغة الأسئلة' : 'Langue des questions'} <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-2 gap-3" dir="ltr">
                <button type="button" onClick={() => setFormLang('fr')}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${formLang === 'fr' ? 'border-violet-500 bg-violet-500/15 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}`}>
                  🇫🇷 Français
                </button>
                <button type="button" onClick={() => setFormLang('ar')}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${formLang === 'ar' ? 'border-violet-500 bg-violet-500/15 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}`}>
                  🇲🇷 العربية
                </button>
              </div>
              <p className="text-white/30 text-xs mt-1.5">
                {isFormAr ? 'ستكون جميع أسئلة الامتحان باللغة المختارة' : 'Toutes les questions de l\'examen seront dans cette langue'}
              </p>
            </div>

            <div className="border-t border-white/10" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{isFormAr ? 'الاسم الأول' : 'Prénom'} <span className="text-red-400">*</span></label>
                <input type="text" value={form.prenom} onChange={e => set('prenom', e.target.value)}
                  className={inputCls} placeholder={isFormAr ? 'محمد' : 'Mohamed'} />
              </div>
              <div>
                <label className={labelCls}>{isFormAr ? 'اللقب' : 'Nom'} <span className="text-red-400">*</span></label>
                <input type="text" value={form.nom} onChange={e => set('nom', e.target.value)}
                  className={inputCls} placeholder={isFormAr ? 'ولد أحمد' : 'Ould Ahmed'} />
              </div>
            </div>

            <div>
              <label className={labelCls}>{isFormAr ? 'رقم الهاتف' : 'Téléphone'} <span className="text-red-400">*</span></label>
              <input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)}
                className={inputCls} placeholder="+222 XX XX XX XX" dir="ltr" />
              <p className="text-white/30 text-xs mt-1.5">
                {isFormAr ? 'لإرسال نتائجك عبر واتساب' : 'Pour recevoir vos résultats via WhatsApp'}
              </p>
            </div>

            <div>
              <label className={labelCls}>{isFormAr ? 'الولاية' : 'Wilaya'} <span className="text-red-400">*</span></label>
              <select value={form.ville} onChange={e => set('ville', e.target.value)}
                className={`${inputCls} cursor-pointer`}
                style={{ WebkitAppearance: 'none' }}>
                <option value="" style={{ background: '#1f2937', color: 'white' }}>{isFormAr ? 'اختر ولايتك…' : 'Sélectionner votre wilaya…'}</option>
                {WILAYAS.map(w => (
                  <option key={w} value={w} style={{ background: '#1f2937', color: 'white' }}>
                    {isFormAr ? WILAYAS_AR[w] || w : w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full mt-6 py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {submitting
              ? <><Loader2 className="w-5 h-5 animate-spin" /> {isFormAr ? 'جارٍ التسجيل…' : 'Inscription en cours…'}</>
              : <>{isFormAr ? 'بدء الامتحان' : "Commencer l'examen"} <ChevronRight className={`w-5 h-5 ${isFormAr ? 'rotate-180' : ''}`} /></>}
          </button>

          <p className="text-center text-white/30 text-xs mt-4">
            {isFormAr
              ? 'بالتسجيل تؤكد أن هذا المشاركة شخصية وجادة'
              : 'En vous inscrivant, vous confirmez une participation sérieuse et individuelle'}
          </p>
        </div>

        <Link href="/examen-blanc" className="block text-center text-white/30 text-sm mt-4 hover:text-white/50 transition">
          ← {isAr ? 'رجوع' : 'Retour'}
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg,#0f0a2e,#1a1040,#0d1b3e)' }}>
        <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

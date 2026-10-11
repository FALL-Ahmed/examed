'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { freemiumApi } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { LanguageSwitcherLight } from '@/components/LanguageSwitcher';
import {
  BookOpen, ArrowRight, CheckCircle2, XCircle, Timer, BarChart3, RefreshCw, Languages, UserPlus, ListChecks, Target,
} from 'lucide-react';

const BRAND = 'linear-gradient(135deg,#7c3aed,#6366f1)';
const FREE = 'linear-gradient(135deg,#059669,#10b981)';

// Questions réelles de la banque (cas cliniques infirmier), reprises telles quelles
// FR : cmqdohtv5001esj35fkvrhy2j · AR : cmqdoxhxe001u14l3bitbj043
const SAMPLE = {
  fr: {
    tag: 'Cas clinique · Infirmier',
    text: "L'infirmier éduque un patient qui sort avec un plâtre au bras.",
    choices: [
      "Ne jamais introduire d'objet sous le plâtre pour se gratter.",
      "Le plâtre doit être serré le plus possible pour bien immobiliser l'os.",
      'Surveiller tout fourmillement ou perte de sensibilité des doigts.',
      "L'immobilisation doit inclure l'articulation sus et sous-jacente.",
      'En cas de plâtre humide ou cassé, il faut consulter.',
    ],
    correct: [0, 2, 3, 4],
    picked: 1, // réponse fausse cochée par l'élève dans la démonstration
    expl: 'Un plâtre trop serré risque de couper la circulation.',
  },
  ar: {
    tag: 'حالة سريرية · ممرض',
    text: 'تغيير ضمادة جرح جراحي نظيف.',
    choices: [
      'تفرض قاعدة التعقيم الانتقال من الأنظف إلى الأكثر اتساخاً.',
      'يتم التنظيف من الأعلى للأسفل ومن المركز للخارج.',
      'الضمادة الدهنية تعزز عملية تبرعم الأنسجة.',
      'نستخدم نفس الملقط لإزالة الضمادة القديمة وتنظيف الجرح.',
      'نلاحظ وجود إفرازات مصلية أو صديدية لاكتشاف العدوى.',
    ],
    correct: [0, 1, 2, 4],
    picked: 3,
    expl: 'يجب تغيير الملقط بعد إزالة الضمادة المتسخة للحفاظ على التعقيم.',
  },
};
const letters = (idx: number[]) => idx.map((i) => String.fromCharCode(65 + i)).join(', ');

function AppPreview({ isAr }: { isAr: boolean }) {
  const q = isAr ? SAMPLE.ar : SAMPLE.fr;
  return (
    <div className="relative mx-auto max-w-4xl" aria-hidden="true">
      {/* Écran */}
      <div className="rounded-t-2xl bg-gray-900 p-2 sm:p-3 shadow-2xl shadow-violet-900/20">
        <div className="rounded-xl bg-white overflow-hidden text-start" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <span className="flex items-center gap-2 text-[11px] font-bold text-gray-700">
              <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: BRAND }}>
                <BookOpen className="w-3 h-3 text-white" />
              </span>
              Al Bourour
            </span>
            <span className="text-[11px] text-gray-400 font-medium">Question 7 / 20</span>
          </div>
          <div className="grid md:grid-cols-2">
            {/* Question */}
            <div className="p-4 sm:p-5 md:border-e border-gray-100">
              <span className="inline-flex flex-wrap gap-1.5">
                <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-2.5 py-0.5">{q.tag}</span>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-0.5">
                  {isAr ? 'إجابات متعددة' : 'Réponses multiples'}
                </span>
              </span>
              <p className="text-[12px] sm:text-[13px] text-gray-800 leading-relaxed mt-3">{q.text}</p>
              <div className="mt-3 space-y-1.5">
                {q.choices.map((c, i) => {
                  const ok = q.correct.includes(i);
                  const wrong = i === q.picked;
                  return (
                    <div key={c}
                      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-[11px] sm:text-[12px]
                        ${ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold' : wrong ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                        ${ok ? 'bg-emerald-500 text-white' : wrong ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{c}</span>
                      {ok && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                      {wrong && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Correction */}
            <div className="p-4 sm:p-5 bg-slate-50/60 hidden md:block">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{isAr ? 'التصحيح' : 'Correction'}</p>
              <p className="mt-2 text-[12px] font-semibold text-emerald-700">
                {isAr ? `الإجابات الصحيحة: ${letters(q.correct)}` : `Bonnes réponses : ${letters(q.correct)}`}
              </p>
              <p className="text-[12px] text-gray-700 leading-relaxed mt-2">{q.expl}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { v: '72 %', l: isAr ? 'نجاحك' : 'Réussite' },
                  { v: '14', l: isAr ? 'سلسلة' : 'Série' },
                  { v: '#38', l: isAr ? 'ترتيبك' : 'Rang' },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg bg-white border border-gray-100 px-2 py-2 text-center">
                    <p className="text-[13px] font-extrabold text-gray-900">{s.v}</p>
                    <p className="text-[10px] text-gray-400">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Socle */}
      <div className="mx-auto h-3 sm:h-4 w-[104%] -ms-[2%] rounded-b-2xl bg-gradient-to-b from-gray-300 to-gray-400" />
      <div className="mx-auto h-1.5 w-1/4 rounded-b-xl bg-gray-400/70" />
    </div>
  );
}

export default function EssaiGratuitPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  // Campagne ouverte → inscription en essai gratuit ; sinon → questions d'essai sans compte
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => { freemiumApi.status().then((r) => setOpen(!!r.data.open)).catch(() => setOpen(false)); }, []);

  const ctaHref = open === false ? `/free-practice${isAr ? '?lang=ar' : ''}` : '/register?plan=FREEMIUM';
  const ctaLabel = open === false
    ? (isAr ? 'جرّب بعض الأسئلة' : 'Essayer des questions')
    : (isAr ? 'ابدأ مجاناً' : 'Commencer gratuitement');

  const Cta = ({ big }: { big?: boolean }) => (
    <Link href={ctaHref}
      className={`inline-flex items-center justify-center gap-2 text-white font-bold rounded-full transition hover:opacity-90 shadow-xl shadow-emerald-500/25 ${big ? 'px-10 py-4 text-base' : 'px-8 py-3.5 text-sm'}`}
      style={{ background: FREE }}>
      {ctaLabel} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
    </Link>
  );

  const included = [
    { icon: ListChecks, fr: 'Questions et cas cliniques corrigés', ar: 'أسئلة وحالات سريرية مصححة', dfr: 'Chaque question est accompagnée de sa correction expliquée.', dar: 'كل سؤال مرفق بتصحيح مشروح.' },
    { icon: Timer, fr: 'Mode examen chronométré', ar: 'وضع الامتحان المؤقت', dfr: 'Entraînez-vous dans les conditions du concours.', dar: 'تدرّب في ظروف المسابقة الحقيقية.' },
    { icon: RefreshCw, fr: 'Révision de vos erreurs', ar: 'مراجعة أخطائك', dfr: 'Revenez sur les questions ratées jusqu’à les maîtriser.', dar: 'عُد إلى الأسئلة الخاطئة حتى تتقنها.' },
    { icon: BarChart3, fr: 'Statistiques et classement', ar: 'الإحصائيات والترتيب', dfr: 'Repérez votre point faible et suivez vos progrès.', dar: 'اكتشف نقطة ضعفك وتابع تقدمك.' },
  ];
  const steps = [
    { icon: UserPlus, fr: 'Créez votre compte', ar: 'أنشئ حسابك', dfr: 'Une minute, sans paiement.', dar: 'دقيقة واحدة، بدون دفع.' },
    { icon: Target, fr: 'Choisissez votre filière', ar: 'اختر تخصصك', dfr: 'Infirmier, sage-femme ou biologiste.', dar: 'ممرض، قابلة أو بيولوجي.' },
    { icon: BookOpen, fr: 'Entraînez-vous', ar: 'ابدأ التدرب', dfr: 'Tout de suite, en français ou en arabe.', dar: 'فوراً، بالفرنسية أو العربية.' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shadow-violet-200" style={{ background: BRAND }}>
              <BookOpen className="w-4 h-4 text-white" />
            </span>
            <span className="font-extrabold text-base sm:text-lg tracking-tight">Al Bourour</span>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcherLight className="!text-gray-500 hover:!bg-gray-100 hover:!text-gray-900" />
            <Link href="/login" className="text-sm font-semibold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition whitespace-nowrap">
              {isAr ? 'تسجيل الدخول' : 'Se connecter'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-white">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#c4b5fd,transparent 60%)' }} />
        <div className="relative max-w-3xl mx-auto px-5 pt-8 sm:pt-20 pb-8 sm:pb-12 text-center">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
            🎁 {isAr ? 'تجربة مجانية' : 'Essai gratuit'}
          </span>
          <h1 className="text-[1.55rem] leading-tight sm:text-5xl md:text-6xl font-extrabold tracking-tight mt-4 sm:mt-5">
            {isAr ? 'جرّب بنك أسئلة' : 'Essayez la banque de questions'}{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#7c3aed,#6366f1)' }}>
              Al Bourour
            </span>{' '}
            {isAr ? 'مجاناً' : 'gratuitement'}
          </h1>
          <p className="text-gray-500 text-sm sm:text-lg leading-relaxed mt-3 sm:mt-6 max-w-2xl mx-auto">
            {isAr
              ? 'مئات الأسئلة والحالات السريرية المصححة، للطلاب والمترشحين لمسابقات الصحة.'
              : 'Des centaines de QCM et cas cliniques corrigés, pour les étudiants et les candidats aux concours de santé.'}
          </p>
          <div className="mt-6 sm:mt-9 flex flex-col items-center gap-3">
            <Cta big />
            <p className="text-xs text-gray-400">
              {open === false
                ? (isAr ? 'بدون حساب' : 'Sans compte')
                : (isAr ? 'بدون دفع · بدون إيصال · وصول فوري' : 'Sans paiement · sans reçu · accès immédiat')}
            </p>
          </div>
        </div>
        <div className="relative px-4 sm:px-6 pb-16">
          <AppPreview isAr={isAr} />
        </div>
      </section>

      {/* Inclus */}
      <section className="py-16 sm:py-20 px-5 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <p className="text-violet-600 text-xs font-bold uppercase tracking-widest text-center">{isAr ? 'ما يتضمنه التجربة' : "Inclus dans l'essai"}</p>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mt-3">
            {isAr ? 'كل ما تحتاجه للتحضير' : 'Tout ce qu’il faut pour vous préparer'}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {included.map((f) => (
              <div key={f.fr} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50">
                  <f.icon className="w-5 h-5 text-violet-600" />
                </span>
                <p className="font-bold mt-4">{isAr ? f.ar : f.fr}</p>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{isAr ? f.dar : f.dfr}</p>
              </div>
            ))}
          </div>
          <p className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-8">
            <Languages className="w-4 h-4 text-violet-500" />
            {isAr ? 'متوفر بالفرنسية والعربية' : 'Disponible en français et en arabe'}
          </p>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 sm:py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center">{isAr ? 'كيف يعمل؟' : 'Comment ça marche ?'}</h2>
          <ol className="grid sm:grid-cols-3 gap-6 mt-10">
            {steps.map((s, i) => (
              <li key={s.fr} className="text-center">
                <span className="relative inline-flex w-14 h-14 rounded-2xl items-center justify-center text-white shadow-lg shadow-violet-200" style={{ background: BRAND }}>
                  <s.icon className="w-6 h-6" />
                  <span className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-white border border-violet-200 text-violet-700 text-xs font-black flex items-center justify-center">{i + 1}</span>
                </span>
                <p className="font-bold mt-4">{isAr ? s.ar : s.fr}</p>
                <p className="text-sm text-gray-500 mt-1">{isAr ? s.dar : s.dfr}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-5 pb-20">
        <div className="max-w-4xl mx-auto rounded-3xl px-6 py-12 text-center text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg,#0f0a2e 0%,#1a1040 50%,#0d1b3e 100%)' }}>
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,white 1px,transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-extrabold">{isAr ? 'المسابقة تقترب. ابدأ اليوم.' : 'Le concours approche. Commencez aujourd’hui.'}</h2>
            <p className="text-white/60 mt-3">
              {isAr ? 'وعندما تكون جاهزاً، افتح أكثر من 4500 سؤال مع Premium.' : 'Et quand vous êtes prêt, débloquez plus de 4 500 questions avec Premium.'}
            </p>
            <div className="mt-8"><Cta big /></div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Al Bourour · Mauritanie
      </footer>
    </div>
  );
}

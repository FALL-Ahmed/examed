'use client';
import Link from 'next/link';

/** Bandeau ECG dessiné (quadrillage rose + tracé), pour la carte « Concours de santé » */
function EcgBanner() {
  const beat = (x: number) => `L${x},60 L${x + 8},60 L${x + 12},54 L${x + 16},60 L${x + 24},60 L${x + 27},66 L${x + 31},18 L${x + 35},78 L${x + 39},60 L${x + 52},60 L${x + 58},50 L${x + 66},60`;
  let d = 'M0,60';
  for (let x = 10; x < 400; x += 80) d += ' ' + beat(x);
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="w-full h-full" aria-hidden>
      <defs>
        <pattern id="ecg-s" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="#f9c6d3" strokeWidth="0.5" /></pattern>
        <pattern id="ecg-l" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="url(#ecg-s)" /><path d="M40 0H0V40" fill="none" stroke="#f4a3b8" strokeWidth="1" /></pattern>
      </defs>
      <rect width="400" height="120" fill="#fdf2f5" />
      <rect width="400" height="120" fill="url(#ecg-l)" />
      <path d={d} fill="none" stroke="#1f2937" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Bandeau « fonction publique » : couleurs du drapeau mauritanien */
function PublicBanner() {
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden>
      <rect width="400" height="120" fill="#00A95C" />
      <rect width="400" height="16" fill="#D01C1F" /><rect y="104" width="400" height="16" fill="#D01C1F" />
      <path d="M170 50 A30 30 0 0 0 230 50 A30 26 0 0 1 170 50 Z" fill="#FFD700" />
      <polygon fill="#FFD700" points="200,30 203.5,40 214,40 205.5,46 208.5,56 200,50 191.5,56 194.5,46 186,40 196.5,40" />
    </svg>
  );
}

type Card = { key: string; title: string; desc: string; banner: React.ReactNode; primary: { label: string; href: string }; secondary?: { label: string; href: string }; soon?: boolean };

/** Rubriques de l'accueil (style « catalogue d'examens ») : Résidanat en premier */
export function ConcoursCards({ lang }: { lang: 'fr' | 'ar' }) {
  const ar = lang === 'ar';
  const cards: Card[] = [
    {
      key: 'residanat',
      title: ar ? 'مسابقة الإقامة (Résidanat)' : 'Concours de Résidanat',
      desc: ar
        ? 'أكثر من 8000 سؤال مصحّح ومعلّق عليه في 3 وحدات: العلوم الأساسية، الأمراض الباطنية والأمراض الجراحية. المحتوى بالفرنسية.'
        : 'Plus de 8 000 QCM corrigés et commentés, répartis en 3 modules : sciences fondamentales, pathologie médicale et pathologie chirurgicale. Contenu en français.',
      banner: <img src="/images/concours/residanat.jpg" alt="" className="w-full h-full object-cover" />,
      primary: { label: ar ? 'اكتشف' : 'Découvrir', href: '/residanat' },
      secondary: { label: ar ? 'سجّل' : "S'inscrire", href: '/register?concours=residanat' },
    },
    {
      key: 'sante',
      title: ar ? 'المسابقة الوطنية للصحة' : 'Concours de santé',
      desc: ar
        ? 'أكثر من 4500 سؤال للممرضين والقابلات والبيولوجيين، بالعربية والفرنسية، مع بطاقات المراجعة والامتحانات التجريبية الوطنية.'
        : 'Plus de 4 500 QCM pour infirmiers, sages-femmes et biologistes, en français et en arabe, avec fiches mémo et examens blancs nationaux.',
      banner: <EcgBanner />,
      primary: { label: ar ? 'تجربة مجانية' : 'Essai gratuit', href: `/free-practice${ar ? '?lang=ar' : ''}` },
      secondary: { label: ar ? 'سجّل' : "S'inscrire", href: '/register?concours=sante' },
    },
    {
      key: 'fonction-publique',
      title: ar ? 'مسابقات التوظيف في الوظيفة العمومية' : 'Recrutement fonction publique',
      desc: ar
        ? 'التحضير لمسابقات التوظيف في الوظيفة العمومية الصحية: نفس بنك الأسئلة للممرضين والقابلات والبيولوجيين، بالعربية والفرنسية.'
        : 'Préparation aux concours de recrutement de la fonction publique de santé : la même banque de QCM pour infirmiers, sages-femmes et biologistes, en français et en arabe.',
      banner: <PublicBanner />,
      primary: { label: ar ? 'تجربة مجانية' : 'Essai gratuit', href: `/free-practice${ar ? '?lang=ar' : ''}` },
      secondary: { label: ar ? 'سجّل' : "S'inscrire", href: '/register?concours=fonction-publique' },
    },
  ];
  return (
    <section className="py-14 px-6 lg:px-10 bg-slate-50 border-b border-gray-100">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <div key={c.key} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="h-28 bg-gray-100 overflow-hidden">{c.banner}</div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                {c.title}
                {c.soon && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{ar ? 'قريباً' : 'Bientôt'}</span>}
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed flex-1">{c.desc}</p>
              <div className="mt-4 inline-flex self-start rounded-md overflow-hidden border border-gray-300 text-sm font-medium">
                {c.soon ? (
                  <span className="px-3 py-1.5 text-gray-400 cursor-default">{c.primary.label}</span>
                ) : (
                  <>
                    <Link href={c.primary.href} className="px-3 py-1.5 text-violet-700 hover:bg-violet-50 transition">{c.primary.label}</Link>
                    {c.secondary && (
                      <Link href={c.secondary.href} className="px-3 py-1.5 text-indigo-700 hover:bg-indigo-50 border-s border-gray-300 transition">{c.secondary.label}</Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

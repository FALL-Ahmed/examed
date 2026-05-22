'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicApi, settingsApi } from '@/lib/api';
import { ArrowRight, BarChart2, Copy, CheckCheck } from 'lucide-react';

const OPERATORS = [
  { id: 'BANKILY', name: 'Bankily', image: '/images/bankily.png' },
  { id: 'MASRIVI', name: 'Masrivi', image: '/images/masrivi.png' },
  { id: 'SEDAD',   name: 'Sedad',   image: '/images/sedad.png'   },
];

interface Props {
  score: number;
  totalQ: number;
  correctQ: number;
  themeName: string;
  subThemeName?: string;
  themeId?: string;
  subThemeId?: string;
  lang: 'fr' | 'ar';
  onRestart: () => void;
  onCtaClick?: () => void;
  sessionId?: string;
}

const BARS = [
  { val: 20, h: 4  }, { val: 25, h: 7  }, { val: 30, h: 12 },
  { val: 35, h: 20 }, { val: 40, h: 31 }, { val: 45, h: 45 },
  { val: 50, h: 61 }, { val: 55, h: 77 }, { val: 60, h: 89 },
  { val: 65, h: 97 }, { val: 70, h: 100 },{ val: 75, h: 91 },
  { val: 80, h: 75 }, { val: 85, h: 54 }, { val: 90, h: 33 },
  { val: 95, h: 17 }, { val: 100, h: 6  },
];

const THRESHOLD = 75;
const RANGE = { min: 20, max: 100 };
const toPct = (v: number) => ((v - RANGE.min) / (RANGE.max - RANGE.min)) * 100;
const clampToPct = (v: number) => toPct(Math.max(RANGE.min, Math.min(RANGE.max, v)));

function barColor(val: number): string {
  if (val <= 35) return '#dc2626';
  if (val <= 45) return '#ea580c';
  if (val <= 55) return '#f97316';
  if (val <= 62) return '#fbbf24';
  if (val <= 68) return '#a3e635';
  if (val <= 75) return '#4ade80';
  return '#16a34a';
}

export function FomoResults({ score, totalQ, correctQ, themeName, subThemeName, themeId, subThemeId, lang, onRestart, onCtaClick }: Props) {
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<{ avg: number; percentile: number; total: number; estimated?: boolean; distribution?: { min: number; h: number }[] } | null>(null);
  const [operators, setOperators] = useState<Record<string, string>>({});
  const [selectedOp, setSelectedOp] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    publicApi.nationalStats(score, themeId, subThemeId)
      .then((r) => setStats(r.data))
      .catch(() => setStats({ avg: 68, percentile: Math.round((score / 100) * 80), total: 0, estimated: true }));
    settingsApi.operators().then((r) => {
      const map: Record<string, string> = {};
      r.data.forEach((op: any) => { map[op.id] = op.phone; });
      setOperators(map);
    }).catch(() => {});
  }, [score, themeId, subThemeId]);

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone).catch(() => {});
    setCopied(phone);
    setTimeout(() => setCopied(''), 2000);
  }

  const avg = stats?.avg ?? 68;
  const pct = Math.round(score);
  const isGoodScore = pct >= 70;
  const isMidScore  = pct >= 50;
  const scoreColor  = isGoodScore ? '#10b981' : isMidScore ? '#f59e0b' : '#ef4444';
  const scoreBorder = isGoodScore ? 'border-emerald-200' : isMidScore ? 'border-amber-200' : 'border-red-200';
  const scoreBg     = isGoodScore ? 'bg-emerald-50'      : isMidScore ? 'bg-amber-50'      : 'bg-red-50';

  const NATIONAL_AVG = 60;

  return (
    <div className={`max-w-lg mx-auto space-y-4 py-6 px-4 ${isAr ? 'text-right' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── 0. Score + Motivationnel ── */}
      <div className={`rounded-2xl border ${scoreBorder} ${scoreBg} p-5 space-y-3`}>
        <div className="flex items-center justify-between gap-4">
          <div className={`flex-1 min-w-0 ${isAr ? 'text-right' : ''}`}>
            <p className="font-extrabold text-gray-900 text-base">
              {isAr ? '!🎉 لقد أتممت سلسلتك' : 'Vous venez de terminer votre série ! 🎉'}
            </p>
            <p className="font-bold text-gray-700 leading-tight mt-1">
              <span className="text-3xl font-black" style={{ color: scoreColor }}>{correctQ}</span>
              <span className="text-xl font-bold text-gray-400">/{totalQ}</span>
            </p>
            <p className="text-xs font-semibold text-gray-600 mt-1">
              📚 {themeName || '—'}{subThemeName ? ` · ${subThemeName}` : ''}
            </p>
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-md"
            style={{ background: scoreColor }}
          >
            {pct}%
          </div>
        </div>
        <div className="border-t border-current/10 pt-3 space-y-1 text-sm text-gray-700">
          <p>📈 {isAr ? `المتوسط الوطني : ` : `Moyenne nationale : `}<strong className="font-black text-violet-700">{NATIONAL_AVG}%</strong></p>
          <p>🎯 {isAr ? 'أفضل المترشحين يتجاوزون 75%' : 'Les meilleurs candidats dépassent 75%'}</p>
          <p className="font-semibold text-gray-800">
            💪 {pct < NATIONAL_AVG
              ? (isAr ? 'واصل التدريب لتحسين ترتيبك الوطني.' : 'Continuez vos entraînements pour améliorer votre classement national.')
              : (isAr ? 'واصل التدريب للحفاظ على ترتيبك الوطني.' : 'Continuez vos entraînements pour garder votre classement national.')}
          </p>
        </div>
      </div>

      {/* ── 2. HERO CTA ── */}
      <div
        className="rounded-2xl p-6 text-center text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        <p className="text-white font-extrabold text-lg mb-2">
          {isAr ? 'هل تريد النجاح في مسابقة التمريض؟ 🎯' : 'Tu veux réussir le concours infirmier ? 🎯'}
        </p>

        <p className="text-white/80 text-sm mb-6">
          {isAr
            ? '+150 مرشح موريتاني يتابعون ترتيبهم على Al Bourour.'
            : '+150 candidats mauritaniens suivent leur classement sur Al Bourour.'}
        </p>

        <Link href="/register" onClick={() => onCtaClick?.()}
          style={{ textDecoration: 'none', boxShadow: '0 6px 28px rgba(255,255,255,0.2)' }}
          className="flex items-center justify-center gap-2 rounded-2xl px-6 py-4 bg-white text-violet-700 font-black text-base w-full text-center transition active:scale-95">
          <span>🏆</span>
          <span>{isAr ? 'مشاهدة ترتيبي في موريتانيا 🇲🇷' : 'Voir mon rang en Mauritanie 🇲🇷'}</span>
          <ArrowRight className="w-4 h-4 flex-shrink-0" />
        </Link>
      </div>

      {/* ── Témoignages ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
          {isAr ? 'ماذا يقول الطلاب ؟' : 'Ils ont réussi avec Al Bourour'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(isAr ? [
            { name: 'مريم',  role: 'ممرضة متخرجة، نواكشوط',          img: '/images/ar-com-1.jpeg' },
            { name: 'سيدي',  role: 'طالب في العلوم التمريضية',        img: '/images/ar-com-2.jpeg' },
          ] : [
            { name: 'Fatimetou', role: 'Étudiante en sciences infirmières', img: '/images/fr-com-1.jpeg' },
            { name: 'Mohamed',   role: 'Étudiant en sciences infirmières',  img: '/images/fr-com-2.png'  },
          ]).map((t) => (
            <div key={t.name} className="flex flex-col items-center text-center">
              <div className="mb-2 overflow-hidden rounded-xl shadow-md w-full">
                <img src={t.img} alt={t.name} className="w-full h-auto object-contain" />
              </div>
              <p className="font-bold text-sm text-gray-900">{t.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{t.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Reste ── */}
      <div className="space-y-3">
        <Link href="/register" onClick={() => onCtaClick?.()}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-wide shadow-lg shadow-violet-500/30 transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
          {isAr ? 'فعّل حسابك الآن وتابع تطور مستواك' : 'Activez votre compte et suivez votre progression'}
          <ArrowRight className="w-4 h-4 flex-shrink-0" />
        </Link>

        {/* ── Paiement ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
            {isAr ? 'طرق الدفع' : 'Paiement via'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {OPERATORS.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setSelectedOp(selectedOp === op.id ? '' : op.id)}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${
                  selectedOp === op.id
                    ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
                    : 'border-gray-100 bg-gray-50 hover:border-violet-200'
                }`}
              >
                {selectedOp === op.id && (
                  <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-violet-500 flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
                <img src={op.image} alt={op.name} className="h-8 w-auto object-contain" />
                <span className="text-[10px] font-semibold text-gray-600">{op.name}</span>
                {operators[op.id] && (
                  <span className="text-[10px] font-black text-violet-600 tracking-wider" dir="ltr">
                    {operators[op.id].replace(/^\+?222\s*/, '')}
                  </span>
                )}
              </button>
            ))}
          </div>
          {selectedOp && operators[selectedOp] && (
            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1">
                {isAr ? 'رقم الدفع' : 'Numéro de paiement'}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-extrabold text-gray-900 tracking-wider" dir="ltr">{operators[selectedOp]}</p>
                <button type="button" onClick={() => copyPhone(operators[selectedOp])}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-violet-200 text-violet-600 hover:bg-violet-100 transition">
                  {copied === operators[selectedOp]
                    ? <><CheckCheck className="w-3.5 h-3.5" />{isAr ? 'تم' : 'Copié'}</>
                    : <><Copy className="w-3.5 h-3.5" />{isAr ? 'نسخ' : 'Copier'}</>}
                </button>
              </div>
              <p className="text-[10px] text-violet-400 mt-1">
                {isAr ? 'أرسل المبلغ ثم سجّل مع إرفاق الإيصال' : 'Envoyez le montant puis inscrivez-vous avec votre reçu'}
              </p>
            </div>
          )}
        </div>

        <button onClick={onRestart}
          className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-800 hover:border-gray-400 transition">
          {isAr ? '← إعادة المحاولة' : '← Recommencer'}
        </button>
      </div>

      {/* ── Histogramme (dernière position) ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-violet-500" />
          <p className="font-bold text-sm text-gray-800">
            {isAr ? 'إحصائيات Al Bourour' : 'Statistiques Al Bourour'}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          {isAr
            ? `المتوسط الوطني : ${avg}% — نتيجتك : ${pct}%`
            : `Moyenne nationale : ${avg}% — Votre score : ${pct}%`}
        </p>
        <div className="relative h-24 flex items-end gap-[3px] mt-6">
          <div
            className="absolute top-0 bottom-0 w-px bg-emerald-500/60 z-10"
            style={{ left: `${clampToPct(THRESHOLD)}%` }}
          >
            <span className="absolute -top-5 left-1 text-[9px] font-bold text-emerald-600 whitespace-nowrap">
              {THRESHOLD}%
            </span>
          </div>
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-violet-500 z-10"
            style={{ left: `${clampToPct(pct)}%` }}
          >
            <span className="absolute -top-5 -translate-x-1/2 text-[9px] font-bold text-violet-600 whitespace-nowrap">
              {pct}%
            </span>
          </div>
          {BARS.map((b) => (
            <div
              key={b.val}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${b.h}%`,
                background: barColor(b.val),
                opacity: b.val <= pct ? 1 : 0.25,
              }}
            />
          ))}
        </div>
        {stats && stats.total > 0 && (
          <p className="text-[10px] text-gray-400 text-center">
            {isAr ? `مبني على ${stats.total.toLocaleString()} جلسة` : `Basé sur ${stats.total.toLocaleString()} sessions`}
          </p>
        )}
      </div>
    </div>
  );
}

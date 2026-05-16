'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicApi, settingsApi } from '@/lib/api';
import { Users, ArrowRight, BarChart2, Copy, CheckCheck } from 'lucide-react';

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

export function FomoResults({ score, totalQ, correctQ, themeName, subThemeName, themeId, subThemeId, lang, onRestart, onCtaClick, sessionId }: Props) {
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<{ avg: number; percentile: number; total: number; estimated?: boolean; distribution?: { min: number; h: number }[] } | null>(null);
  const [operators, setOperators] = useState<Record<string, string>>({});
  const [selectedOp, setSelectedOp] = useState('');
  const [copied, setCopied] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waSent, setWaSent] = useState(false);
  const [waSending, setWaSending] = useState(false);

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

  const selectedPhone = selectedOp ? operators[selectedOp] : null;

  function copyPhone() {
    if (!selectedPhone) return;
    navigator.clipboard.writeText(selectedPhone).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function submitWaLead() {
    const phone = waPhone.trim().replace(/\s/g, '');
    if (!phone || waSent) return;
    setWaSending(true);
    await publicApi.saveFreeTrialLead({
      sessionId: sessionId ?? `fp-${Date.now()}`,
      phone,
      theme: themeName,
      lang,
      source: 'free-practice',
    });
    setWaSent(true);
    setWaSending(false);
  }

  const avg = stats?.avg ?? 68;
  const pct = Math.round(score);
  const isGoodScore = pct >= 70;
  const isMidScore  = pct >= 50;
  const scoreColor  = isGoodScore ? '#10b981' : isMidScore ? '#f59e0b' : '#ef4444';
  const scoreBorder = isGoodScore ? 'border-emerald-200' : isMidScore ? 'border-amber-200' : 'border-red-200';
  const scoreBg     = isGoodScore ? 'bg-emerald-50'      : isMidScore ? 'bg-amber-50'      : 'bg-red-50';

  const topPct = stats ? `${100 - stats.percentile}` : '??';

  return (
    <div className={`max-w-lg mx-auto space-y-4 py-6 px-4 ${isAr ? 'text-right' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── 1. Score ── */}
      <div className={`rounded-2xl border ${scoreBorder} ${scoreBg} p-4 flex items-center justify-between gap-4`}>
        <div className={`flex-1 min-w-0 ${isAr ? 'text-right' : ''}`}>
          <p className="text-xs text-gray-500 font-medium mb-0.5">
            {isAr ? 'نتيجتك' : 'Votre score'}
          </p>
          <p className="font-bold text-gray-700 leading-tight">
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

      {/* ── 2. HERO FOMO — Percentile ── */}
      <div
        className="rounded-2xl p-6 text-center text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-4">
          {isAr ? 'انتهت السلسلة 🎯' : 'Série terminée 🎯'}
        </p>

        <p className="text-white/80 text-sm font-medium mb-2">
          {isAr ? 'مستواك الحالي يضعك ضمن أفضل' : 'Votre niveau actuel vous classe parmi les'}
        </p>

        {/* Gros chiffre flouté */}
        <div className="flex items-center justify-center gap-1 my-1">
          {isAr && <span className="text-white/60 text-3xl font-bold">%</span>}
          <span
            className="text-8xl font-black text-white leading-none select-none pointer-events-none"
            style={{ filter: 'blur(20px)', WebkitFilter: 'blur(20px)' }}
          >{topPct}</span>
          {!isAr && <span className="text-white/60 text-3xl font-bold self-end mb-2">%</span>}
        </div>

        <p className="text-white/80 text-sm font-semibold mb-4">
          {isAr ? 'من أفضل المترشحين' : 'des meilleurs candidats'}
        </p>

        <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-white/80 text-xs font-medium">
          🔒 {isAr ? 'سجّل لرؤية رقمك الدقيق' : 'Inscrivez-vous pour révéler votre rang exact'}
        </div>
      </div>

      {/* ── 3. Stats + Histogramme ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">

        <div className={`flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-violet-600" />
          </div>
          <p className="font-bold text-gray-900 text-sm">
            {isAr ? 'إحصائيات بُرُورْ' : 'Statistiques Al Bourour'}
          </p>
        </div>

        <p className="text-sm text-gray-700">
          {isAr ? (
            <><span>متوسط الطلاب وطنياً : </span><span className="font-black text-violet-700">{avg}%</span></>
          ) : (
            <><span>Moyenne nationale : </span><span className="font-black text-violet-700">{avg}%</span></>
          )}
        </p>

        {/* Histogramme */}
        <div className="mt-2">

          {/* Label seuil 75% */}
          <div className="relative h-8 mb-1">
            <div
              className="absolute bottom-0 flex flex-col items-center pointer-events-none"
              style={isAr ? { right: `${toPct(THRESHOLD)}%`, transform: 'translateX(50%)' } : { left: `${toPct(THRESHOLD)}%`, transform: 'translateX(-50%)' }}
            >
              <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">75%</span>
              <span className="text-[9px] text-gray-400 whitespace-nowrap">{isAr ? 'عتبة القبول' : 'seuil'}</span>
            </div>
          </div>

          {/* Barres — réelles si assez de données, sinon simulées */}
          <div
            className="relative flex items-end gap-[2px]"
            style={{ height: '120px' }}
          >
            {(stats?.distribution ?? BARS.map(({ val, h }) => ({ min: val, h }))).map(({ min, h }) => (
              <div
                key={min}
                className="flex-1 rounded-t-sm"
                style={{ height: `${h}%`, background: barColor(min), minWidth: 0 }}
              />
            ))}

            {/* Ligne pointillée — seuil 75% */}
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none z-10"
              style={{
                background: 'repeating-linear-gradient(to bottom,#6b7280 0,#6b7280 4px,transparent 4px,transparent 8px)',
                ...(isAr ? { right: `${toPct(THRESHOLD)}%` } : { left: `${toPct(THRESHOLD)}%` }),
              }}
            />
          </div>

          {/* Axe X */}
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span>
          </div>

          {/* Légende */}
          <div className={`flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 ${isAr ? 'flex-row-reverse' : ''}`}>
            <span className="w-4 h-[2px] inline-block flex-shrink-0" style={{ background: 'repeating-linear-gradient(to right,#6b7280 0,#6b7280 3px,transparent 3px,transparent 6px)' }} />
            <span>{isAr ? 'عتبة القبول — 75%' : 'Seuil bon candidat — 75%'}</span>
          </div>
        </div>

        {stats && stats.total > 0 && (
          <p className="text-xs text-gray-400 text-center">
            {isAr ? `بناءً على ${stats.total} جلسة` : `Basé sur ${stats.total} sessions`}
          </p>
        )}
      </div>

      {/* ── 4. CTA ── */}
      <div className="space-y-3">
        <Link href="/register" onClick={() => onCtaClick?.()}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-wide shadow-lg shadow-violet-500/30 transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
          <Users className="w-5 h-5 flex-shrink-0" />
          {isAr ? 'فعّل حسابك الآن وتابع تطور مستواك' : 'Activez votre compte et suivez votre progression'}
          <ArrowRight className="w-4 h-4 flex-shrink-0" />
        </Link>

        {/* ── WhatsApp lead ── */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          {waSent ? (
            <div className="text-center py-2">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-extrabold text-gray-900 text-base">
                {isAr ? 'شكراً! سنتواصل معك قريباً على واتساب' : 'Merci ! On vous contactera bientôt sur WhatsApp 🎉'}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="text-lg font-extrabold text-gray-900 leading-tight">
                  {isAr ? '!أحسنت! لقد أكملت الجلسة' : 'Bien ! Vous avez terminé la session.'}
                </h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {isAr
                    ? 'لحفظ تقدمك واستلام نتيجتك، أدخل رقم واتساب الخاص بك'
                    : 'Pour sauvegarder votre progression et recevoir votre score, entrez votre numéro WhatsApp :'}
                </p>
              </div>
              <div className="space-y-3">
                <input
                  type="tel"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitWaLead()}
                  placeholder={isAr ? 'رقم واتساب (مثال: 22241000000)' : 'Numéro WhatsApp (ex: 22241000000)'}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-violet-400 text-sm font-medium text-center tracking-wider"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={submitWaLead}
                  disabled={!waPhone.trim() || waSending}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm hover:opacity-90 transition shadow-lg shadow-violet-300/40 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  {waSending ? '…' : (isAr ? 'استلام نتائجي' : 'Recevoir mes résultats')}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Paiement ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
            {isAr ? 'طرق الدفع' : 'Paiement via'}
          </p>

          {/* Logos opérateurs */}
          <div className="grid grid-cols-3 gap-2">
            {OPERATORS.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setSelectedOp(selectedOp === op.id ? '' : op.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${
                  selectedOp === op.id
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-100 bg-gray-50 hover:border-violet-200'
                }`}
              >
                <img src={op.image} alt={op.name} className="h-8 w-auto object-contain" />
                <span className="text-[10px] font-semibold text-gray-600">{op.name}</span>
              </button>
            ))}
          </div>

          {/* Numéro */}
          {selectedOp && selectedPhone && (
            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1">
                {isAr ? 'رقم الدفع' : 'Numéro de paiement'}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-extrabold text-gray-900 tracking-wider" dir="ltr">{selectedPhone}</p>
                <button type="button" onClick={copyPhone}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-violet-200 text-violet-600 hover:bg-violet-100 transition">
                  {copied
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
    </div>
  );
}

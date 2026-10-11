'use client';
import Link from 'next/link';
import { Crown, Lock, X, Check } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';

// Fenêtre affichée quand un compte freemium clique sur un contenu verrouillé
export function PremiumUpsellModal({ open, onClose, lockedCount }: { open: boolean; onClose: () => void; lockedCount?: number }) {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  if (!open) return null;

  const extra = lockedCount && lockedCount > 0 ? lockedCount.toLocaleString(isAr ? 'ar-EG' : 'fr-FR') : null;
  const perks = isAr
    ? ['كل المواضيع والمواضيع الفرعية', 'وضع الامتحان على كل الأسئلة', 'وصول حتى يوم المسابقة']
    : ['Tous les thèmes et sous-thèmes', 'Mode examen sur toutes les questions', "Accès jusqu'au jour du concours"];

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}>
        <button onClick={onClose} className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} text-muted-foreground hover:text-foreground`}
          aria-label={isAr ? 'إغلاق' : 'Fermer'}>
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-amber-500/15">
          <Lock className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-extrabold text-center">
          {isAr ? 'هذا المحتوى مخصص لـ Premium' : 'Contenu réservé Premium'}
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">
          {extra
            ? (isAr ? `انتقل إلى Premium لفتح ${extra} سؤال إضافي.` : `Passez Premium pour débloquer ${extra} questions supplémentaires.`)
            : (isAr ? 'انتقل إلى Premium لفتح كل الأسئلة.' : 'Passez Premium pour débloquer toutes les questions.')}
        </p>

        <ul className="mt-5 space-y-2">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-sm">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-emerald-600" />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <Link href="/payment" onClick={onClose}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
          <Crown className="w-4 h-4" /> {isAr ? 'الانتقال إلى Premium' : 'Passer Premium'}
        </Link>
        <button onClick={onClose} className="mt-2 w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition">
          {isAr ? 'لاحقاً' : 'Plus tard'}
        </button>
      </div>
    </div>
  );
}

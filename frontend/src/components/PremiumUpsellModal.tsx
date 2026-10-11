'use client';
import { useRouter } from 'next/navigation';
import { Crown, Lock, X, Check } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';
import { useAuthStore } from '@/lib/auth-store';

// Chiffres commerciaux identiques pour toutes les filières (choix produit), et non les comptes exacts
const UPSELL_EXTRA_QUESTIONS = 600;
const PREMIUM_TOTAL_QUESTIONS = 1000;

// Fenêtre affichée quand un compte freemium clique sur un contenu verrouillé ou atteint un palier.
// « Passer Premium » mène à la page d'abonnement (formules, paiement, reçu).
export function PremiumUpsellModal({ open, onClose, lockedCount, milestone, successRate }: {
  open: boolean; onClose: () => void; lockedCount?: number;
  milestone?: number;    // nombre de questions répondues atteint (fenêtre de félicitations)
  successRate?: number;  // % de bonnes réponses de l'élève
}) {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const { user } = useAuthStore();
  const router = useRouter();
  if (!open) return null;

  const close = () => onClose();
  const t = (fr: string, ar: string) => (isAr ? ar : fr);
  const fmt = (n: number) => n.toLocaleString(isAr ? 'ar-EG' : 'fr-FR');
  const firstName = user?.fullName?.trim().split(' ')[0];
  const trialEnd = user?.role === 'FREEMIUM' && user.subscriptionEnd
    ? new Date(user.subscriptionEnd).toLocaleDateString(isAr ? 'ar-EG' : 'fr-FR', { day: 'numeric', month: 'long' })
    : null;
  const perks = isAr
    ? ['كل المواضيع والمواضيع الفرعية', `أكثر من ${PREMIUM_TOTAL_QUESTIONS.toLocaleString('ar-EG')} سؤال`, 'وضع الامتحان بدون حدود']
    : ['Tous les thèmes et sous-thèmes', `Plus de ${PREMIUM_TOTAL_QUESTIONS.toLocaleString('fr-FR')} questions`, 'Le mode examen sans limite'];

  const ctaLabel = t('Passer Premium', 'الانتقال إلى Premium');

  const Cta = (
    <button onClick={() => { onClose(); router.push('/abonnement'); }}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition shadow-lg shadow-amber-500/25"
      style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
      <Crown className="w-4 h-4" /> {ctaLabel}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <div className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        <button onClick={close} aria-label={t('Fermer', 'إغلاق')}
          className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} z-10 w-8 h-8 rounded-full flex items-center justify-center
            ${milestone ? 'bg-white/20 text-white hover:bg-white/30' : 'text-muted-foreground hover:text-foreground'}`}>
          <X className="w-5 h-5" />
        </button>

        {milestone ? (
          <>
            {/* En-tête de félicitations */}
            <div className="relative px-6 pt-7 pb-6 text-center text-white overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#6366f1 60%,#3b82f6 100%)' }}>
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '14px 14px' }} />
              <div className="relative">
                <p className="text-5xl">🎉</p>
                <h2 className="text-xl font-black mt-2">
                  {firstName ? t(`Bravo ${firstName} !`, `أحسنت يا ${firstName}!`) : t('Bravo !', 'أحسنت!')}
                </h2>
                <p className="text-white/85 text-sm mt-1">
                  {t(`Vous avez déjà répondu à ${fmt(milestone)} questions.`, `لقد أجبت بالفعل على ${fmt(milestone)} سؤالاً.`)}
                </p>
              </div>
            </div>

            <div className="p-6">
              {/* Ses chiffres */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { v: fmt(milestone), l: t('questions', 'سؤال') },
                  { v: successRate != null ? `${fmt(successRate)} %` : '—', l: t('de réussite', 'نسبة النجاح') },
                  { v: trialEnd ?? '—', l: t("fin de l'essai", 'نهاية التجربة') },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-secondary/60 border border-border px-2 py-2.5">
                    <p className="text-sm font-extrabold leading-tight">{s.v}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mt-5">
                {t(`Vous avez pris un bon rythme : ne vous arrêtez pas là. Avec Premium, plus de ${fmt(PREMIUM_TOTAL_QUESTIONS)} questions vous attendent.`,
                  `لقد بدأت بإيقاع جيد، فلا تتوقف هنا. مع Premium، أكثر من ${fmt(PREMIUM_TOTAL_QUESTIONS)} سؤال في انتظارك.`)}
              </p>

              <ul className="mt-4 space-y-2">
                {perks.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-6">{Cta}</div>
              <button onClick={close} className="mt-2 w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition">
                {t('Continuer mon essai gratuit', 'متابعة تجربتي المجانية')}
              </button>
            </div>
          </>
        ) : (
          <div className="p-6">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-amber-500/15">
              <Lock className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-lg font-extrabold text-center">{t('Ce sous-thème est réservé Premium', 'هذا الموضوع الفرعي مخصص لـ Premium')}</h2>
            <p className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">
              {lockedCount && lockedCount > 0
                ? t(`Votre essai couvre une partie de la banque. Passez Premium pour débloquer ${fmt(UPSELL_EXTRA_QUESTIONS)} questions supplémentaires.`,
                  `تجربتك تغطي جزءاً من البنك. انتقل إلى Premium لفتح ${fmt(UPSELL_EXTRA_QUESTIONS)} سؤال إضافي.`)
                : t('Passez Premium pour débloquer toutes les questions.', 'انتقل إلى Premium لفتح كل الأسئلة.')}
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
            <div className="mt-6">{Cta}</div>
            <button onClick={close} className="mt-2 w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition">
              {t('Plus tard', 'لاحقاً')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

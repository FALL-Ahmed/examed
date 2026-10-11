// Calcul unique des prix (avec promo) pour l'accueil, l'inscription, l'essai gratuit et /abonnement.
// Promo générale : prix fixes si l'admin les a saisis, sinon pourcentage arrondi à la centaine.
// Promo biologiste : pourcentage uniquement, prioritaire pour un biologiste quand elle est active.

export interface PromoSettings {
  active: boolean;
  discount: number;
  endDate?: string | null;
  includesGroup?: boolean;
  soloPrice?: number | null;      // prix promo fixe Solo
  groupPerPerson?: number | null; // prix promo fixe groupe, par personne
  bio?: { active: boolean; discount: number; endDate?: string | null; includesGroup?: boolean };
}

export function computePrices(opts: {
  soloBase: number; perPerson: number; groupSize: number;
  promo: PromoSettings | null | undefined; isBiologiste?: boolean;
}) {
  const { soloBase, perPerson, groupSize, promo } = opts;
  const bio = opts.isBiologiste && promo?.bio?.active ? promo.bio : null;
  const active = bio ? true : !!promo?.active;
  const discount = bio ? bio.discount : promo?.discount ?? 0;
  const onGroup = active && !!(bio ? bio.includesGroup : promo?.includesGroup);
  const byPercent = (p: number) => Math.round((p * (1 - discount / 100)) / 100) * 100;
  const fixedSolo = !bio && promo?.soloPrice ? promo.soloPrice : null;
  const fixedPerPerson = !bio && promo?.groupPerPerson ? promo.groupPerPerson : null;

  const groupBase = perPerson * groupSize;
  const solo = active ? fixedSolo ?? byPercent(soloBase) : soloBase;
  const group = onGroup ? (fixedPerPerson ? fixedPerPerson * groupSize : byPercent(groupBase)) : groupBase;
  const pct = (base: number, final: number) => (base > 0 ? Math.round((1 - final / base) * 100) : 0);
  const soloPct = active ? pct(soloBase, solo) : 0;
  const groupPct = onGroup ? pct(groupBase, group) : 0;

  return {
    active, onGroup, isBioPromo: !!bio,
    endDate: (bio ? bio.endDate : promo?.endDate) ?? null,
    solo, soloBase, soloPct,
    group, groupBase, groupPct, groupPerPerson: Math.round(group / groupSize),
    // Bandeau : plus forte réduction, précédée de « jusqu'à » si les formules diffèrent
    maxPct: Math.max(soloPct, groupPct),
    upTo: onGroup && soloPct !== groupPct,
  };
}

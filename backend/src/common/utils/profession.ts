// Correspondance profession (User.profession) → public du contenu (Theme.target).
// Le Résidanat est un parcours à part : contenu uniquement en français, prix et classement séparés.
export type ContentTarget = 'INFIRMIER' | 'SAGE_FEMME' | 'BIOLOGISTE' | 'RESIDENT';

export const RESIDENT_PROFESSION = 'resident';

export function professionToTarget(profession?: string | null): ContentTarget {
  const p = (profession ?? '').toLowerCase();
  if (p === 'sage_femme') return 'SAGE_FEMME';
  if (p === 'biologiste') return 'BIOLOGISTE';
  if (p === RESIDENT_PROFESSION) return 'RESIDENT';
  return 'INFIRMIER';
}

export function isResident(profession?: string | null): boolean {
  return (profession ?? '').toLowerCase() === RESIDENT_PROFESSION;
}

/**
 * Cloisonnement du contenu résident : un résident ne voit que le contenu RESIDENT,
 * et les autres profils ne voient jamais le contenu RESIDENT (comportement existant inchangé entre eux).
 */
export function residentThemeGuard(profession?: string | null) {
  return isResident(profession) ? { target: 'RESIDENT' } : { target: { not: 'RESIDENT' } };
}

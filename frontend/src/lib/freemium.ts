// Essai gratuit : un compte FREEMIUM n'a accès qu'aux sous-thèmes ouverts par l'admin (isFreemium)

type Sub = { isFreemium?: boolean; _count?: { questions?: number } };
type Theme = { subThemes?: Sub[] };

export const isFreemiumUser = (user?: { role?: string } | null) => user?.role === 'FREEMIUM';

export function isSubLocked(user: { role?: string } | null | undefined, sub?: Sub | null) {
  return isFreemiumUser(user) && !!sub && !sub.isFreemium;
}

// Un thème est verrouillé s'il n'a aucun sous-thème ouvert
export function isThemeLocked(user: { role?: string } | null | undefined, theme?: Theme | null) {
  return isFreemiumUser(user) && !!theme && !(theme.subThemes ?? []).some((s) => s.isFreemium);
}

export function countQuestions(themes: Theme[], filter: (s: Sub) => boolean) {
  return themes.reduce(
    (sum, t) => sum + (t.subThemes ?? []).filter(filter).reduce((n, s) => n + (s._count?.questions ?? 0), 0),
    0,
  );
}

// Questions débloquées en passant Premium
export const lockedQuestionCount = (themes: Theme[]) => countQuestions(themes, (s) => !s.isFreemium);
export const openQuestionCount = (themes: Theme[]) => countQuestions(themes, (s) => !!s.isFreemium);

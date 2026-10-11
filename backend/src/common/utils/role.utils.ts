// Un compte FREEMIUM dont l'essai est terminé est traité comme FREE (en attente de paiement).
// Le rôle reste FREEMIUM en base : si l'admin prolonge la campagne, l'accès revient.
export function effectiveRole(user: { role: string; subscriptionEnd?: Date | null }): string {
  if (user.role === 'FREEMIUM' && (!user.subscriptionEnd || user.subscriptionEnd < new Date())) {
    return 'FREE';
  }
  return user.role;
}

// Filtre Prisma sur Question : limite aux sous-thèmes ouverts en freemium
export const FREEMIUM_QUESTION_FILTER = { subTheme: { isFreemium: true } };

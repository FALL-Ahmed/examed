/** Première lettre en majuscule, reste en minuscule */
export function sentenceCase(str: string | undefined | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

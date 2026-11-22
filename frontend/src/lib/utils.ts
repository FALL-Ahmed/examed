/** Première lettre en majuscule, reste en minuscule */
export function sentenceCase(str: string | undefined | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Résout une URL d'image : externe (http) ou relative au backend */
export function resolveImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`;
}

/**
 * Images de correction rangées dans l'explication sous forme de lignes « [[image:URL]] ».
 * Elles ne s'affichent qu'avec la correction (jamais avec l'énoncé, pour ne pas donner la réponse).
 */
const EXPL_IMG_RE = /^\s*\[\[image:([^\]\s]+)\]\]\s*$/;
export function splitExplanation(explanation: string | undefined | null): { text: string; images: string[] } {
  if (!explanation) return { text: '', images: [] };
  const images: string[] = [];
  const lines = explanation.split('\n').filter((l) => {
    const m = EXPL_IMG_RE.exec(l);
    if (m) { images.push(m[1]); return false; }
    return true;
  });
  return { text: lines.join('\n').trim(), images };
}

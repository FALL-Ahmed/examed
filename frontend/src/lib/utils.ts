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

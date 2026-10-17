// IP réelle du visiteur derrière les proxys (Cloudflare / Render) : l'IP directe de la requête
// est celle du proxy interne (10.x.x.x), inutile pour identifier un abus.
export function getClientIp(req: any): string {
  const h = req?.headers ?? {};
  const first = (v: any) => (Array.isArray(v) ? v[0] : String(v ?? '')).split(',')[0].trim();
  return first(h['cf-connecting-ip']) || first(h['true-client-ip']) || first(h['x-forwarded-for'])
    || req?.ip || req?.connection?.remoteAddress || 'unknown';
}

// Limiteur simple en mémoire (une seule instance du serveur) : au plus `max` actions par `windowMs` et par clé
const hits = new Map<string, number[]>();
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10000) hits.clear(); // garde-fou mémoire
  return false;
}

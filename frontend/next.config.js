/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: { disableDevLogs: true },
  customWorkerSrc: 'worker',
});

const nextConfig = {
  images: {
    remotePatterns: [{ hostname: 'localhost' }],
    formats: ['image/webp'],
    minimumCacheTTL: 604800, // 7 jours
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Désactivé localement pour éviter EPERM .next/trace sur Windows, mais requis sur Netlify et Vercel
  outputFileTracing: Boolean(process.env.NETLIFY || process.env.VERCEL),
  // Remplace les règles de cache de netlify.toml, que Vercel ne lit pas
  async headers() {
    return [
      {
        // Images, vidéos et polices de public/ (hors _next, déjà géré par Next) — cache 7 jours
        source: '/:file((?!_next/).*\\.(?:png|jpe?g|webp|svg|ico|mp4|woff2))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);

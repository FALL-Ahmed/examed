/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: isProd ? false : true,
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
  // Désactivé localement pour éviter EPERM .next/trace sur Windows, mais requis sur Netlify
  outputFileTracing: process.env.NETLIFY ? true : false,
};

module.exports = withPWA(nextConfig);

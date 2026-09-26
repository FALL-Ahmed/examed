import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import 'flag-icons/css/flag-icons.min.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LanguageProvider } from '@/components/LanguageProvider'
import { UTMTracker } from '@/components/UTMTracker'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Al Bourour — Préparation Concours de Santé',
  description: 'Application de révision QCM pour étudiants en soins infirmiers en Mauritanie',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Al Bourour',
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning translate="no"
      className="notranslate">
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <Script id="scroll-reset" strategy="beforeInteractive">{`if(typeof history!=='undefined')history.scrollRestoration='manual';`}</Script>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-YJG9K3ZDT7" strategy="afterInteractive" />
      <Script id="ga" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-YJG9K3ZDT7');
      `}</Script>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <UTMTracker />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

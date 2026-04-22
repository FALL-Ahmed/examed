import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Tajawal } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LanguageProvider } from '@/components/LanguageProvider'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-cairo',
  display: 'swap',
})

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
    <html lang="fr" dir="ltr" suppressHydrationWarning
      className={`${jakarta.variable} ${tajawal.variable}`}>
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
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
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Tajawal } from 'next/font/google'
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning
      className={`${jakarta.variable} ${tajawal.variable}`}>
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

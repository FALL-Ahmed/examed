import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bourour — Préparation Concours de Santé',
  description: 'Application de révision QCM pour étudiants en santé en Mauritanie',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={jakarta.variable}>
      <body className={jakarta.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

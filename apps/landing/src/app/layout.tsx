import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { defaultLocale, isLocale } from '@/content/locales'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zmtechdev.com'),
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers()
  const raw = headerList.get('x-locale')
  const lang = raw && isLocale(raw) ? raw : defaultLocale

  return (
    <html lang={lang}>
      <body className={`${inter.className} bg-[#050505] text-white`}>{children}</body>
    </html>
  )
}

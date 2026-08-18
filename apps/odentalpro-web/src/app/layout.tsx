import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'OdentalPro — Gestión clínica dental',
  description:
    'Agenda, odontograma, historia clínica y planes de tratamiento para clínicas dentales en LATAM.',
  openGraph: {
    title: 'OdentalPro — Gestión clínica dental',
    description:
      'Software multi-tenant para clínicas dentales: pacientes, odontograma y consentimientos.',
    type: 'website',
    locale: 'es_419',
    siteName: 'OdentalPro',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

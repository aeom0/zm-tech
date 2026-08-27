import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GeemaStudio — Gestión inteligente para barberías, spas y peluquerías',
  description:
    'Plataforma SaaS para gestionar agenda, personal, inventario y finanzas de tu salón de belleza. 14 días gratis. Sin tarjeta de crédito.',
  keywords: [
    'software para barberías',
    'app para salón de belleza',
    'gestión de spa',
    'software peluquería LATAM',
    'agenda digital salón',
    'control de inventario belleza',
    'GeemaStudio',
  ],
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'GeemaStudio — Gestión inteligente para tu negocio de belleza',
    description:
      'Agenda inteligente, finanzas claras y control total de tu equipo. Prueba 14 días gratis.',
    type: 'website',
    locale: 'es_419',
    siteName: 'GeemaStudio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GeemaStudio — App para barberías, spas y peluquerías',
    description:
      'Gestiona tu salón de belleza desde el celular. Agenda, finanzas, personal e inventario en una sola app.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}

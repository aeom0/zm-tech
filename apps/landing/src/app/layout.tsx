import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZM Tech | Ingeniería de Software a Velocidad de IA',
  description:
    'Desarrollamos tu App/Web con precisión industrial y soporte inteligente 24/7. De la idea al mercado en tiempo récord.',
  keywords:
    'desarrollo de software Venezuela, IA aplicada a negocios, ingeniería industrial software, LATAM SaaS',
  openGraph: {
    title: 'ZM Tech | Ingeniería de Software a Velocidad de IA',
    description: 'Desarrollamos tu App/Web con precisión industrial y soporte inteligente 24/7.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#050505] text-white`}>{children}</body>
    </html>
  )
}

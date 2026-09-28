import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Finanzas',
  description: 'Panel de administración financiera. Resumen por chica, pendiente y pagado.',
  robots: { index: false, follow: false },
}

export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return children
}

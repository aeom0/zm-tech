import type { Metadata } from 'next'
import { FinanzasAuthWrapper } from './FinanzasAuthWrapper'

export const metadata: Metadata = {
  title: 'Finanzas | ZM Lash & Nails Beauty',
  description: 'Panel de administración financiera. Resumen por chica, pendiente y pagado.',
  robots: { index: false, follow: false },
}

export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return <FinanzasAuthWrapper>{children}</FinanzasAuthWrapper>
}

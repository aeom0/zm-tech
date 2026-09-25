import type { Metadata } from 'next'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchTenantBrandForUser, type TenantBrand } from '@/lib/tenant-brand'
import { FinanzasAuthWrapper } from './FinanzasAuthWrapper'

export const metadata: Metadata = {
  title: 'Finanzas',
  description: 'Panel de administración financiera. Resumen por chica, pendiente y pagado.',
  robots: { index: false, follow: false },
}

export default async function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const brand: TenantBrand = data.session
    ? await fetchTenantBrandForUser(supabase, data.session.user.id)
    : { primary: null, accent: null, businessName: null, logoUrl: null }

  return (
    <FinanzasAuthWrapper primaryColor={brand.primary} accentColor={brand.accent}>
      {children}
    </FinanzasAuthWrapper>
  )
}

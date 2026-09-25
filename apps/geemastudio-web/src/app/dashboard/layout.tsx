import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { FinanzasAuthWrapper } from '../finanzas/FinanzasAuthWrapper'
import { PanelQueryProvider } from '../panel/query-provider'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchTenantBrandForUser } from '@/lib/tenant-brand'

export const metadata: Metadata = {
  title: 'Dashboard | GeemaStudio',
  description: 'Métricas operativas de tu negocio.',
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'staff') {
    redirect('/')
  }

  const brand = await fetchTenantBrandForUser(supabase, user.id)

  return (
    <FinanzasAuthWrapper
      primaryColor={brand.primary}
      accentColor={brand.accent}
      shell={{
        userEmail: user.email ?? 'usuario',
        tenantName: brand.businessName,
        tenantLogoUrl: brand.logoUrl,
      }}
    >
      <PanelQueryProvider>{children}</PanelQueryProvider>
    </FinanzasAuthWrapper>
  )
}

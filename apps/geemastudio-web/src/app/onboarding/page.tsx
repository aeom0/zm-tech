import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { fetchOnboardingStatus, resolveTenantSlug } from '@geemastudio/data'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { OnboardingWizard } from './_components/OnboardingWizard'

export const metadata: Metadata = {
  title: 'Configura tu negocio — GeemaStudio',
  robots: { index: false, follow: false },
}

/** Plan 19 W13: configuración inicial del negocio creado en /registro (fuera de /panel). */
export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantSlug = await resolveTenantSlug(supabase, user.id)
  if (!tenantSlug) redirect('/login')

  const status = await fetchOnboardingStatus(supabase, tenantSlug)
  if (status.isConfigured) redirect('/panel')

  const { data } = await supabase
    .from('tenant_settings')
    .select('business_name')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  return (
    <OnboardingWizard tenantSlug={tenantSlug} businessName={data?.business_name ?? ''} />
  )
}

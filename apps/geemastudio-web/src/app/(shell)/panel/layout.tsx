import { redirect } from 'next/navigation'
import {
  fetchOnboardingStatus,
  isAdminRole,
  trialDaysLeft,
  type OnboardingStatus,
  type Role,
} from '@geemastudio/data'

import { AccountBanners } from '@/components/panel/AccountBanners'
import { InstallAppBanner } from '@/components/pwa/InstallAppBanner'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    redirect('/login')
  }

  const user = data.session.user
  let status: OnboardingStatus | null = null
  let isAdmin = false
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .maybeSingle()
    isAdmin = isAdminRole(profile?.role as Role | undefined)
    if (profile?.tenant_id) status = await fetchOnboardingStatus(supabase, profile.tenant_id)
  } catch (err) {
    // Sin estado no se bloquea el panel: solo se omiten los avisos.
    console.error('[panel] estado de onboarding:', err)
  }

  // Plan 19 W13: negocio creado desde /registro sin terminar la configuración.
  if (status && !status.isConfigured) {
    redirect('/onboarding')
  }

  return (
    <>
      {status && isAdmin ? (
        <AccountBanners
          email={user.email ?? null}
          emailVerified={status.emailVerifiedAt !== null}
          trialDaysLeft={trialDaysLeft(status)}
        />
      ) : null}
      <InstallAppBanner />
      {children}
    </>
  )
}

import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PanelShell } from './PanelShell'
import { PanelQueryProvider } from './query-provider'

async function fetchTenantBrandColors(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
): Promise<{ primary: string | null; accent: string | null }> {
  const byId = await supabase
    .from('tenant_settings')
    .select('primary_color, accent_color')
    .eq('id', userId)
    .maybeSingle()

  if (byId.data) {
    return { primary: byId.data.primary_color ?? null, accent: byId.data.accent_color ?? null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()

  const tenantSlug = profile?.tenant_id as string | null | undefined
  if (!tenantSlug) return { primary: null, accent: null }

  const bySlug = await supabase
    .from('tenant_settings')
    .select('primary_color, accent_color')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  return { primary: bySlug.data?.primary_color ?? null, accent: bySlug.data?.accent_color ?? null }
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    redirect('/login')
  }

  const email = data.session.user.email ?? 'usuario'
  const brand = await fetchTenantBrandColors(supabase, data.session.user.id)

  return (
    <PanelQueryProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#0F0F0F]" />}>
        <PanelShell userEmail={email} primaryColor={brand.primary} accentColor={brand.accent}>
          {children}
        </PanelShell>
      </Suspense>
    </PanelQueryProvider>
  )
}

import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PanelShell } from './PanelShell'
import { PanelQueryProvider } from './query-provider'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    redirect('/login')
  }

  const email = data.session.user.email ?? 'usuario'

  return (
    <PanelQueryProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#0F0F0F]" />}>
        <PanelShell userEmail={email}>{children}</PanelShell>
      </Suspense>
    </PanelQueryProvider>
  )
}

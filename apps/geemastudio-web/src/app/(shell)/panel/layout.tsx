import { redirect } from 'next/navigation'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    redirect('/login')
  }

  return children
}

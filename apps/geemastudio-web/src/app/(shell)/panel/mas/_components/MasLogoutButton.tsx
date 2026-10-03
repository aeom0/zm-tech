'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function MasLogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setLoading(true)
      await supabase?.auth.signOut()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-500/15 disabled:opacity-50 dark:text-red-300"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span>Cerrar sesión</span>
    </button>
  )
}

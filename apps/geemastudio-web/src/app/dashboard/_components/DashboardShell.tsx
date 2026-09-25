'use client'

import { FinanzasSubnav } from '@/app/finanzas/components/FinanzasSubnav'

interface DashboardShellProps {
  children: React.ReactNode
  topSlot?: React.ReactNode
}

export function DashboardShell({ children, topSlot }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <FinanzasSubnav active="/dashboard" />
        {topSlot ? <div className="mx-auto mt-4 max-w-6xl">{topSlot}</div> : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-16">{children}</main>
    </div>
  )
}

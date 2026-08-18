'use client'

import Link from 'next/link'
import { Home, LayoutDashboard, LogOut } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'

interface DashboardShellProps {
  businessName: string | null
  children: React.ReactNode
  topSlot?: React.ReactNode
}

export function DashboardShell({ businessName, children, topSlot }: DashboardShellProps) {
  const { profile, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0F0F0F]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
            >
              <Home className="h-4 w-4" aria-hidden />
              <span className="hidden min-[400px]:inline">Inicio</span>
            </Link>
            <span className="hidden text-white/25 sm:inline">|</span>
            <div className="flex min-w-0 items-center gap-2">
              <LayoutDashboard className="h-5 w-5 shrink-0 text-pink-400" />
              <div className="min-w-0">
                <p className="truncate text-xs text-white/45">Panel</p>
                <p className="truncate text-sm font-semibold leading-tight">
                  {businessName ?? 'Tu negocio'}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/finanzas"
              className="hidden text-sm text-white/60 transition-colors hover:text-white sm:inline"
            >
              Finanzas
            </Link>
            <Link
              href="/panel/servicios"
              className="hidden text-sm text-white/60 transition-colors hover:text-white sm:inline"
            >
              Servicios
            </Link>
            {profile?.full_name ? (
              <span className="hidden max-w-[120px] truncate text-sm text-white/50 md:inline">
                {profile.full_name}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </nav>
        </div>
        {topSlot ? <div className="mx-auto max-w-6xl px-4 pb-4">{topSlot}</div> : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-16">{children}</main>
    </div>
  )
}

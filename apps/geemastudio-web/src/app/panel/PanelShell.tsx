'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ChevronDown, LogOut, Menu, Wrench, Sparkles, LayoutGrid, Clock } from 'lucide-react'

import { supabase } from '@/lib/supabase'

type NavItem = {
  label: string
  href?: string
  icon: React.ReactNode
  disabled?: boolean
  badge?: string
}

export function PanelShell({
  userEmail,
  children,
}: {
  userEmail: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        label: 'Horario',
        href: '/panel/horarios',
        icon: <Clock className="h-4 w-4" />,
      },
      {
        label: 'Servicios',
        href: '/panel/servicios',
        icon: <Wrench className="h-4 w-4" />,
      },
      {
        label: 'Packs',
        icon: <Sparkles className="h-4 w-4" />,
        disabled: true,
        badge: 'Próximamente',
      },
      {
        label: 'Promos',
        icon: <LayoutGrid className="h-4 w-4" />,
        disabled: true,
        badge: 'Próximamente',
      },
    ],
    []
  )

  const handleLogout = async () => {
    try {
      await supabase?.auth.signOut()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.08] px-4 py-4">
        <Link
          href="/panel/servicios"
          className="flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06]">
            <Image
              src="/logo-diamondSparkle.svg"
              alt="GeemaStudio"
              width={24}
              height={24}
              className="opacity-90"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Panel</div>
            <div className="text-xs text-zinc-400">GeemaStudio</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = item.href ? pathname === item.href : false
          const base =
            'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-colors'
          const left = (
            <span className="flex items-center gap-2">
              <span
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-xl border',
                  isActive
                    ? 'border-[#40E0D0]/30 bg-[#40E0D0]/15 text-[#40E0D0]'
                    : 'border-white/[0.08] bg-white/[0.04] text-zinc-300',
                ].join(' ')}
              >
                {item.icon}
              </span>
              <span
                className={['text-sm font-medium', isActive ? 'text-white' : 'text-zinc-300'].join(
                  ' '
                )}
              >
                {item.label}
              </span>
            </span>
          )

          const right = item.badge ? (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[11px] text-zinc-400">
              {item.badge}
            </span>
          ) : null

          if (item.disabled || !item.href) {
            return (
              <div
                key={item.label}
                className={[
                  base,
                  'cursor-not-allowed border-white/[0.06] bg-white/[0.02] opacity-60',
                ].join(' ')}
              >
                {left}
                {right}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={[
                base,
                isActive
                  ? 'border-white/[0.10] bg-white/[0.06]'
                  : 'border-transparent bg-transparent hover:border-white/[0.08] hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {left}
              {right}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Sesión</div>
            <div className="truncate text-sm text-zinc-200">{userEmail}</div>
          </div>
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="dark">
      <div className="flex min-h-screen bg-[#0F0F0F] text-white">
        {/* Desktop sidebar */}
        <aside className="hidden w-[240px] border-r border-white/[0.08] bg-zinc-900 md:block">
          {SidebarContent}
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <div className="absolute bottom-0 left-0 top-0 w-[280px] border-r border-white/[0.08] bg-zinc-900">
              {SidebarContent}
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0F0F0F]/90 backdrop-blur md:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5 text-zinc-200" />
              </button>
              <div className="text-sm font-semibold text-white">
                {pathname?.startsWith('/panel/horarios') ? 'Panel · Horario' : 'Panel · Servicios'}
              </div>
              <div className="w-10" />
            </div>
          </div>

          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}

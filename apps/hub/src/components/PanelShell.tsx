'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Briefcase,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Ticket,
  X,
} from 'lucide-react'
import { HUB_MEMBER_ROLE_LABELS } from '@zmtech/hub-schema'
import { useAuth } from '@/context/AuthContext'
import { brand, navItems, routeTitles, shellCopy, type NavItem } from '@/lib/content'
import { cn } from '@/lib/utils'

const ICONS: Record<NavItem['icon'], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  clientes: Briefcase,
  proyectos: FolderKanban,
  leads: Inbox,
  tickets: Ticket,
  recordatorios: Bell,
  comunicaciones: MessageSquare,
}

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { token, isLoading, logout, member, sinAcceso, user } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!token) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`)
      return
    }
    if (sinAcceso || !member) {
      router.replace('/sin-acceso')
    }
  }, [isLoading, token, member, sinAcceso, router, pathname])

  if (isLoading || !token || !member) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="bg-surface h-10 rounded-lg" />
          <div className="bg-surface h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  const titulo = routeTitles[pathname] ?? shellCopy.panelLabel
  const nombre = member.displayName?.trim() || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="text-foreground min-h-screen">
      <aside
        className={cn(
          'border-border bg-surface fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform lg:translate-x-0',
          menuAbierto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="border-border border-b p-5">
          <div className="font-display text-xl font-bold tracking-tight">
            {brand.name} <span className="text-accent">{brand.product}</span>
          </div>
          <p className="text-muted mt-1 truncate text-xs">{brand.tagline}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon]
            const activo = pathname === item.href
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  title={shellCopy.comingSoon}
                  className="text-muted/50 flex cursor-not-allowed items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[10px] tracking-wide uppercase">
                    {shellCopy.comingSoon}
                  </span>
                </span>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAbierto(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  activo
                    ? 'border-accent bg-accent-soft text-accent border-l-2'
                    : 'text-muted hover:text-foreground border-l-2 border-transparent'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-border border-t p-4">
          <p className="text-foreground truncate text-sm">{nombre}</p>
          <p className="text-muted text-xs">{HUB_MEMBER_ROLE_LABELS[member.role]}</p>
          <button
            type="button"
            onClick={() => {
              void logout().then(() => router.replace('/login'))
            }}
            className="border-border text-muted hover:border-accent/50 hover:text-foreground mt-3 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm transition"
          >
            <LogOut className="h-4 w-4" />
            {shellCopy.logout}
          </button>
        </div>
      </aside>

      {menuAbierto ? (
        <button
          type="button"
          aria-label={shellCopy.closeMenu}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      ) : null}

      <div className="lg:pl-64">
        <header className="border-border bg-surface/80 flex h-14 items-center justify-between border-b px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-foreground rounded-lg p-2 lg:hidden"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? shellCopy.closeMenu : shellCopy.openMenu}
            >
              {menuAbierto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <span className="font-display font-semibold lg:hidden">
              {brand.name} <span className="text-accent">{brand.product}</span>
            </span>
            <span className="text-muted hidden text-sm lg:inline">
              <span className="text-muted/70">{shellCopy.panelLabel}</span>
              <span className="mx-2">/</span>
              <span className="text-foreground">{titulo}</span>
            </span>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

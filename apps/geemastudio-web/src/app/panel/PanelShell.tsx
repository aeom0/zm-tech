'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  ChevronDown,
  LogOut,
  LayoutGrid,
  Clock,
  Users,
  UserRound,
  Settings,
  Calendar,
  MessageCircle,
  MoreHorizontal,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { tenantCssVars } from '@/lib/tenant-theme'

type NavItem = {
  label: string
  shortLabel?: string
  href: string
  icon: React.ReactNode
  disabled?: boolean
  badge?: string
}

type NavSection = {
  title: string
  items: NavItem[]
}

function TenantLogo({
  tenantName,
  tenantLogoUrl,
  size,
}: {
  tenantName?: string | null
  tenantLogoUrl?: string | null
  size: number
}) {
  if (tenantLogoUrl) {
    return (
      <Image
        src={tenantLogoUrl}
        alt={tenantName ?? 'Logo del negocio'}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        unoptimized
      />
    )
  }

  const initial = tenantName?.trim()?.[0]?.toUpperCase() ?? '?'
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 font-semibold text-[var(--tenant-primary)]"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  )
}

export function PanelShell({
  userEmail,
  primaryColor,
  accentColor,
  tenantName,
  tenantLogoUrl,
  children,
}: {
  userEmail: string
  primaryColor?: string | null
  accentColor?: string | null
  tenantName?: string | null
  tenantLogoUrl?: string | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const agendaItem: NavItem = {
    label: 'Agenda',
    href: '/panel/agenda',
    icon: <Calendar className="h-4 w-4" />,
  }
  const clientesItem: NavItem = {
    label: 'Clientes',
    href: '/panel/clientes',
    icon: <Users className="h-4 w-4" />,
  }
  const catalogoItem: NavItem = {
    label: 'Catálogo',
    shortLabel: 'Catálogo',
    href: '/panel/servicios',
    icon: <LayoutGrid className="h-4 w-4" />,
  }
  const personalItem: NavItem = {
    label: 'Personal',
    href: '/panel/personal',
    icon: <UserRound className="h-4 w-4" />,
  }
  const horarioItem: NavItem = {
    label: 'Horario',
    href: '/panel/horarios',
    icon: <Clock className="h-4 w-4" />,
  }
  const configuracionItem: NavItem = {
    label: 'Configuración',
    href: '/panel/configuracion',
    icon: <Settings className="h-4 w-4" />,
  }
  const wabaItem: NavItem = {
    label: 'WhatsApp',
    href: '/panel/waba',
    icon: <MessageCircle className="h-4 w-4" />,
  }

  const navSections = useMemo<NavSection[]>(
    () => [
      { title: 'Operación', items: [agendaItem, clientesItem] },
      { title: 'Catálogo', items: [catalogoItem] },
      { title: 'Negocio', items: [personalItem, horarioItem, configuracionItem] },
      { title: 'Marketing', items: [wabaItem] },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Ítems fijos del bottom tab bar mobile; el resto vive en la hoja "Más".
  const primaryTabItems: NavItem[] = [agendaItem, clientesItem, catalogoItem, wabaItem]
  const moreSections: NavSection[] = [
    { title: 'Negocio', items: [personalItem, horarioItem, configuracionItem] },
  ]

  function isNavActive(href: string): boolean {
    if (href === '/panel/waba') return Boolean(pathname?.startsWith('/panel/waba'))
    if (href === '/panel/servicios') return Boolean(pathname?.startsWith('/panel/servicios'))
    return pathname === href
  }

  const activePageLabel = useMemo(() => {
    const allItems = [
      agendaItem,
      clientesItem,
      catalogoItem,
      personalItem,
      horarioItem,
      configuracionItem,
      wabaItem,
    ]
    return allItems.find((item) => isNavActive(item.href))?.label ?? 'Inicio'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleLogout = async () => {
    try {
      await supabase?.auth.signOut()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  function renderNavLink(item: NavItem, onNavigate: () => void) {
    const isActive = isNavActive(item.href)
    const base =
      'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-colors'
    const left = (
      <span className="flex items-center gap-2">
        <span
          className={[
            'flex h-8 w-8 items-center justify-center rounded-xl border',
            isActive
              ? 'border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]'
              : 'border-white/[0.08] bg-white/[0.04] text-zinc-300',
          ].join(' ')}
        >
          {item.icon}
        </span>
        <span
          className={['text-sm font-medium', isActive ? 'text-white' : 'text-zinc-300'].join(' ')}
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

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
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
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.08] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/panel" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo-diamondSparkleNGlow.svg"
              alt="GeemaStudio"
              width={40}
              height={40}
              className="shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-white">Panel</div>
              <div className="truncate text-xs text-zinc-400">GeemaStudio</div>
            </div>
          </Link>
          <TenantLogo tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} size={36} />
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {section.title}
            </div>
            {section.items.map((item) => renderNavLink(item, () => {}))}
          </div>
        ))}
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
    <div className="dark" style={tenantCssVars(primaryColor, accentColor)}>
      <div className="flex min-h-screen bg-[#0F0F0F] text-white">
        {/* Desktop sidebar */}
        <aside className="hidden w-[240px] border-r border-white/[0.08] bg-zinc-900 md:block">
          {SidebarContent}
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0F0F0F]/90 backdrop-blur md:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Image
                src="/logo-diamondSparkleNGlow.svg"
                alt="GeemaStudio"
                width={32}
                height={32}
                className="shrink-0"
              />
              <div className="text-sm font-semibold text-white">Panel · {activePageLabel}</div>
              <TenantLogo tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} size={28} />
            </div>
          </div>

          <main className="p-4 pb-24 md:p-8 md:pb-8">{children}</main>

          {/* Mobile bottom tab bar */}
          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-zinc-900/95 backdrop-blur md:hidden">
            <div className="flex items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
              {primaryTabItems.map((item) => {
                const isActive = isNavActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-1 flex-col items-center gap-1 py-2.5"
                  >
                    <span className={isActive ? 'text-[var(--tenant-primary)]' : 'text-zinc-400'}>
                      {item.icon}
                    </span>
                    <span
                      className={[
                        'text-[11px] font-medium',
                        isActive ? 'text-white' : 'text-zinc-400',
                      ].join(' ')}
                    >
                      {item.shortLabel ?? item.label}
                    </span>
                  </Link>
                )
              })}
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex flex-1 flex-col items-center gap-1 py-2.5"
              >
                <span className="text-zinc-400">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-medium text-zinc-400">Más</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile "Más" sheet */}
        {moreOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMoreOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-white/[0.08] bg-zinc-900 pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                <div className="text-sm font-semibold text-white">Más</div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setMoreOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]"
                >
                  <X className="h-4 w-4 text-zinc-300" />
                </button>
              </div>

              <div className="space-y-5 p-3">
                {moreSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      {section.title}
                    </div>
                    {section.items.map((item) => renderNavLink(item, () => setMoreOpen(false)))}
                  </div>
                ))}

                <div className="border-t border-white/[0.08] pt-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-500">Sesión</div>
                      <div className="truncate text-sm text-zinc-200">{userEmail}</div>
                    </div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

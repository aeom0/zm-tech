'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import {
  ChevronDown,
  HelpCircle,
  LogOut,
  LayoutGrid,
  Clock,
  Users,
  UserRound,
  Settings,
  Calendar,
  MessageCircle,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react'

import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { supabase } from '@/lib/supabase'

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
      className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 flex shrink-0 items-center justify-center rounded-full border font-semibold text-tenant-text"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  )
}

export function PanelShell({
  userEmail,
  tenantName,
  tenantLogoUrl,
  children,
}: {
  userEmail: string
  tenantName?: string | null
  tenantLogoUrl?: string | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  // En la PWA la posición de scroll se arrastra entre pantallas y deja el título oculto
  // bajo la barra superior; `instant` evita el `scroll-behavior: smooth` global.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

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
  const finanzasItem: NavItem = {
    label: 'Finanzas',
    href: '/finanzas',
    icon: <TrendingUp className="h-4 w-4" />,
  }
  const wabaItem: NavItem = {
    label: 'WhatsApp',
    href: '/panel/waba/mensajes',
    icon: <MessageCircle className="h-4 w-4" />,
  }
  const ayudaItem: NavItem = {
    label: 'Ayuda',
    href: '/panel/ayuda',
    icon: <HelpCircle className="h-4 w-4" />,
  }
  const masItem: NavItem = {
    label: 'Más',
    href: '/panel/mas',
    icon: <MoreHorizontal className="h-4 w-4" />,
  }

  const navSections = useMemo<NavSection[]>(
    () => [
      { title: 'Operación', items: [agendaItem, clientesItem] },
      { title: 'Catálogo', items: [catalogoItem] },
      {
        title: 'Negocio',
        items: [finanzasItem, personalItem, horarioItem, configuracionItem],
      },
      { title: 'Marketing', items: [wabaItem] },
      { title: 'Soporte', items: [ayudaItem] },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Ítems fijos del bottom tab bar mobile; WhatsApp en el centro y Más como pantalla completa
  const primaryTabItems: NavItem[] = [agendaItem, clientesItem, wabaItem, catalogoItem, masItem]

  function isNavActive(href: string): boolean {
    if (href === '/panel/waba' || href === '/panel/waba/mensajes') {
      return Boolean(pathname?.startsWith('/panel/waba'))
    }
    if (href === '/panel/servicios') return Boolean(pathname?.startsWith('/panel/servicios'))
    if (href === '/finanzas') {
      return Boolean(pathname?.startsWith('/finanzas') || pathname?.startsWith('/dashboard'))
    }
    if (href === '/panel/configuracion') {
      return Boolean(pathname?.startsWith('/panel/configuracion') || pathname === '/panel/horarios')
    }
    if (href === '/panel/mas') {
      return Boolean(pathname?.startsWith('/panel/mas'))
    }
    if (href === '/panel/personal') return Boolean(pathname?.startsWith('/panel/personal'))
    if (href === '/panel/horarios') return false
    return pathname === href
  }

  const activePageLabel = useMemo(() => {
    const allItems = [
      agendaItem,
      clientesItem,
      catalogoItem,
      finanzasItem,
      personalItem,
      horarioItem,
      configuracionItem,
      wabaItem,
      ayudaItem,
      masItem,
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
              ? 'border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 text-tenant-text'
              : 'border-fg/[0.08] bg-fg/[0.04] text-fg-soft',
          ].join(' ')}
        >
          {item.icon}
        </span>
        <span className={['text-sm font-medium', isActive ? 'text-fg' : 'text-fg-soft'].join(' ')}>
          {item.label}
        </span>
      </span>
    )

    const right = item.badge ? (
      <span className="rounded-full border border-fg/[0.08] bg-fg/[0.06] px-2 py-0.5 text-[11px] text-fg-muted">
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
            ? 'border-fg/[0.10] bg-fg/[0.06]'
            : 'border-transparent bg-transparent hover:border-fg/[0.08] hover:bg-fg/[0.04]',
        ].join(' ')}
      >
        {left}
        {right}
      </Link>
    )
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-fg/[0.08] px-4 py-4">
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
              <div className="truncate text-sm font-semibold text-fg">Panel</div>
              <div className="truncate text-xs text-fg-muted">GeemaStudio</div>
            </div>
          </Link>
          <TenantLogo tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} size={36} />
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              {section.title}
            </div>
            {section.items.map((item) => renderNavLink(item, () => {}))}
          </div>
        ))}
      </nav>

      <div className="border-t border-fg/[0.08] p-3">
        <div className="mb-3">
          <ThemeToggle compact />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2">
          <div className="min-w-0">
            <div className="text-xs text-fg-subtle">Sesión</div>
            <div className="truncate text-sm text-fg-soft">{userEmail}</div>
          </div>
          <ChevronDown className="h-4 w-4 text-fg-subtle" />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-500/15 dark:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-app text-fg">
      {/* Desktop sidebar */}
      <aside className="hidden w-[240px] border-r border-fg/[0.08] bg-surface md:block">
        {SidebarContent}
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 border-b border-fg/[0.08] bg-app/90 backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Image
              src="/logo-diamondSparkleNGlow.svg"
              alt="GeemaStudio"
              width={32}
              height={32}
              className="shrink-0"
            />
            <div className="text-sm font-semibold text-fg">Panel · {activePageLabel}</div>
            <TenantLogo tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} size={28} />
          </div>
        </div>

        <main
          className={[
            'p-4 pb-24 md:p-8 md:pb-8',
            pathname?.startsWith('/panel/waba/mensajes') ? 'p-2 pb-20 md:p-8 md:pb-8' : '',
          ].join(' ')}
        >
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-fg/[0.08] bg-surface/95 backdrop-blur md:hidden">
          <div className="flex items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
            {primaryTabItems.map((item) => {
              const isActive = isNavActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center gap-1 py-2.5"
                >
                  <span className={isActive ? 'text-tenant-text' : 'text-fg-muted'}>
                    {item.icon}
                  </span>
                  <span
                    className={[
                      'text-[11px] font-medium',
                      isActive ? 'text-fg' : 'text-fg-muted',
                    ].join(' ')}
                  >
                    {item.shortLabel ?? item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

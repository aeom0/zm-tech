'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, Globe, Sliders } from 'lucide-react'
import type { ComponentType } from 'react'

type Tab = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

const TABS: Tab[] = [
  { href: '/panel/configuracion', label: 'General', icon: Sliders },
  { href: '/panel/configuracion/web', label: 'Mi Web', icon: Globe },
  { href: '/panel/horarios', label: 'Horarios', icon: Clock },
]

export function ConfiguracionNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label="Secciones de Configuración"
    >
      {TABS.map((t) => {
        const Icon = t.icon
        const active =
          t.href === '/panel/configuracion'
            ? pathname === '/panel/configuracion'
            : Boolean(pathname?.startsWith(t.href))

        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
              active
                ? 'border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
                : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

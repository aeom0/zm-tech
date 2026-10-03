'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, Globe, Sliders, Sparkles } from 'lucide-react'
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
  { href: '/panel/configuracion/plan', label: 'Mi plan', icon: Sparkles },
]

export function ConfiguracionNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Secciones de Configuración">
      <div className="grid grid-cols-4 gap-2 md:flex md:flex-wrap md:items-center">
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
                'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-[11px] font-semibold leading-tight transition-colors md:min-h-0 md:flex-row md:gap-2 md:px-3 md:text-sm',
                active
                  ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)]'
                  : 'border-fg/[0.08] bg-fg/[0.03] text-fg-soft hover:bg-fg/[0.06]',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Images,
  Megaphone,
  MessageSquare,
  MessageSquareText,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import type { ComponentType } from 'react'

type Tab = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  disabled?: boolean
}

const TABS: Tab[] = [
  { href: '/panel/waba/mensajes', label: 'Mensajes', icon: MessageSquareText },
  { href: '/panel/waba/campanas', label: 'Campañas', icon: Megaphone },
  { href: '/panel/waba/portafolio', label: 'Portafolio', icon: Images },
  { href: '/panel/waba/haiku', label: 'Asistente IA', icon: Sparkles },
  { href: '/panel/waba/simulador', label: 'Simulador', icon: MessageSquare },
  { href: '/panel/waba/historial', label: 'Historial', icon: BarChart2 },
  { href: '/panel/waba/reglas', label: 'Reglas', icon: SlidersHorizontal },
  { href: '/panel/waba', label: 'Estado', icon: Settings2 },
]

export function WabaNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Secciones de WhatsApp">
      <div className="grid grid-cols-4 gap-2 md:flex md:flex-wrap md:items-center">
        {TABS.map((t) => {
          const Icon = t.icon
          const active =
            t.href === '/panel/waba'
              ? pathname === '/panel/waba'
              : Boolean(pathname?.startsWith(t.href))

          if (t.disabled) {
            return (
              <div
                key={t.href}
                aria-disabled="true"
                className="flex min-h-[56px] cursor-not-allowed flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-1 py-2 text-center text-[11px] text-zinc-500 opacity-60 md:min-h-0 md:flex-row md:gap-2 md:px-3 md:text-sm"
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </div>
            )
          }

          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-[11px] font-semibold leading-tight transition-colors md:min-h-0 md:flex-row md:gap-2 md:px-3 md:text-sm',
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
      </div>
    </nav>
  )
}

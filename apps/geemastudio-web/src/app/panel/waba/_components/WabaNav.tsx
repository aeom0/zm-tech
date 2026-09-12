'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquareText, Settings2, Sparkles } from 'lucide-react'
import type { ComponentType } from 'react'

type Tab = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  disabled?: boolean
}

const TABS: Tab[] = [
  { href: '/panel/waba', label: 'Estado', icon: Settings2 },
  { href: '/panel/waba/mensajes', label: 'Mensajes', icon: MessageSquareText },
  { href: '/panel/waba/haiku', label: 'Asistente IA', icon: Sparkles },
]

export function WabaNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Secciones de WhatsApp"
    >
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
              className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-zinc-500 opacity-60"
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
              'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
              active
                ? 'border-[#40E0D0]/30 bg-[#40E0D0]/10 text-[#40E0D0]'
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

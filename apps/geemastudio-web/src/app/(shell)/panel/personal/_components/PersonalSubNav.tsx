'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/panel/personal', label: 'Profesionales' },
  { href: '/panel/personal/horarios', label: 'Horarios' },
  { href: '/panel/personal/ausencias', label: 'Ausencias' },
  { href: '/panel/personal/servicios', label: 'Servicios' },
]

/** Navegación del área de equipo: cada tema de disponibilidad es su propia pantalla. */
export function PersonalSubNav({ staffPlural }: { staffPlural: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Secciones del equipo" className="flex gap-1 overflow-x-auto border-b border-fg/[0.08]">
      {ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'border-[var(--tenant-primary)] text-fg'
                : 'border-transparent text-fg-subtle hover:text-fg'
            }`}
          >
            {item.href === '/panel/personal' ? staffPlural : item.label}
          </Link>
        )
      })}
    </nav>
  )
}

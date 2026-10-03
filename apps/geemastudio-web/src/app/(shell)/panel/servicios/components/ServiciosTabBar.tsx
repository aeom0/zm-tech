'use client'

import { Folder, Gift, Package, Scissors, ShoppingBag } from 'lucide-react'
import type { ComponentType } from 'react'

type TabId = 'categorias' | 'servicios' | 'packs' | 'promos' | 'productos'

const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'categorias', label: 'Categorías', icon: Folder },
  { id: 'servicios', label: 'Servicios', icon: Scissors },
  { id: 'packs', label: 'Packs', icon: Package },
  { id: 'promos', label: 'Promos', icon: Gift },
  { id: 'productos', label: 'Productos', icon: ShoppingBag },
]

export function ServiciosTabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabId
  onChange: (tab: TabId) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Secciones del catálogo"
      className="grid grid-cols-5 gap-1.5 md:flex md:flex-wrap md:items-center md:gap-2"
    >
      {TABS.map((t) => {
        const Icon = t.icon
        const isActive = activeTab === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={[
              'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-0.5 py-2 text-center text-[11px] font-semibold leading-tight transition-colors md:min-h-0 md:flex-row md:gap-2 md:px-4 md:text-sm',
              isActive
                ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)]'
                : 'border-fg/[0.08] bg-fg/[0.03] text-fg-soft hover:bg-fg/[0.06]',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export type { TabId }

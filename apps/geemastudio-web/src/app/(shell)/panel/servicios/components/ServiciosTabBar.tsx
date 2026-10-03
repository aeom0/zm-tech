'use client'

type TabId = 'categorias' | 'servicios' | 'packs' | 'promos' | 'productos'

const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
  { id: 'categorias', label: 'Categorías' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'packs', label: 'Packs' },
  { id: 'promos', label: 'Promos' },
  { id: 'productos', label: 'Productos' },
]

export function ServiciosTabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabId
  onChange: (tab: TabId) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const isActive = activeTab === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => !t.disabled && onChange(t.id)}
            disabled={t.disabled}
            data-active={isActive}
            className={[
              'min-w-[30%] flex-1 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors md:min-w-0 md:flex-none md:px-4 md:py-2',
              t.disabled
                ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-zinc-500'
                : isActive
                  ? 'border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
                  : 'border-white/[0.06] bg-transparent text-zinc-300 hover:border-white/[0.08] hover:bg-white/[0.04]',
            ].join(' ')}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export type { TabId }

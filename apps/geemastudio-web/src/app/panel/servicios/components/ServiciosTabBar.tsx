'use client'

type TabId = 'categorias' | 'servicios' | 'packs' | 'promos'

const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
  { id: 'categorias', label: 'Categorías' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'packs', label: 'Packs' },
  { id: 'promos', label: 'Promos' },
]

export function ServiciosTabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabId
  onChange: (tab: TabId) => void
}) {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !t.disabled && onChange(t.id)}
              disabled={t.disabled}
              className={[
                'whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
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
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0F0F0F] to-transparent sm:hidden" />
    </div>
  )
}

export type { TabId }

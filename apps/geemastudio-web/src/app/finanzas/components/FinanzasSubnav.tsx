import Link from 'next/link'

const TABS = [
  { href: '/finanzas', label: 'Finanzas' },
  { href: '/dashboard', label: 'Dashboard' },
] as const

/** Sub-navegación compartida por Finanzas y Dashboard; la navegación principal y la sesión viven en PanelShell. */
export function FinanzasSubnav({
  active,
  children,
}: {
  active: (typeof TABS)[number]['href']
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === active ? 'page' : undefined}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              tab.href === active
                ? 'bg-[var(--tenant-primary)] text-white'
                : 'text-white/60 hover:text-white',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  )
}

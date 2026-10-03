export const fieldClass =
  'w-full rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 py-2.5 text-base md:text-sm text-fg outline-none focus:border-[var(--tenant-primary)]/40'
export const labelClass = 'mb-1 block text-xs text-fg-subtle'
export const primaryBtnClass =
  'min-h-[44px] md:min-h-[36px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--tenant-on-primary)] hover:bg-[var(--tenant-primary-hover)] hover:text-[var(--tenant-on-primary-hover)] disabled:opacity-50'
export const ghostBtnClass =
  'min-h-[44px] md:min-h-[36px] inline-flex items-center justify-center gap-2 rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-sm font-medium text-fg-soft hover:bg-fg/[0.08]'

/** Fecha local YYYY-MM-DD (para inputs type="date"). */
export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA')
}

/** '2026-10-24' → '24 oct 2026' sin pasar por zona horaria. */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d} ${months[(m ?? 1) - 1]} ${y}`
}

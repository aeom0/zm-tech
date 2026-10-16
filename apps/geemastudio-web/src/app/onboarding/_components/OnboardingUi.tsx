'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

/** Nebulosa de fondo (misma idea que `NebulosaGlow` de mobile). */
export function NebulaBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(64,224,208,0.55), transparent 65%)' }}
      />
      <div
        className="absolute -right-24 top-1/3 h-96 w-96 rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(57,73,171,0.7), transparent 65%)' }}
      />
      <div
        className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(30,136,229,0.6), transparent 65%)' }}
      />
    </div>
  )
}

/** CTA con el gradiente Lunaris (`GradientCTAButton` de mobile). */
export function GradientCta({
  children,
  loading = false,
  icon = true,
  className = '',
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; icon?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`bg-geema-gradient inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-6 font-semibold tracking-wide text-white shadow-[0_8px_30px_rgba(64,224,208,0.25)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
      {icon && !loading ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
    </button>
  )
}

/** Botón secundario con borde de gradiente (variante `outline` de mobile). */
export function GradientOutline({
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`bg-geema-gradient inline-flex rounded-xl p-[1.5px] transition active:scale-[0.98] disabled:opacity-50 ${className}`}
      {...rest}
    >
      <span className="flex min-h-[45px] w-full items-center justify-center rounded-[10.5px] bg-[#0D0D12] px-5 font-medium text-white/85">
        {children}
      </span>
    </button>
  )
}

/** Tarjeta seleccionable: borde de gradiente cuando está activa. */
export function SelectableCard({
  selected,
  onClick,
  children,
  label,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={[
        'rounded-2xl p-[1.5px] text-left transition active:scale-[0.99]',
        selected ? 'bg-geema-gradient shadow-[0_6px_24px_rgba(64,224,208,0.18)]' : 'bg-white/[0.08] hover:bg-white/[0.16]',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-full items-start gap-3 rounded-[14.5px] p-4',
          selected ? 'bg-[#10171a]' : 'bg-zinc-900',
        ].join(' ')}
      >
        {children}
      </span>
    </button>
  )
}

export function StepHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number
  total: number
  title: string
  subtitle: string
}) {
  return (
    <header className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#40E0D0]">
        Paso {step + 1} de {total}
      </p>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <span
              className="bg-geema-gradient block h-full rounded-full transition-all duration-500"
              style={{ width: i <= step ? '100%' : '0%' }}
            />
          </span>
        ))}
      </div>
      <h1 className="pt-1 text-[28px] font-bold leading-tight text-white">{title}</h1>
      <p className="text-sm text-zinc-400">{subtitle}</p>
    </header>
  )
}

/** Bloque con entrada escalonada; `order` define el retraso. */
export function Rise({ order = 0, children, className = '' }: { order?: number; children: ReactNode; className?: string }) {
  return (
    <div className={`animate-rise ${className}`} style={{ animationDelay: `${order * 80}ms` }}>
      {children}
    </div>
  )
}

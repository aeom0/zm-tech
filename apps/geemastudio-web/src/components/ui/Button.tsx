'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)] hover:bg-[var(--tenant-primary-hover)]',
  secondary: 'border border-line-strong text-fg-soft hover:bg-fg/[0.06]',
  ghost: 'text-fg-soft hover:bg-fg/[0.06]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const SIZE: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-xs',
  md: 'min-h-[44px] px-4 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon, className, children, disabled, type, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

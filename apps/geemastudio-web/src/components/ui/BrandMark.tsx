import Image from 'next/image'

import { LUNARIS } from '@/lib/theme'

interface BrandMarkProps {
  /** Color de "Geema"; "Studio" siempre lleva el gradiente Lunaris. */
  geemaClassName?: string
  /** Intensidad de la nebulosa (sube sobre fondos claros para que se note). */
  glowClassName?: string
  priority?: boolean
}

/** Diamante con nebulosa + wordmark GeemaStudio + badge Beta (Navbar y Footer). */
export function BrandMark({
  geemaClassName = 'text-white',
  glowClassName = 'opacity-60',
  priority = false,
}: BrandMarkProps) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-11 w-10 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl ${glowClassName}`}
          style={{
            background:
              'radial-gradient(circle at 35% 50%, rgba(64,224,208,0.7), transparent 60%), radial-gradient(circle at 65% 50%, rgba(57,73,171,0.85), transparent 60%)',
          }}
        />
        <Image
          src="/logo-diamondSparkle.svg"
          alt="GeemaStudio"
          width={44}
          height={50}
          priority={priority}
          className="relative h-11 w-auto"
        />
      </span>
      <span className={`text-[19px] font-bold tracking-tight ${geemaClassName}`}>
        Geema
        <span
          style={{
            background: LUNARIS.gradient.css90,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Studio
        </span>
      </span>
      <span
        style={{
          border: `1px solid ${LUNARIS.badge.border}`,
          background: LUNARIS.badge.bg,
          color: LUNARIS.badge.text,
        }}
        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
      >
        Beta
      </span>
    </span>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ScrollFadeRowProps {
  children: ReactNode
  /** Debe coincidir con el fondo detrás de la fila para que el degradado se funda bien. */
  backgroundColor?: string
  /** Clases del contenedor con scroll (p. ej. `flex gap-2`). */
  className?: string
  /** Clases del wrapper exterior. */
  wrapperClassName?: string
  fadeWidth?: number
  arrowClassName?: string
}

const EPSILON = 4

/** Web de `ScrollFadeRow` (mobile): scroll horizontal con degradado en bordes y flechas. */
export function ScrollFadeRow({
  children,
  backgroundColor = '#09090b',
  className = '',
  wrapperClassName = '',
  fadeWidth = 40,
  arrowClassName = 'text-zinc-300',
}: ScrollFadeRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > EPSILON)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - EPSILON)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    Array.from(el.children).forEach((c) => ro.observe(c))
    return () => ro.disconnect()
  }, [update, children])

  const scrollByStep = (dir: -1 | 1) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.7, 80), behavior: 'smooth' })
  }

  const fadeStyle = (side: 'left' | 'right'): CSSProperties => ({
    width: fadeWidth,
    background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${backgroundColor}, transparent)`,
  })

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div
        ref={ref}
        onScroll={update}
        className={`overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      {canLeft && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center"
          style={fadeStyle('left')}
        >
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            aria-label="Desplazar a la izquierda"
            className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10 ${arrowClassName}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
      {canRight && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-end"
          style={fadeStyle('right')}
        >
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            aria-label="Desplazar a la derecha"
            className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10 ${arrowClassName}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

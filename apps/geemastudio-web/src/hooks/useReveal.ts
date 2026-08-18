'use client'

import { useEffect, useRef } from 'react'

type Options = {
  threshold?: number
  delay?: number
}

/**
 * Hook que aplica la clase "revealed" al elemento referenciado
 * cuando entra al viewport, activando la animación CSS definida
 * en globals.css (.reveal-up, .reveal-fade, etc.).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options: Options = {}) {
  const { threshold = 0.15, delay = 0 } = options
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) {
            setTimeout(() => el.classList.add('revealed'), delay)
          } else {
            el.classList.add('revealed')
          }
          observer.disconnect()
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, delay])

  return ref
}

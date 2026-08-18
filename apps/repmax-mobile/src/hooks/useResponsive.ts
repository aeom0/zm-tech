// ============================================================
// RepMAX — Breakpoints phone / tablet / desktop
// ============================================================
import { useState, useEffect } from 'react'
import { Dimensions } from 'react-native'
import { layout } from '../utils/theme'

export type BreakpointType = 'mobile' | 'tablet' | 'desktop' | 'wide'

interface ResponsiveValues {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isWide: boolean
  /** true si el ancho alcanza tablet o más */
  isTabletUp: boolean
  /** Landscape (ancho > alto) — sidebar en tablet */
  isLandscape: boolean
  breakpoint: BreakpointType
  width: number
  height: number
}

const { tablet, desktop, wide } = layout.breakpoints

export function useResponsive(): ResponsiveValues {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'))

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window)
    })
    return () => subscription.remove()
  }, [])

  const width = dimensions.width
  const height = dimensions.height

  const isMobile = width < tablet
  const isTablet = width >= tablet && width < desktop
  const isDesktop = width >= desktop && width < wide
  const isWide = width >= wide

  let breakpoint: BreakpointType = 'mobile'
  if (isWide) breakpoint = 'wide'
  else if (isDesktop) breakpoint = 'desktop'
  else if (isTablet) breakpoint = 'tablet'

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isTabletUp: width >= tablet,
    isLandscape: width > height,
    breakpoint,
    width,
    height,
  }
}

/** Valor según breakpoint activo (cascada: wide → desktop → tablet → mobile) */
export function useBreakpointValue<T>(values: { mobile: T; tablet?: T; desktop?: T; wide?: T }): T {
  const { breakpoint } = useResponsive()

  if (breakpoint === 'wide' && values.wide !== undefined) return values.wide
  if (breakpoint === 'desktop' && values.desktop !== undefined) return values.desktop
  if (breakpoint === 'tablet' && values.tablet !== undefined) return values.tablet
  return values.mobile
}

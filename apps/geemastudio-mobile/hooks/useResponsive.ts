import { useState, useEffect } from 'react'
import { Dimensions, Platform } from 'react-native'

export type BreakpointType = 'mobile' | 'tablet' | 'desktop' | 'wide'

interface ResponsiveValues {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isWide: boolean
  breakpoint: BreakpointType
  width: number
  height: number
}

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const

export function useResponsive(): ResponsiveValues {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'))

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window)
    })

    return () => subscription?.remove()
  }, [])

  const width = dimensions.width
  const height = dimensions.height

  const isMobile = width < BREAKPOINTS.tablet
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop
  const isDesktop = width >= BREAKPOINTS.desktop && width < BREAKPOINTS.wide
  const isWide = width >= BREAKPOINTS.wide

  let breakpoint: BreakpointType = 'mobile'
  if (isWide) breakpoint = 'wide'
  else if (isDesktop) breakpoint = 'desktop'
  else if (isTablet) breakpoint = 'tablet'

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    breakpoint,
    width,
    height,
  }
}

// Hook para valores específicos por breakpoint
export function useBreakpointValue<T>(values: { mobile: T; tablet?: T; desktop?: T; wide?: T }): T {
  const { breakpoint } = useResponsive()

  if (breakpoint === 'wide' && values.wide !== undefined) {
    return values.wide
  }
  if (breakpoint === 'desktop' && values.desktop !== undefined) {
    return values.desktop
  }
  if (breakpoint === 'tablet' && values.tablet !== undefined) {
    return values.tablet
  }
  return values.mobile
}

// Utilidad para estilos condicionales por plataforma
export function useResponsiveStyle<T>(
  mobileStyle: T,
  webStyle: T | ((breakpoint: BreakpointType) => T)
): T {
  const { breakpoint } = useResponsive()
  if (Platform.OS === 'web') {
    if (typeof webStyle === 'function') {
      return (webStyle as (bp: BreakpointType) => T)(breakpoint)
    }
    return webStyle
  }
  return mobileStyle
}

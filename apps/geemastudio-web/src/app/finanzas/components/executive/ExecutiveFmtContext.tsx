'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { fmtCompactMoney, fmtMoney } from '@/hooks/finanzas/executiveDates'
import { chartColors, kindColors, type ChartColorSet } from './colors'

type FmtCtx = {
  fmt: (n: number) => string
  fmtCompact: (n: number) => string
  colors: ChartColorSet
  kindColor: ReturnType<typeof kindColors>
}

const Ctx = createContext<FmtCtx | null>(null)

export function ExecutiveFmtProvider({
  currencyCode,
  primaryColor,
  accentColor,
  children,
}: {
  currencyCode: string
  primaryColor?: string | null
  accentColor?: string | null
  children: ReactNode
}) {
  const value = useMemo<FmtCtx>(() => {
    const colors = chartColors(primaryColor, accentColor)
    return {
      fmt: (n: number) => fmtMoney(n, currencyCode),
      fmtCompact: (n: number) => fmtCompactMoney(n, currencyCode),
      colors,
      kindColor: kindColors(colors),
    }
  }, [currencyCode, primaryColor, accentColor])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useExecutiveFmt(): FmtCtx {
  const v = useContext(Ctx)
  if (!v) {
    // Fallback si se usa fuera del provider (Detalle no lo necesita)
    const colors = chartColors()
    return {
      fmt: (n) => fmtMoney(n, 'PEN'),
      fmtCompact: (n) => fmtCompactMoney(n, 'PEN'),
      colors,
      kindColor: kindColors(colors),
    }
  }
  return v
}

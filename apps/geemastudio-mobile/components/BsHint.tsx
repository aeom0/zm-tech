import React from 'react'
import type { StyleProp, TextStyle } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useVesRate } from '@/hooks/useVesRate'

interface BsHintProps {
  /** Monto en USD (moneda de precios del tenant VE). */
  usd: number | string | null | undefined
  style?: StyleProp<TextStyle>
}

/** "≈ Bs. 1.234,56" para tenants VE con tasa disponible; no renderiza nada en otro caso. */
export function BsHint({ usd, style }: BsHintProps) {
  const { theme } = useTheme()
  const { formatBs } = useVesRate()
  const texto = formatBs(usd)
  if (!texto) return null
  return (
    <ThemedText type="small" style={[{ color: theme.textMuted }, style]}>
      {`≈ ${texto}`}
    </ThemedText>
  )
}

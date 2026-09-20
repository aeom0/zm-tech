import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { CommissionMode, PaymentMode } from '@geemastudio/shared-schema'
import { useTheme } from '@/hooks/useTheme'

interface Props {
  mode: PaymentMode
  percentage?: number | null
  commissionMode?: CommissionMode | null
  houseCutFixed?: number | null
  currencySymbol?: string
}

const MODE_LABELS: Record<PaymentMode, (pct?: number | null) => string> = {
  commission: (pct) => `${pct ?? 0}%`,
  salary: () => 'Fijo',
  mixed: (pct) => `S+${pct ?? 0}%`,
}

export function EmployeePaymentBadge({
  mode,
  percentage,
  commissionMode,
  houseCutFixed,
  currencySymbol = 'S/',
}: Props) {
  const { theme } = useTheme()

  const modeColor: Record<PaymentMode, string> = {
    commission: theme.primary,
    salary: theme.statusInfo,
    mixed: theme.violetDark,
  }

  if ((mode === 'commission' || mode === 'mixed') && commissionMode === 'fixed_house') {
    return (
      <View style={[styles.pill, { borderColor: theme.accent }]}>
        <Text style={[styles.label, { color: theme.accent }]}>
          Casa {currencySymbol}
          {houseCutFixed ?? 0}
        </Text>
      </View>
    )
  }

  const color = modeColor[mode]
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{MODE_LABELS[mode](percentage)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '600' },
})

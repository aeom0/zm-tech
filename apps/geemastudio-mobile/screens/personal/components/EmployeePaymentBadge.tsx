import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { CommissionMode, PaymentMode } from '@geemastudio/shared-schema'

interface Props {
  mode: PaymentMode
  percentage?: number | null
  commissionMode?: CommissionMode | null
  houseCutFixed?: number | null
  currencySymbol?: string
}

const MODE_CONFIG: Record<PaymentMode, { label: (pct?: number | null) => string; color: string }> =
  {
    commission: { label: (pct) => `${pct ?? 0}%`, color: '#40E0D0' },
    salary: { label: () => 'Fijo', color: '#1E88E5' },
    mixed: { label: (pct) => `S+${pct ?? 0}%`, color: '#00897B' },
  }

export function EmployeePaymentBadge({
  mode,
  percentage,
  commissionMode,
  houseCutFixed,
  currencySymbol = 'S/',
}: Props) {
  if (
    (mode === 'commission' || mode === 'mixed') &&
    commissionMode === 'fixed_house'
  ) {
    return (
      <View style={[styles.pill, { borderColor: '#9C27B0' }]}>
        <Text style={[styles.label, { color: '#9C27B0' }]}>
          Casa {currencySymbol}
          {houseCutFixed ?? 0}
        </Text>
      </View>
    )
  }

  const cfg = MODE_CONFIG[mode]
  return (
    <View style={[styles.pill, { borderColor: cfg.color }]}>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label(percentage)}</Text>
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

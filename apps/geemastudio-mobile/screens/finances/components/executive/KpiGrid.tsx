import React from 'react'
import { View, StyleSheet } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius, Shadows } from '@/constants/theme'
import { formatCurrency } from '@/utils/format'

interface Props {
  ingresos: number
  gastos: number
  ads: number
  utilidad: number
  margenPct: number | null
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'success' | 'error' | 'default'
}) {
  const { theme } = useTheme()
  const valueColor =
    tone === 'success'
      ? theme.success
      : tone === 'error'
        ? theme.error
        : theme.text
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <ThemedText style={[styles.label, { color: theme.textMuted }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.value, { color: valueColor }]}>
        {value}
      </ThemedText>
      {hint ? (
        <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  )
}

export function KpiGrid({ ingresos, gastos, ads, utilidad, margenPct }: Props) {
  const { config } = useTenant()
  const formatValue = (n: number) => formatCurrency(n, config)
  const utilidadTone =
    utilidad > 0 ? 'success' : utilidad < 0 ? 'error' : 'default'
  return (
    <View style={styles.grid}>
      <KpiCard label="Ingresos" value={formatValue(ingresos)} />
      <KpiCard label="Gastos" value={formatValue(gastos)} />
      <KpiCard label="Ads Meta" value={formatValue(ads)} />
      <KpiCard
        label="Utilidad neta"
        value={formatValue(utilidad)}
        hint={
          margenPct == null ? 'Sin ingresos este mes' : `Margen ${margenPct}%`
        }
        tone={utilidadTone}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  label: { fontSize: 12, fontWeight: '600', marginBottom: Spacing.xs },
  value: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 11, marginTop: Spacing.xs },
})

import React from 'react'
import { View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { Spacing } from '@/constants/theme'

import { financesStyles as styles } from '../financesStyles'
import type { FinancesDesgloseRow } from '../types'

interface Props {
  desglose: FinancesDesgloseRow[]
}

export function EmployeeBreakdown({ desglose }: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()

  if (desglose.length === 0) return null

  return (
    <View
      style={[
        styles.chartCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.chartCardHeader}>
        <ThemedText style={styles.chartTitle}>
          Por {config.terminology.staffSingular.toLowerCase()} (período)
        </ThemedText>
      </View>
      <View style={{ gap: Spacing.sm }}>
        {desglose.map((row) => (
          <View
            key={row.id}
            style={[
              styles.desgloseRow,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText
              style={[styles.desgloseName, { color: theme.text }]}
              numberOfLines={1}
            >
              {row.name}
            </ThemedText>
            <View style={styles.desgloseAmounts}>
              <ThemedText style={[styles.desgloseLabel, { color: theme.textMuted }]}>
                Generado {formatCurrency(row.generado, config)}
              </ThemedText>
              <ThemedText style={[styles.desgloseLabel, { color: theme.gold }]}>
                Pagado {formatCurrency(row.pagado, config)}
              </ThemedText>
              {row.pendiente > 0.01 && (
                <ThemedText
                  style={[styles.desgloseLabel, { color: theme.primary, fontWeight: '600' }]}
                >
                  Pendiente {formatCurrency(row.pendiente, config)}
                </ThemedText>
              )}
              {row.commissionMode === 'fixed_house' && row.comision != null ? (
                <ThemedText
                  style={[styles.desgloseLabel, { color: theme.textSecondary, fontWeight: '600' }]}
                >
                  {row.commissionLabel ?? `Comisión (casa ${row.houseCutFixed ?? 0})`}:{' '}
                  {formatCurrency(row.comision, config)}
                </ThemedText>
              ) : row.houseCutEarned && row.houseCutEarned > 0 ? (
                <ThemedText
                  style={[styles.desgloseLabel, { color: theme.textSecondary, fontWeight: '600' }]}
                >
                  + Corte casa {formatCurrency(row.houseCutEarned, config)}
                </ThemedText>
              ) : row.comision != null && row.comision > 0 ? (
                <ThemedText
                  style={[styles.desgloseLabel, { color: theme.textSecondary, fontWeight: '600' }]}
                >
                  Comisión {formatCurrency(row.comision, config)}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

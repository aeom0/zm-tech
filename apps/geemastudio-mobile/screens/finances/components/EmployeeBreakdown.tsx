import React from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { Spacing, BorderRadius } from '@/constants/theme'

import { financesStyles as styles } from '../financesStyles'
import type { FinancesDesgloseRow } from '../types'

interface Props {
  desglose: FinancesDesgloseRow[]
  onRegisterPayout?: (row: FinancesDesgloseRow) => void
}

export function EmployeeBreakdown({ desglose, onRegisterPayout }: Props) {
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
                flexDirection: 'column',
                alignItems: 'stretch',
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
              {row.commissionLabel && row.comision != null ? (
                <ThemedText
                  style={[styles.desgloseLabel, { color: theme.textSecondary, fontWeight: '600' }]}
                >
                  {row.commissionLabel}: {formatCurrency(row.comision, config)}
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
              {row.comision != null && row.comision > 0 ? (
                <ThemedText style={[styles.desgloseLabel, { color: theme.textMuted }]}>
                  Comisión pagada {formatCurrency(row.comisionPagada ?? 0, config)}
                </ThemedText>
              ) : null}
            </View>
            </View>
            {onRegisterPayout &&
            row.comisionPendienteReal != null &&
            row.comisionPendienteReal > 0.01 ? (
              <Pressable
                onPress={() => onRegisterPayout(row)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.xs,
                    alignSelf: 'flex-start',
                    marginTop: Spacing.sm,
                    paddingVertical: Spacing.xs,
                    paddingHorizontal: Spacing.md,
                    borderRadius: BorderRadius.full,
                    borderWidth: 1,
                    borderColor: theme.primary,
                  },
                ]}
              >
                <Feather name="check-circle" size={14} color={theme.primary} />
                <ThemedText style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>
                  Marcar pago ({formatCurrency(row.comisionPendienteReal, config)} pendiente)
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  )
}

import React, { useState } from 'react'
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'
import { useWabaPricing } from '../hooks/useWabaPricing'

function formatUSD(value: number): string {
  if (value < 0.001 && value > 0) return '< $0.001'
  return `$${value.toFixed(2)}`
}

function formatMomPct(pct: number | null): string {
  if (pct === null) return 'sin base mes ant.'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${(pct * 100).toFixed(0)}% vs mes ant.`
}

export function PricingBreakdownCard() {
  const { theme } = useTheme()
  const { data, isPending, isFetching, isError, error, refetch } = useWabaPricing()
  const [expanded, setExpanded] = useState(false)

  const cargando = isPending || isFetching
  const hasRows = (data?.by_category.length ?? 0) > 0
  const monthCost = data?.month_compare.current_month_cost ?? 0
  const momPct = data?.month_compare.month_over_month_pct ?? null

  const momColor =
    momPct === null
      ? theme.textMuted
      : momPct > 0.15
        ? theme.warning
        : momPct < -0.05
          ? theme.success
          : theme.textSecondary

  const maxCategoryCost = Math.max(...(data?.by_category.map((c) => c.cost) ?? [0]), 0.0001)

  if (!data) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <Feather name="message-circle" size={15} color={theme.primary} />
            <ThemedText style={[styles.title, { color: theme.text }]}>
              WhatsApp · Costos
            </ThemedText>
          </View>
          {cargando && <ActivityIndicator size="small" color={theme.primary} />}
        </View>
        {isError && error && !cargando ? (
          <Pressable onPress={() => void refetch()} style={styles.retryInline}>
            <ThemedText style={{ color: theme.primary, fontSize: 13 }}>
              Error al cargar · Reintentar
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    )
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded ? 'Ocultar desglose de costos WhatsApp' : 'Ver desglose de costos WhatsApp'
        }
        style={styles.headerPress}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <Feather name="message-circle" size={15} color={theme.primary} />
            <ThemedText style={[styles.title, { color: theme.text }]}>
              WhatsApp · Costos
            </ThemedText>
          </View>
          <View style={styles.headerRight}>
            <ThemedText style={[styles.saldoInline, { color: theme.gold }]}>
              {formatUSD(monthCost)}
            </ThemedText>
            <Feather
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textMuted}
            />
          </View>
        </View>

        {!hasRows ? (
          <ThemedText style={[styles.summaryLine, { color: theme.textSecondary }]}>
            Sin datos de pricing aún · el sync corre los lunes
          </ThemedText>
        ) : (
          <>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(
                        4,
                        (monthCost /
                          Math.max(data.month_compare.previous_month_cost, monthCost, 0.01)) *
                          100
                      )
                    )}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
            <ThemedText style={[styles.summaryLine, { color: theme.textSecondary }]}>
              {data.month_compare.current_month_label} ·{' '}
              <ThemedText style={{ color: momColor, fontSize: 12 }}>
                {formatMomPct(momPct)}
              </ThemedText>
            </ThemedText>
          </>
        )}
      </Pressable>

      {expanded && (
        <View style={[styles.detailBox, { borderTopColor: theme.border }]}>
          <View style={styles.kpiRow}>
            <View style={styles.kpiItem}>
              <ThemedText style={[styles.kpiValue, { color: theme.gold }]}>
                {formatUSD(monthCost)}
              </ThemedText>
              <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
                Mes actual
              </ThemedText>
            </View>
            <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />
            <View style={styles.kpiItem}>
              <ThemedText style={[styles.kpiValue, { color: theme.text }]}>
                {formatUSD(data.month_compare.previous_month_cost)}
              </ThemedText>
              <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
                Mes anterior
              </ThemedText>
            </View>
            <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />
            <View style={styles.kpiItem}>
              <ThemedText style={[styles.kpiValue, { color: theme.text }]}>
                {data.total_volume}
              </ThemedText>
              <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
                Msgs (30d)
              </ThemedText>
            </View>
          </View>

          {!hasRows ? (
            <ThemedText style={[styles.projectionText, { color: theme.textMuted }]}>
              Cuando el cron sincronice Meta pricing_analytics verás el desglose por categoría
              aquí.
            </ThemedText>
          ) : (
            <>
              <ThemedText style={[styles.projectionText, { color: theme.textSecondary }]}>
                Últimos 30 días · total {formatUSD(data.total_cost)}
              </ThemedText>
              {data.by_category.map((cat) => {
                const barPct =
                  maxCategoryCost > 0 ? Math.round((cat.cost / maxCategoryCost) * 100) : 0
                return (
                  <View key={cat.pricing_category} style={styles.categoryBlock}>
                    <View style={styles.triggerRow}>
                      <ThemedText style={[styles.triggerLabel, { color: theme.textSecondary }]}>
                        {cat.label}
                      </ThemedText>
                      <ThemedText style={[styles.triggerCalls, { color: theme.textMuted }]}>
                        {formatUSD(cat.cost)} · {cat.volume}
                      </ThemedText>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(cat.cost > 0 ? 4 : 0, barPct)}%`,
                            backgroundColor:
                              cat.pricing_category === 'SERVICE' ? theme.success : theme.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )
              })}
            </>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerPress: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  saldoInline: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(127,127,127,0.2)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  summaryLine: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  detailBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 28,
    marginHorizontal: Spacing.sm,
  },
  projectionText: {
    fontSize: 12,
    lineHeight: 17,
  },
  categoryBlock: {
    gap: Spacing.xs,
  },
  triggerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerLabel: {
    fontSize: 12,
  },
  triggerCalls: {
    fontSize: 12,
    fontWeight: '600',
  },
  retryInline: {
    marginTop: Spacing.sm,
  },
})

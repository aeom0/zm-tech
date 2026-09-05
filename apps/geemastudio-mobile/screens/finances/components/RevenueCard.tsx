import React from 'react'
import { View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import Svg, { Path, Circle, Line } from 'react-native-svg'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { Spacing } from '@/constants/theme'

import {
  CHART_HEIGHT,
  CHART_INNER_HEIGHT,
  CHART_INNER_WIDTH,
  CHART_PADDING,
  CHART_WIDTH,
  DAYS_SHORT,
} from '../constants'
import { financesStyles as styles } from '../financesStyles'
import type { FinancesPeriod } from '../types'

interface Props {
  period: FinancesPeriod
  displayTotal: number
  totalAbono: number
  abonoDisplayTotal: number
  paymentsCount: number
  isStaffOnly: boolean
  chartData: { date: string; total: number }[]
  isTablet?: boolean
}

function SimpleChart({
  period,
  chartData,
}: {
  period: FinancesPeriod
  chartData: { date: string; total: number }[]
}) {
  const { theme } = useTheme()
  const { config } = useTenant()

  if (chartData.length === 0) {
    return (
      <View style={[styles.noChartData, { height: CHART_HEIGHT }]}>
        <Feather name="bar-chart-2" size={40} color={theme.textMuted} />
        <ThemedText
          style={[styles.noChartText, { color: theme.textMuted, marginTop: Spacing.sm }]}
        >
          Sin datos en este período
        </ThemedText>
      </View>
    )
  }

  const maxValue = Math.max(...chartData.map((d) => d.total), 1)
  const padding = CHART_PADDING
  const innerW = CHART_INNER_WIDTH
  const innerH = CHART_INNER_HEIGHT
  const n = chartData.length
  const step = n > 1 ? n - 1 : 1
  const points = chartData.map((d, i) => ({
    x: padding.left + (i / step) * innerW,
    y: padding.top + innerH - (d.total / maxValue) * innerH,
    label: (() => {
      const dt = new Date(d.date)
      return period === 'month' ? `${dt.getDate()}/${dt.getMonth() + 1}` : DAYS_SHORT[dt.getDay()]
    })(),
  }))

  const pathData =
    points.length === 1
      ? `M ${points[0].x} ${padding.top + innerH} L ${points[0].x} ${points[0].y}`
      : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <View style={styles.chartWrapper}>
      {maxValue > 0 && (
        <View style={styles.chartYLabel}>
          <ThemedText
            style={[styles.chartYLabelText, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {formatCurrency(maxValue, config)}
          </ThemedText>
        </View>
      )}
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={styles.chartSvg}>
        {[0, 0.5, 1].map((ratio, i) => (
          <Line
            key={i}
            x1={padding.left}
            y1={padding.top + (1 - ratio) * innerH}
            x2={padding.left + innerW}
            y2={padding.top + (1 - ratio) * innerH}
            stroke={theme.border}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}
        <Path
          d={pathData}
          stroke={theme.gold}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={points.length === 1 ? 6 : 4} fill={theme.gold} />
        ))}
      </Svg>
      <View style={styles.chartXLabels}>
        {points.map((p, i) => (
          <View key={i} style={[styles.chartXLabelItem, { width: n > 1 ? innerW / n : innerW }]}>
            <ThemedText
              style={[styles.chartXLabelText, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {p.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  )
}

export function RevenueCard({
  period,
  displayTotal,
  totalAbono,
  abonoDisplayTotal,
  paymentsCount,
  isStaffOnly,
  chartData,
  isTablet,
}: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()

  return (
    <>
      <View
        style={[
          styles.revenueCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
          isTablet && { flex: 1 },
        ]}
      >
        <View style={styles.revenueCardHeader}>
          <Feather name="trending-up" size={20} color={theme.gold} />
          <ThemedText style={[styles.revenueLabel, { color: theme.textSecondary }]}>
            {isStaffOnly ? 'Mis ganancias' : 'Ingresos Totales'}
          </ThemedText>
        </View>
        <View style={styles.revenueRow}>
          <ThemedText
            style={[styles.revenueAmount, { color: theme.gold }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(displayTotal, config)}
          </ThemedText>
        </View>
        <View style={styles.revenueMeta}>
          <ThemedText style={[styles.periodLabel, { color: theme.textMuted }]}>
            {period === 'today'
              ? 'Hoy'
              : period === 'week'
                ? 'Últimos 7 días'
                : 'Últimos 30 días'}
          </ThemedText>
          <ThemedText style={[styles.transactionCount, { color: theme.textMuted }]}>
            {paymentsCount} {paymentsCount === 1 ? 'transacción' : 'transacciones'}
          </ThemedText>
          {totalAbono > 0 && (
            <View style={styles.abonoIndicator}>
              <Feather name="smartphone" size={12} color={theme.primary} />
              <ThemedText style={[styles.abonoIndicatorText, { color: theme.primary }]}>
                Adelantos 20%: {formatCurrency(abonoDisplayTotal, config)}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
          isTablet && { flex: 1 },
        ]}
      >
        <View style={styles.chartCardHeader}>
          <ThemedText style={styles.chartTitle}>Tendencia de Ingresos</ThemedText>
          {chartData.length > 0 && (
            <ThemedText style={[styles.chartSubtitle, { color: theme.textMuted }]}>
              Total: {formatCurrency(chartData.reduce((s, d) => s + d.total, 0), config)}
            </ThemedText>
          )}
        </View>
        <SimpleChart period={period} chartData={chartData} />
      </View>
    </>
  )
}

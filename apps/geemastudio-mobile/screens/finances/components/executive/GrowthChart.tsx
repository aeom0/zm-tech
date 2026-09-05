import React from 'react'
import { View, Pressable, StyleSheet, Dimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius, Shadows } from '@/constants/theme'
import { formatCurrency } from '@/utils/format'
import type { MonthlyFinancialRow } from '../../types'
import type { GrowthRange } from '../../hooks/useExecutiveSummary'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CHART_HEIGHT = 168
const PAD = { top: 12, right: 12, bottom: 28, left: 8 }

interface Props {
  data: MonthlyFinancialRow[]
  range: GrowthRange
  onChangeRange: (r: GrowthRange) => void
}

function netOf(row: MonthlyFinancialRow): number {
  return row.revenue - row.expenses - row.ads_spend
}

function monthLabel(iso: string): string {
  const [y, m] = iso.slice(0, 7).split('-')
  const months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ]
  const idx = Number(m) - 1
  return `${months[idx] ?? m} ${y.slice(2)}`
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    const cpX1 = current.x + (next.x - current.x) * 0.35
    const cpX2 = current.x + (next.x - current.x) * 0.65
    d += ` C ${cpX1} ${current.y}, ${cpX2} ${next.y}, ${next.x} ${next.y}`
  }
  return d
}

export function GrowthChart({ data, range, onChangeRange }: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const formatValue = (n: number) => formatCurrency(n, config)
  const chartWidth = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2
  const innerW = chartWidth - PAD.left - PAD.right
  const innerH = CHART_HEIGHT - PAD.top - PAD.bottom

  const nets = data.map(netOf)
  const maxAbs = Math.max(1, ...nets.map((n) => Math.abs(n)), 1)
  const minV = Math.min(0, ...nets)
  const maxV = Math.max(0, ...nets, 1)
  const span = maxV - minV || 1

  const points = data.map((row, i) => {
    const x =
      PAD.left +
      (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
    const y = PAD.top + ((maxV - netOf(row)) / span) * innerH
    return { x, y }
  })

  const zeroY = PAD.top + ((maxV - 0) / span) * innerH
  const path = buildSmoothPath(points)
  const tickEvery = data.length > 8 ? 2 : 1

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title}>Crecimiento</ThemedText>
        <View style={styles.toggles}>
          {(
            [
              { value: '6m' as const, label: '6m' },
              { value: '12m' as const, label: '12m' },
              { value: 'all' as const, label: 'Todo' },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    range === opt.value
                      ? theme.primary
                      : theme.backgroundSecondary,
                },
              ]}
              onPress={() => {
                onChangeRange(opt.value)
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color: range === opt.value ? theme.buttonText : theme.text,
                  },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
        Utilidad neta (ingresos − gastos − ads)
      </ThemedText>

      {data.length === 0 || (maxAbs === 1 && nets.every((n) => n === 0)) ? (
        <View style={[styles.empty, { height: CHART_HEIGHT }]}>
          <ThemedText style={{ color: theme.textMuted }}>
            Aún no hay movimiento en este rango
          </ThemedText>
        </View>
      ) : (
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Line
            x1={PAD.left}
            x2={PAD.left + innerW}
            y1={zeroY}
            y2={zeroY}
            stroke={theme.border}
            strokeDasharray="4 4"
          />
          <Path d={path} fill="none" stroke={theme.primary} strokeWidth={2.5} />
          {points.map((p, i) => (
            <Circle
              key={data[i].month}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={theme.primary}
            />
          ))}
          {data.map((row, i) =>
            i % tickEvery === 0 || i === data.length - 1 ? (
              <SvgText
                key={`t-${row.month}`}
                x={points[i].x}
                y={CHART_HEIGHT - 8}
                fontSize={9}
                fill={theme.textMuted}
                textAnchor="middle"
              >
                {monthLabel(row.month)}
              </SvgText>
            ) : null
          )}
        </Svg>
      )}

      {data.length > 0 ? (
        <ThemedText style={[styles.foot, { color: theme.textSecondary }]}>
          Último mes: {formatValue(netOf(data[data.length - 1]))}
        </ThemedText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 12, marginBottom: Spacing.sm },
  toggles: { flexDirection: 'row', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  foot: { fontSize: 12, marginTop: Spacing.xs, fontWeight: '600' },
})

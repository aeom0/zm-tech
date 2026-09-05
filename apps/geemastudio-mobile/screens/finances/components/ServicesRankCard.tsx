import React from 'react'
import { View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

import { financesStyles as styles } from '../financesStyles'
import type { ServiceRankRow } from '../utils/service-ranking'

interface Props {
  data: ServiceRankRow[]
}

export function ServicesRankCard({ data }: Props) {
  const { theme } = useTheme()

  if (data.length === 0) return null

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
      <View style={[styles.chartCardHeader, { marginBottom: Spacing.lg }]}>
        <Feather name="award" size={16} color={theme.gold} />
        <ThemedText style={styles.chartTitle}>Servicios más realizados</ThemedText>
      </View>
      <View style={{ gap: Spacing.sm }}>
        {data.map((row, i) => (
          <View
            key={row.id}
            style={[
              rankStyles.row,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={[rankStyles.rank, { color: theme.textMuted }]}>
              {i + 1}.
            </ThemedText>
            <ThemedText
              style={[rankStyles.label, { color: theme.text }]}
              numberOfLines={1}
            >
              {row.label}
            </ThemedText>
            <View
              style={[rankStyles.countBadge, { backgroundColor: `${theme.primary}18` }]}
            >
              <ThemedText style={[rankStyles.countText, { color: theme.primary }]}>
                {row.count}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const rankStyles = {
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  rank: { fontSize: 14, width: 24, fontWeight: '600' as const },
  label: { fontSize: 14, fontWeight: '600' as const, flex: 1 },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  countText: { fontSize: 13, fontWeight: '700' as const },
}

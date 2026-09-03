import React from 'react'
import { View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'

import { DashboardAnimatedView, type DashboardAnimatedStyle } from '../hooks/useStaggeredAnimation'
import { dashboardStyles as styles } from '../dashboardStyles'
import type { DashboardTopService } from '../types'

interface DashboardTopServicesCardProps {
  topServices: DashboardTopService[]
  theme: {
    backgroundDefault: string
    backgroundSecondary: string
    border: string
    text: string
    textSecondary: string
    textMuted: string
  }
  animatedStyle?: DashboardAnimatedStyle
}

export function DashboardTopServicesCard({
  topServices,
  theme,
  animatedStyle,
}: DashboardTopServicesCardProps) {
  if (topServices.length === 0) {
    return null
  }

  return (
    <DashboardAnimatedView
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
            Servicios más realizados
          </ThemedText>
          <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Histórico de citas completadas
          </ThemedText>
        </View>
      </View>
      {topServices.map((service, index) => (
        <View
          key={service.id}
          style={[
            styles.quickLinkRow,
            index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
          ]}
        >
          <View style={[styles.topServiceRank, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.topServiceRankText, { color: theme.textSecondary }]}>
              {index + 1}
            </ThemedText>
          </View>
          <ThemedText style={[styles.quickLinkTitle, { flex: 1, color: theme.text }]}>
            {service.name}
          </ThemedText>
          <ThemedText style={[styles.topServiceCount, { color: theme.textMuted }]}>
            {service.count} cita{service.count === 1 ? '' : 's'}
          </ThemedText>
        </View>
      ))}
    </DashboardAnimatedView>
  )
}

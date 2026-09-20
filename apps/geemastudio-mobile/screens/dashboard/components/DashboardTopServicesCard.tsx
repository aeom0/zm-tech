import React from 'react'
import { Pressable, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { ThemedText } from '@/components/ThemedText'

import { DashboardAnimatedView, type DashboardAnimatedStyle } from '../hooks/useStaggeredAnimation'
import { dashboardStyles as styles } from '../dashboardStyles'
import type { TopServicesPeriod } from '../hooks/useDashboardQueries'
import type { DashboardTopService } from '../types'

const RANK_GRADIENTS: Record<number, [string, string]> = {
  0: ['#F7D774', '#C9971F'],
  1: ['#E4E8ED', '#A6ADB8'],
  2: ['#E3A97A', '#A9652F'],
}

interface DashboardTopServicesCardProps {
  topServices: DashboardTopService[]
  period: TopServicesPeriod
  onChangePeriod: (period: TopServicesPeriod) => void
  theme: {
    backgroundDefault: string
    backgroundSecondary: string
    border: string
    text: string
    textSecondary: string
    textMuted: string
    primary: string
  }
  animatedStyle?: DashboardAnimatedStyle
}

export function DashboardTopServicesCard({
  topServices,
  period,
  onChangePeriod,
  theme,
  animatedStyle,
}: DashboardTopServicesCardProps) {
  return (
    <DashboardAnimatedView
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      <View style={[styles.cardHeader, styles.cardHeaderStack]}>
        <View>
          <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
            Servicios más realizados
          </ThemedText>
          <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            {period === 'month' ? 'Mes actual' : 'Histórico de citas completadas'}
          </ThemedText>
        </View>
        <View style={styles.periodToggleRow}>
          <View style={[styles.periodToggle, { backgroundColor: theme.backgroundSecondary }]}>
            <Pressable
              style={[
                styles.periodToggleOption,
                period === 'month' && { backgroundColor: theme.primary },
              ]}
              onPress={() => onChangePeriod('month')}
            >
              <ThemedText
                style={[
                  styles.periodToggleText,
                  { color: period === 'month' ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                Mes
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.periodToggleOption,
                period === 'all' && { backgroundColor: theme.primary },
              ]}
              onPress={() => onChangePeriod('all')}
            >
              <ThemedText
                style={[
                  styles.periodToggleText,
                  { color: period === 'all' ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                Histórico
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
      {topServices.length === 0 ? (
        <View style={styles.quickLinkRow}>
          <ThemedText style={[styles.quickLinkSub, { color: theme.textMuted }]}>
            Sin citas completadas en este periodo
          </ThemedText>
        </View>
      ) : (
        topServices.map((service, index) => {
          const gradient = RANK_GRADIENTS[index]
          return (
            <View
              key={service.id}
              style={[
                styles.quickLinkRow,
                index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
              ]}
            >
              {gradient ? (
                <View
                  style={[
                    styles.topServiceRank,
                    {
                      shadowColor: gradient[1],
                      shadowOpacity: 0.4,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 3,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.topServiceRank, { position: 'absolute' }]}
                  />
                  <ThemedText style={[styles.topServiceRankText, { color: '#FFFFFF' }]}>
                    {index + 1}
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.topServiceRank, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText style={[styles.topServiceRankText, { color: theme.textSecondary }]}>
                    {index + 1}
                  </ThemedText>
                </View>
              )}
              <ThemedText style={[styles.quickLinkTitle, { flex: 1, color: theme.text }]}>
                {service.name}
              </ThemedText>
              <View style={[styles.topServiceCountBadge, { backgroundColor: `${theme.primary}18` }]}>
                <ThemedText style={[styles.topServiceCount, { color: theme.primary }]}>
                  {service.count} cita{service.count === 1 ? '' : 's'}
                </ThemedText>
              </View>
            </View>
          )
        })
      )}
    </DashboardAnimatedView>
  )
}

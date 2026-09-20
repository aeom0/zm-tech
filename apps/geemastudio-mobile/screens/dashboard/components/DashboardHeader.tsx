import React from 'react'
import { View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'

import { DashboardAnimatedView, type DashboardAnimatedStyle } from '../hooks/useStaggeredAnimation'
import { dashboardStyles as styles } from '../dashboardStyles'

interface DashboardHeaderProps {
  greeting: string
  displayNameSuffix: string
  motivationalMessage: string
  dateLabel: string
  theme: {
    text: string
    textSecondary: string
  }
  animatedStyle?: DashboardAnimatedStyle
}

export function DashboardHeader({
  greeting,
  displayNameSuffix,
  motivationalMessage,
  dateLabel,
  theme,
  animatedStyle,
}: DashboardHeaderProps) {
  return (
    <DashboardAnimatedView style={[styles.header, animatedStyle]}>
      <View style={styles.headerText}>
        <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>
          {greeting}
          {displayNameSuffix}
        </ThemedText>
        <ThemedText style={[styles.dateText, { color: theme.text }]} numberOfLines={1}>
          {dateLabel}
        </ThemedText>
        <ThemedText
          style={[styles.motivationalText, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {motivationalMessage}
        </ThemedText>
      </View>
    </DashboardAnimatedView>
  )
}

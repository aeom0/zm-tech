import React from 'react'
import { View, ActivityIndicator } from 'react-native'

import { useTheme } from '@/hooks/useTheme'

import { dashboardStyles as styles } from '../dashboardStyles'

interface DashboardLoadingProps {
  backgroundColor: string
}

export function DashboardLoading({ backgroundColor }: DashboardLoadingProps) {
  const { theme } = useTheme()
  return (
    <View style={[styles.loadingContainer, { backgroundColor }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  )
}

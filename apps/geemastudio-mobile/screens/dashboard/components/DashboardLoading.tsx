import React from 'react'
import { View, ActivityIndicator } from 'react-native'

import { Colors } from '@/constants/theme'

import { dashboardStyles as styles } from '../dashboardStyles'

interface DashboardLoadingProps {
  backgroundColor: string
}

export function DashboardLoading({ backgroundColor }: DashboardLoadingProps) {
  return (
    <View style={[styles.loadingContainer, { backgroundColor }]}>
      <ActivityIndicator size="large" color={Colors.light.violet} />
    </View>
  )
}

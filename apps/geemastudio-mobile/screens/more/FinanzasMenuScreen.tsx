import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { MenuRow } from '@/components/MenuRow'
import { useTheme } from '@/hooks/useTheme'
import { usePendingBadgeCount } from '@/hooks/usePendingBadgeCount'
import { Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'FinanzasMenu'>

export default function FinanzasMenuScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const navigation = useNavigation<Nav>()
  const { paymentValidationCount } = usePendingBadgeCount()

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing['3xl'],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <MenuRow
        icon="bar-chart-2"
        label="Finanzas"
        onPress={() => navigation.navigate('Finanzas')}
      />
      <MenuRow
        icon="credit-card"
        label="Validación de Pagos"
        onPress={() => navigation.navigate('ValidacionPagos')}
        badgeCount={paymentValidationCount}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})

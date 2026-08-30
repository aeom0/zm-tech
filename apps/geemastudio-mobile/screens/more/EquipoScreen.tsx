import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { MenuRow } from '@/components/MenuRow'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { usePendingBadgeCount } from '@/hooks/usePendingBadgeCount'
import { Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'Equipo'>

export default function EquipoScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config } = useTenant()
  const navigation = useNavigation<Nav>()
  const { unassignedCount } = usePendingBadgeCount()

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
        icon="user-check"
        label={config.terminology.staff || 'Profesionales'}
        onPress={() => navigation.navigate('Personal')}
      />
      <MenuRow
        icon="users"
        label={`Asignar ${config.terminology.staff || 'Profesionales'}`}
        onPress={() => navigation.navigate('AsignarProfesionales')}
        badgeCount={unassignedCount}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})

import React from 'react'
import { ScrollView, StyleSheet, Alert } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { MenuRow } from '@/components/MenuRow'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'

export default function MarketingRedesScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config } = useTenant()
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>()

  const showProximamente = (feature: string) =>
    Alert.alert('Próximamente', `${feature} estará disponible en una próxima versión.`)

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
      {config.features?.whatsapp && (
        <>
          <MenuRow
            icon="send"
            label="Enviar Promo WA"
            onPress={() => navigation.navigate('PromoMasiva')}
          />
          <MenuRow
            icon="clock"
            label="Historial de promos"
            onPress={() => navigation.navigate('HistorialPromos')}
          />
        </>
      )}
      <MenuRow
        icon="instagram"
        label="Redes Sociales"
        onPress={() => showProximamente('La gestión de redes sociales')}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})

import React from 'react'
import { ScrollView, StyleSheet, Alert } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

import { MenuRow } from '@/components/MenuRow'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing } from '@/constants/theme'

export default function MarketingRedesScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config } = useTenant()

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
        <MenuRow
          icon="send"
          label="Enviar Promo WA"
          onPress={() => showProximamente('El envío masivo de promociones por WhatsApp')}
        />
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

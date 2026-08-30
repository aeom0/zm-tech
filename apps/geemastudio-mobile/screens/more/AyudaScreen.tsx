import React from 'react'
import { ScrollView, StyleSheet, Alert } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

import { ThemedText } from '@/components/ThemedText'
import { MenuRow } from '@/components/MenuRow'
import { useTheme } from '@/hooks/useTheme'
import { useAppInfo } from '@/screens/settings/hooks/useAppInfo'
import { Spacing } from '@/constants/theme'

export default function AyudaScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { appVersion } = useAppInfo()

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
        icon="help-circle"
        label="Preguntas frecuentes"
        onPress={() =>
          Alert.alert('Próximamente', 'Las preguntas frecuentes estarán disponibles pronto.')
        }
      />
      <MenuRow
        icon="message-circle"
        label="Contactar soporte"
        onPress={() =>
          Alert.alert('Próximamente', 'El contacto directo con soporte estará disponible pronto.')
        }
      />
      <MenuRow
        icon="info"
        label="Versión de la app"
        onPress={() => {}}
        rightElement={
          <ThemedText type="small" style={{ opacity: 0.6 }}>
            {appVersion}
          </ThemedText>
        }
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})

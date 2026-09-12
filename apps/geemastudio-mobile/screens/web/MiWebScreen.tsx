import React from 'react'
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { MenuRow } from '@/components/MenuRow'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useWebSettings } from '@/hooks/web/useWebSettings'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'
import { previewLandingUrl } from '@/screens/web/constants'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MiWeb'>

export default function MiWebScreen() {
  const navigation = useNavigation<Nav>()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data, isLoading, isError, error } = useWebSettings()

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot, padding: Spacing.lg }]}>
        <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
          {error instanceof Error
            ? error.message
            : 'No encontramos la configuración web de este negocio.'}
        </ThemedText>
      </View>
    )
  }

  const publicada = data.webEnabled && Boolean(data.slug)
  const previewUrl = data.slug ? previewLandingUrl(data.slug) : null

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
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText style={[styles.statusLabel, { color: theme.textSecondary }]}>
          Estado de la landing
        </ThemedText>
        <ThemedText style={[styles.statusValue, { color: publicada ? theme.primary : theme.warning }]}>
          {publicada ? 'Publicada en Geema' : 'No publicada'}
        </ThemedText>
        <ThemedText style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>
          Template: {data.webTemplate}
          {data.slug ? ` · /s/${data.slug}` : ''}
        </ThemedText>
        {previewUrl && publicada ? (
          <ThemedText
            style={{ color: theme.link, marginTop: Spacing.sm, fontSize: 14 }}
            onPress={() => void Linking.openURL(previewUrl)}
          >
            Abrir vista previa
          </ThemedText>
        ) : null}
      </View>

      <MenuRow
        icon="settings"
        label="Presencia (activar, template, slug)"
        onPress={() => navigation.navigate('MiWebPresencia')}
      />
      <MenuRow
        icon="edit-3"
        label="Contenido (textos y contacto)"
        onPress={() => navigation.navigate('MiWebContenido')}
      />
      <MenuRow
        icon="image"
        label="Galería"
        badgeCount={data.gallery.length || undefined}
        onPress={() => navigation.navigate('MiWebGaleria')}
      />
      <MenuRow
        icon="users"
        label="Equipo"
        badgeCount={data.team.length || undefined}
        onPress={() => navigation.navigate('MiWebEquipo')}
      />
      <MenuRow
        icon="tag"
        label="Promos"
        badgeCount={data.promos.length || undefined}
        onPress={() => navigation.navigate('MiWebPromos')}
      />
      <MenuRow
        icon="scissors"
        label="Servicios en la web"
        badgeCount={data.services.length || undefined}
        onPress={() => navigation.navigate('MiWebServicios')}
      />
      <MenuRow
        icon="message-circle"
        label="Reseñas"
        badgeCount={data.reviews.length || undefined}
        onPress={() => navigation.navigate('MiWebResenas')}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statusLabel: { fontSize: 12, fontWeight: '500' },
  statusValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
})

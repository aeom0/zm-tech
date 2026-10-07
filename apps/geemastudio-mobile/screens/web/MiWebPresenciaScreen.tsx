import React, { useCallback, useLayoutEffect, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useUpdateWebSettings, useWebSettings } from '@/hooks/web/useWebSettings'
import { slugifyWeb } from '@/services/webSettingsService'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'
import type { WebTemplate } from '@/types/web-landing'
import { Feather } from '@expo/vector-icons'
import { WEB_TEMPLATE_OPTIONS, previewLandingUrl } from '@/screens/web/constants'
import { WebField } from '@/screens/web/components/WebField'
import { useWebSaveHeader } from '@/screens/web/components/useWebSaveHeader'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MiWebPresencia'>

export default function MiWebPresenciaScreen() {
  const navigation = useNavigation<Nav>()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data } = useWebSettings()
  const update = useUpdateWebSettings()

  const [webEnabled, setWebEnabled] = useState(false)
  const [webTemplate, setWebTemplate] = useState<WebTemplate>('elegant')
  const [slug, setSlug] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Sincroniza el formulario cuando llegan datos nuevos (patrón React: ajustar estado durante el render)
  const [syncedData, setSyncedData] = useState(data)
  if (data && data !== syncedData) {
    setSyncedData(data)
    setWebEnabled(data.webEnabled)
    setWebTemplate(data.webTemplate)
    setSlug(data.slug ?? '')
    setCustomDomain(data.customDomain ?? '')
  }

  const guardar = useCallback(async () => {
    if (!data) return
    const slugLimpio = slugifyWeb(slug)
    if (webEnabled && !slugLimpio) {
      Alert.alert(
        'Falta la dirección',
        'Para publicar tu página en Geema necesitas una dirección (ej. mi-salon).'
      )
      return
    }
    setGuardando(true)
    try {
      await update.mutateAsync({
        rowId: data.rowId,
        patch: {
          webEnabled,
          webTemplate,
          slug: slugLimpio || null,
          customDomain: customDomain.trim() || null,
        },
      })
      Alert.alert('Listo', 'Presencia web guardada.')
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Error')
    } finally {
      setGuardando(false)
    }
  }, [customDomain, data, slug, update, webEnabled, webTemplate])

  const syncHeader = useWebSaveHeader(navigation, {
    guardando,
    primaryColor: theme.primary,
    onSave: () => void guardar(),
  })
  useLayoutEffect(() => {
    syncHeader()
  }, [syncHeader])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing['3xl'],
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.row, { borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontWeight: '600', color: theme.text }}>
            Publicar página web
          </ThemedText>
          <ThemedText style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
            Tu página quedará disponible en Geema
          </ThemedText>
        </View>
        <Switch
          value={webEnabled}
          onValueChange={setWebEnabled}
          trackColor={{ false: theme.border, true: theme.primary }}
        />
      </View>

      <ThemedText style={[styles.section, { color: theme.textSecondary }]}>Diseño</ThemedText>
      <ThemedText style={{ color: theme.textMuted, fontSize: 12, marginBottom: Spacing.sm }}>
        Usa los colores de tu negocio. Mira un ejemplo antes de elegir.
      </ThemedText>
      <View style={styles.templateList}>
        {WEB_TEMPLATE_OPTIONS.map((t) => {
          const active = webTemplate === t.id
          return (
            <Pressable
              key={t.id}
              onPress={() => setWebTemplate(t.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[
                styles.card,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}22` : theme.backgroundDefault,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={{ color: active ? theme.primary : theme.text, fontWeight: '600' }}
                >
                  {t.label}
                </ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                  {t.description}
                </ThemedText>
                <Pressable
                  onPress={() => void Linking.openURL(previewLandingUrl(t.demoSlug))}
                  hitSlop={8}
                  style={styles.demoLink}
                >
                  <Feather name="external-link" size={13} color={theme.link} />
                  <ThemedText style={{ color: theme.link, fontSize: 12, fontWeight: '600' }}>
                    Ver ejemplo
                  </ThemedText>
                </Pressable>
              </View>
              {active ? <Feather name="check-circle" size={20} color={theme.primary} /> : null}
            </Pressable>
          )
        })}
      </View>

      <WebField
        label="Dirección de tu página"
        value={slug}
        onChangeText={setSlug}
        placeholder="mi-salon"
        autoCapitalize="none"
        keyboardType="url"
      />
      <ThemedText
        style={{
          color: theme.textMuted,
          fontSize: 12,
          marginTop: -Spacing.sm,
          marginBottom: Spacing.md,
        }}
      >
        geema.zmtechdev.com/s/{slugifyWeb(slug) || '…'}
      </ThemedText>

      <WebField
        label="Dominio propio (informativo)"
        value={customDomain}
        onChangeText={setCustomDomain}
        placeholder="ej. misalon.com"
        autoCapitalize="none"
        keyboardType="url"
      />
      <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
        Geema no rutea este dominio todavía (Fase 3). Solo referencia.
      </ThemedText>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },
  section: { fontSize: 12, fontWeight: '600', marginBottom: Spacing.sm },
  templateList: { gap: Spacing.sm, marginBottom: Spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  demoLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
})

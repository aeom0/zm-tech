import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native'
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
import { WebField } from '@/screens/web/components/WebField'
import { useWebSaveHeader } from '@/screens/web/components/useWebSaveHeader'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MiWebPresencia'>

const TEMPLATES: { id: WebTemplate; label: string }[] = [
  { id: 'elegant', label: 'Elegant' },
  { id: 'warm', label: 'Warm' },
  { id: 'modern', label: 'Modern' },
]

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

  useEffect(() => {
    if (!data) return
    setWebEnabled(data.webEnabled)
    setWebTemplate(data.webTemplate)
    setSlug(data.slug ?? '')
    setCustomDomain(data.customDomain ?? '')
  }, [data])

  const guardar = useCallback(async () => {
    if (!data) return
    const slugLimpio = slugifyWeb(slug)
    if (webEnabled && !slugLimpio) {
      Alert.alert('Falta el slug', 'Para publicar en Geema necesitas un slug (ej. mi-salon).')
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
          <ThemedText style={{ fontWeight: '600', color: theme.text }}>Publicar landing</ThemedText>
          <ThemedText style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
            Activa /s/[slug] en Geema
          </ThemedText>
        </View>
        <Switch
          value={webEnabled}
          onValueChange={setWebEnabled}
          trackColor={{ false: theme.border, true: theme.primary }}
        />
      </View>

      <ThemedText style={[styles.section, { color: theme.textSecondary }]}>Template</ThemedText>
      <View style={styles.templateRow}>
        {TEMPLATES.map((t) => {
          const active = webTemplate === t.id
          return (
            <Pressable
              key={t.id}
              onPress={() => setWebTemplate(t.id)}
              style={[
                styles.chip,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}22` : theme.backgroundDefault,
                },
              ]}
            >
              <ThemedText style={{ color: active ? theme.primary : theme.text, fontWeight: '600' }}>
                {t.label}
              </ThemedText>
            </Pressable>
          )
        })}
      </View>

      <WebField
        label="Slug (URL pública)"
        value={slug}
        onChangeText={setSlug}
        placeholder="mi-salon"
        autoCapitalize="none"
        keyboardType="url"
      />
      <ThemedText style={{ color: theme.textMuted, fontSize: 12, marginTop: -Spacing.sm, marginBottom: Spacing.md }}>
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
  templateRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
})

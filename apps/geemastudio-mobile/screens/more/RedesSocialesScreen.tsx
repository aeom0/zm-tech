import React, { useCallback, useLayoutEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Feather } from '@expo/vector-icons'
import { socialProfileUrl } from '@zmtech/tenant-config'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useUpdateWebSettings, useWebSettings } from '@/hooks/web/useWebSettings'
import { Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'
import { WebField } from '@/screens/web/components/WebField'
import { useWebSaveHeader } from '@/screens/web/components/useWebSaveHeader'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'RedesSociales'>

export default function RedesSocialesScreen() {
  const navigation = useNavigation<Nav>()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data } = useWebSettings()
  const update = useUpdateWebSettings()

  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [guardando, setGuardando] = useState(false)

  useResetOnChange([data], () => {
    setInstagram(data?.instagram ?? '')
    setFacebook(data?.facebook ?? '')
    setTiktok(data?.tiktok ?? '')
  })

  const emptyToNull = (v: string) => (v.trim() ? v.trim() : null)

  const guardar = useCallback(async () => {
    if (!data) return
    setGuardando(true)
    try {
      await update.mutateAsync({
        rowId: data.rowId,
        patch: {
          instagram: emptyToNull(instagram),
          facebook: emptyToNull(facebook),
          tiktok: emptyToNull(tiktok),
        },
      })
      Alert.alert('Listo', 'Tus redes sociales se actualizaron en tu página web.')
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Error')
    } finally {
      setGuardando(false)
    }
  }, [data, facebook, instagram, tiktok, update])

  const syncHeader = useWebSaveHeader(navigation, {
    guardando,
    primaryColor: theme.primary,
    onSave: () => void guardar(),
  })
  useLayoutEffect(() => {
    syncHeader()
  }, [syncHeader])

  const preview = (platform: 'instagram' | 'facebook' | 'tiktok', value: string) => {
    const url = socialProfileUrl(platform, value)
    return url ? (
      <View style={styles.previewRow}>
        <Feather name="link" size={12} color={theme.textMuted} />
        <ThemedText style={[styles.preview, { color: theme.textMuted }]} numberOfLines={1}>
          {url}
        </ThemedText>
      </View>
    ) : null
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing['3xl'],
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={[styles.intro, { color: theme.textMuted }]}>
        Escribe tu usuario (por ejemplo @minegocio) o pega el enlace de tu perfil. Estas redes se
        muestran en tu página web.
      </ThemedText>
      <WebField
        label="Instagram"
        value={instagram}
        onChangeText={setInstagram}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="@minegocio"
      />
      {preview('instagram', instagram)}
      <WebField
        label="Facebook"
        value={facebook}
        onChangeText={setFacebook}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="facebook.com/minegocio"
      />
      {preview('facebook', facebook)}
      <WebField
        label="TikTok"
        value={tiktok}
        onChangeText={setTiktok}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="@minegocio"
      />
      {preview('tiktok', tiktok)}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, marginBottom: Spacing.lg },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -Spacing.xs, marginBottom: Spacing.md },
  preview: { fontSize: 12, flex: 1 },
})

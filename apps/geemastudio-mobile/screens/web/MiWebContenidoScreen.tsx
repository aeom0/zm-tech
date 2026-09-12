import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { Alert, ScrollView } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useUpdateWebSettings, useWebSettings } from '@/hooks/web/useWebSettings'
import { Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'
import { WebField } from '@/screens/web/components/WebField'
import { useWebSaveHeader } from '@/screens/web/components/useWebSaveHeader'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MiWebContenido'>

export default function MiWebContenidoScreen() {
  const navigation = useNavigation<Nav>()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data } = useWebSettings()
  const update = useUpdateWebSettings()

  const [heroTagline, setHeroTagline] = useState('')
  const [about, setAbout] = useState('')
  const [marqueeText, setMarqueeText] = useState('')
  const [heroVideoUrl, setHeroVideoUrl] = useState('')
  const [salonVideoUrl, setSalonVideoUrl] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [statClients, setStatClients] = useState('')
  const [statRating, setStatRating] = useState('')
  const [statYears, setStatYears] = useState('')
  const [mapEmbedUrl, setMapEmbedUrl] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!data) return
    setHeroTagline(data.heroTagline ?? '')
    setAbout(data.about ?? '')
    setMarqueeText(data.marqueeText ?? '')
    setHeroVideoUrl(data.heroVideoUrl ?? '')
    setSalonVideoUrl(data.salonVideoUrl ?? '')
    setWhatsapp(data.whatsapp ?? '')
    setInstagram(data.instagram ?? '')
    setFacebook(data.facebook ?? '')
    setTiktok(data.tiktok ?? '')
    setAddress(data.address ?? '')
    setCity(data.city ?? '')
    setStatClients(data.statClients)
    setStatRating(data.statRating)
    setStatYears(data.statYears)
    setMapEmbedUrl(data.mapEmbedUrl ?? '')
  }, [data])

  const emptyToNull = (v: string) => (v.trim() ? v.trim() : null)

  const guardar = useCallback(async () => {
    if (!data) return
    setGuardando(true)
    try {
      await update.mutateAsync({
        rowId: data.rowId,
        patch: {
          heroTagline: emptyToNull(heroTagline),
          about: emptyToNull(about),
          marqueeText: emptyToNull(marqueeText),
          heroVideoUrl: emptyToNull(heroVideoUrl),
          salonVideoUrl: emptyToNull(salonVideoUrl),
          whatsapp: emptyToNull(whatsapp),
          instagram: emptyToNull(instagram),
          facebook: emptyToNull(facebook),
          tiktok: emptyToNull(tiktok),
          address: emptyToNull(address),
          city: emptyToNull(city),
          statClients: statClients.trim() || '500+',
          statRating: statRating.trim() || '4.9',
          statYears: statYears.trim() || '3+',
          mapEmbedUrl: emptyToNull(mapEmbedUrl),
        },
      })
      Alert.alert('Listo', 'Contenido guardado.')
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Error')
    } finally {
      setGuardando(false)
    }
  }, [
    about,
    address,
    city,
    data,
    facebook,
    heroTagline,
    heroVideoUrl,
    instagram,
    mapEmbedUrl,
    marqueeText,
    salonVideoUrl,
    statClients,
    statRating,
    statYears,
    tiktok,
    update,
    whatsapp,
  ])

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
      <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginBottom: Spacing.sm }}>
        Textos principales
      </ThemedText>
      <WebField label="Hero / tagline" value={heroTagline} onChangeText={setHeroTagline} />
      <WebField label="Sobre nosotros" value={about} onChangeText={setAbout} multiline />
      <WebField label="Marquesina" value={marqueeText} onChangeText={setMarqueeText} />

      <ThemedText
        style={{ color: theme.textSecondary, fontSize: 12, marginBottom: Spacing.sm, marginTop: Spacing.md }}
      >
        Videos (URL)
      </ThemedText>
      <WebField
        label="Video hero"
        value={heroVideoUrl}
        onChangeText={setHeroVideoUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
      <WebField
        label="Video del salón"
        value={salonVideoUrl}
        onChangeText={setSalonVideoUrl}
        autoCapitalize="none"
        keyboardType="url"
      />

      <ThemedText
        style={{ color: theme.textSecondary, fontSize: 12, marginBottom: Spacing.sm, marginTop: Spacing.md }}
      >
        Contacto y redes
      </ThemedText>
      <WebField
        label="WhatsApp"
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
        autoCapitalize="none"
      />
      <WebField
        label="Instagram"
        value={instagram}
        onChangeText={setInstagram}
        autoCapitalize="none"
        placeholder="@usuario"
      />
      <WebField label="Facebook" value={facebook} onChangeText={setFacebook} autoCapitalize="none" />
      <WebField label="TikTok" value={tiktok} onChangeText={setTiktok} autoCapitalize="none" />
      <WebField label="Dirección" value={address} onChangeText={setAddress} />
      <WebField label="Ciudad" value={city} onChangeText={setCity} />

      <ThemedText
        style={{ color: theme.textSecondary, fontSize: 12, marginBottom: Spacing.sm, marginTop: Spacing.md }}
      >
        Stats
      </ThemedText>
      <WebField label="Clientes (ej. 500+)" value={statClients} onChangeText={setStatClients} />
      <WebField label="Rating (ej. 4.9)" value={statRating} onChangeText={setStatRating} />
      <WebField label="Años (ej. 3+)" value={statYears} onChangeText={setStatYears} />

      <WebField
        label="Mapa embed (URL)"
        value={mapEmbedUrl}
        onChangeText={setMapEmbedUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
    </ScrollView>
  )
}

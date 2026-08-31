/**
 * LogoNegocioScreen — Owner sube/cambia el logo del negocio.
 * Accesible desde Tab Más > Mi negocio > Logo del negocio.
 *
 * Comportamiento:
 * - Muestra logo actual si config.logo tiene valor, o placeholder con iniciales
 * - Botón "Cambiar logo" abre ImagePicker (cámara o galería)
 * - Al seleccionar, sube al bucket tenant-logos con useLogoUpload
 * - Guarda URL en TenantContext (updateTenant + syncRemote)
 * - Feedback visual: spinner durante upload, toast de éxito/error con Alert
 */
import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'
import Animated, { FadeIn } from 'react-native-reanimated'

import { ThemedText } from '@/components/ThemedText'
import { TenantLogoImage } from '@/components/TenantLogoImage'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { useLogoUpload } from '@/hooks/useLogoUpload'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { LogoBackgroundStyle } from '@zmtech/tenant-config'

const LOGO_SIZE = 120
const SWATCH_SIZE = 64

const BG_OPTIONS: { id: LogoBackgroundStyle; label: string }[] = [
  { id: 'transparent', label: 'Transparente' },
  { id: 'light', label: 'Fondo claro' },
  { id: 'dark', label: 'Fondo oscuro' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function LogoNegocioScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme, isDark } = useTheme()
  const { config, updateTenant } = useTenant()
  const { uploading, uploadLogo } = useLogoUpload()
  const [localUri, setLocalUri] = useState<string | null>(null)
  const [savingBg, setSavingBg] = useState<LogoBackgroundStyle | null>(null)

  const currentLogo = localUri || config.logo || null
  const initials = getInitials(config.businessName || 'GeemaStudio')
  const activeBgStyle = isDark
    ? (config.logoBgDark ?? 'transparent')
    : (config.logoBgLight ?? 'transparent')

  const handleSelectBg = async (mode: 'logoBgLight' | 'logoBgDark', value: LogoBackgroundStyle) => {
    setSavingBg(value)
    try {
      await updateTenant({ [mode]: value }, { syncRemote: true })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {
      Alert.alert('Error', 'No se pudo guardar la preferencia de fondo.')
    } finally {
      setSavingBg(null)
    }
  }

  const handleUpload = async (uri: string) => {
    setLocalUri(uri)
    const result = await uploadLogo(uri)
    if (result.ok && result.url) {
      await updateTenant({ logo: result.url }, { syncRemote: true })
      Alert.alert('✓ Logo guardado', 'El logo se actualizó correctamente.')
    } else {
      setLocalUri(null)
      Alert.alert('Error', result.error ?? 'No se pudo subir el logo.')
    }
  }

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.')
      return
    }

    Alert.alert('Logo del negocio', '¿De dónde quieres tomar el logo?', [
      {
        text: 'Cámara',
        onPress: async () => {
          const cam = await ImagePicker.requestCameraPermissionsAsync()
          if (cam.status !== 'granted') return
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
          })
          if (!result.canceled && result.assets[0]) {
            await handleUpload(result.assets[0].uri)
          }
        },
      },
      {
        text: 'Galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
          })
          if (!result.canceled && result.assets[0]) {
            await handleUpload(result.assets[0].uri)
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing['3xl'],
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Logo actual
      </ThemedText>

      <Animated.View entering={FadeIn.duration(400)} style={styles.logoWrap}>
        {currentLogo ? (
          <TenantLogoImage uri={currentLogo} size={LOGO_SIZE} bgStyle={activeBgStyle} />
        ) : (
          <View
            style={[
              styles.logoPlaceholder,
              {
                backgroundColor: `${theme.primary}26`,
                borderColor: `${theme.primary}4D`,
              },
            ]}
          >
            <ThemedText style={[styles.logoInitials, { color: theme.primary }]}>
              {initials}
            </ThemedText>
          </View>
        )}
        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}
      </Animated.View>

      <ThemedText style={[styles.hintText, { color: theme.textSecondary }]}>
        Recomendado: imagen cuadrada de al menos 512×512px.{'\n'}
        Se mostrará en la pantalla de login de tu negocio.
      </ThemedText>

      <Pressable
        onPress={handlePickImage}
        disabled={uploading}
        style={({ pressed }) => [
          styles.pickButton,
          {
            borderColor: `${theme.primary}99`,
            opacity: pressed || uploading ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="upload" size={18} color={theme.primary} />
        <ThemedText style={[styles.pickButtonLabel, { color: theme.primary }]}>
          {currentLogo ? 'Cambiar logo' : 'Subir logo'}
        </ThemedText>
      </Pressable>

      {currentLogo && (
        <Pressable
          onPress={async () => {
            Alert.alert(
              'Quitar logo',
              '¿Seguro que quieres quitar el logo? Se usarán las iniciales como fallback.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Quitar',
                  style: 'destructive',
                  onPress: async () => {
                    setLocalUri(null)
                    await updateTenant({ logo: '' }, { syncRemote: true })
                  },
                },
              ]
            )
          }}
          style={styles.removeButton}
        >
          <ThemedText style={{ fontSize: 13, color: theme.error ?? '#E57373' }}>
            Quitar logo
          </ThemedText>
        </Pressable>
      )}

      {currentLogo && (
        <View style={styles.bgSection}>
          <BgPicker
            title="Fondo en modo claro"
            uri={currentLogo}
            selected={config.logoBgLight ?? 'transparent'}
            saving={savingBg}
            theme={theme}
            onSelect={(id) => handleSelectBg('logoBgLight', id)}
          />
          <BgPicker
            title="Fondo en modo oscuro"
            uri={currentLogo}
            selected={config.logoBgDark ?? 'transparent'}
            saving={savingBg}
            theme={theme}
            onSelect={(id) => handleSelectBg('logoBgDark', id)}
          />
        </View>
      )}
    </ScrollView>
  )
}

interface BgPickerProps {
  title: string
  uri: string
  selected: LogoBackgroundStyle
  saving: LogoBackgroundStyle | null
  theme: { text: string; textSecondary: string; primary: string; border: string }
  onSelect: (id: LogoBackgroundStyle) => void
}

function BgPicker({ title, uri, selected, saving, theme, onSelect }: BgPickerProps) {
  return (
    <View style={styles.bgGroup}>
      <ThemedText style={[styles.bgGroupTitle, { color: theme.text }]}>{title}</ThemedText>
      <View style={styles.swatchRow}>
        {BG_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(opt.id)}
              disabled={saving !== null}
              style={styles.swatchItem}
            >
              <View
                style={[
                  styles.swatchRing,
                  {
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                    opacity: saving === opt.id ? 0.5 : 1,
                  },
                ]}
              >
                <TenantLogoImage uri={uri} size={SWATCH_SIZE} bgStyle={opt.id} />
                {saving === opt.id && (
                  <View style={styles.swatchOverlay}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                )}
              </View>
              <ThemedText
                style={[
                  styles.swatchLabel,
                  { color: isSelected ? theme.primary : theme.textSecondary },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  logoImage: { width: LOGO_SIZE, height: LOGO_SIZE },
  logoPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  logoInitials: { fontSize: 38, fontWeight: '700' },
  uploadOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['2xl'],
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  pickButtonLabel: { fontSize: 15, fontWeight: '600' },
  removeButton: { marginTop: Spacing.sm, padding: Spacing.sm },
  bgSection: { width: '100%', marginTop: Spacing.xl, gap: Spacing.xl },
  bgGroup: { width: '100%' },
  bgGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  swatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  swatchItem: { alignItems: 'center', gap: Spacing.xs },
  swatchRing: {
    width: SWATCH_SIZE + 8,
    height: SWATCH_SIZE + 8,
    borderRadius: (SWATCH_SIZE + 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  swatchOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: (SWATCH_SIZE + 8) / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
})

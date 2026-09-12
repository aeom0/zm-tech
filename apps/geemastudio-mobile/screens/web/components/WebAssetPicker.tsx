import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { uploadWebAsset } from '@/lib/webAssets'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { WebAssetFolder } from '@/types/web-landing'

interface WebAssetPickerProps {
  label: string
  imageUrl: string | null | undefined
  tenantSlug: string
  folder: WebAssetFolder
  onUploaded: (url: string) => void
  onCleared?: () => void
}

export function WebAssetPicker({
  label,
  imageUrl,
  tenantSlug,
  folder,
  onUploaded,
  onCleared,
}: WebAssetPickerProps) {
  const { theme } = useTheme()
  const [uploading, setUploading] = useState(false)

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permiso', 'Se necesita acceso a la galería para subir fotos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    })
    if (result.canceled || !result.assets[0]?.uri) return

    setUploading(true)
    try {
      const { publicUrl } = await uploadWebAsset(tenantSlug, folder, result.assets[0].uri)
      onUploaded(publicUrl)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo subir la imagen'
      Alert.alert('Error al subir', msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
      <View style={styles.row}>
        <View
          style={[
            styles.preview,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <Feather name="image" size={28} color={theme.textMuted} />
          )}
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => void pick()}
            disabled={uploading}
            style={[styles.btn, { backgroundColor: theme.primary }]}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.btnText}>
                {imageUrl ? 'Cambiar foto' : 'Subir foto'}
              </ThemedText>
            )}
          </Pressable>
          {imageUrl && onCleared ? (
            <Pressable onPress={onCleared} style={styles.clearBtn}>
              <ThemedText style={{ color: theme.error, fontSize: 13 }}>Quitar</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: { fontSize: 12, marginBottom: Spacing.xs, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  preview: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  actions: { flex: 1, gap: Spacing.sm },
  btn: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  clearBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
})

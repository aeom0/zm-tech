import React from 'react'
import { View, StyleSheet, TextInput, Image, Pressable, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

import { ThemedText } from '@/components/ThemedText'
import { Button } from '@/components/Button'
import { useTheme } from '@/hooks/useTheme'
import { useHaptics } from '@/hooks/useHaptics'
import { supabase } from '@/lib/supabase'
import { Colors, Spacing, BorderRadius } from '@/constants/theme'

interface StepConfigProps {
  titulo: string
  bodyText: string
  imageUri: string | null
  imageUrl: string | null
  onChangeTitulo: (value: string) => void
  onChangeBodyText: (value: string) => void
  onChangeImage: (uri: string | null, url: string | null) => void
  onValidNext: () => void
}

export function StepConfig({
  titulo,
  bodyText,
  imageUri,
  imageUrl,
  onChangeTitulo,
  onChangeBodyText,
  onChangeImage,
  onValidNext,
}: StepConfigProps) {
  const { theme } = useTheme()
  const haptics = useHaptics()

  const remaining = 600 - bodyText.length
  const isValid = titulo.trim().length > 0 && bodyText.trim().length > 0 && !!imageUrl

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Necesitamos acceso a tu galería para subir la imagen. Actívalo en Configuración.'
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })

    if (result.canceled || !result.assets?.length) return
    const asset = result.assets[0]
    if (!asset.uri) return

    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`

      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: 'image/jpeg',
      } as unknown as Blob)

      const { data, error } = await supabase.storage.from('promo-images').upload(fileName, formData, {
        contentType: 'multipart/form-data',
        cacheControl: '3600',
        upsert: true,
      })

      if (error) {
        console.error('[StepConfig] upload error:', error)
        Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.')
        return
      }

      const { data: urlData } = supabase.storage.from('promo-images').getPublicUrl(data.path)

      onChangeImage(asset.uri, urlData.publicUrl)
      haptics.success()
    } catch (err) {
      console.error('[StepConfig] upload error:', err)
      Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.')
    }
  }

  const handleRemoveImage = () => {
    onChangeImage(null, null)
  }

  const handleContinue = () => {
    if (!isValid) return
    haptics.selection()
    onValidNext()
  }

  return (
    <View style={styles.container}>
      <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
        Configura tu promo
      </ThemedText>

      <ThemedText type="small" style={{ marginBottom: Spacing.xs }}>
        Título interno
      </ThemedText>
      <TextInput
        value={titulo}
        onChangeText={onChangeTitulo}
        placeholder="Ej: Promo de marzo"
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundDefault,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
      />

      <ThemedText type="small" style={{ marginTop: Spacing.lg, marginBottom: Spacing.xs }}>
        Texto de la promo
      </ThemedText>
      <TextInput
        value={bodyText}
        onChangeText={(text) => {
          if (text.length <= 600) onChangeBodyText(text)
        }}
        placeholder="Cuéntale a tus clientas la promo, con lenguaje cercano y claro..."
        placeholderTextColor={theme.textMuted}
        style={[
          styles.textArea,
          {
            backgroundColor: theme.backgroundDefault,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        multiline
        textAlignVertical="top"
      />
      <ThemedText
        type="small"
        style={{
          alignSelf: 'flex-end',
          marginTop: Spacing.xs,
          color: remaining < 0 ? theme.error : theme.textSecondary,
        }}
      >
        {bodyText.length}/600
      </ThemedText>

      <ThemedText type="small" style={{ marginTop: Spacing.lg, marginBottom: Spacing.xs }}>
        Imagen de la promo
      </ThemedText>

      {imageUri ? (
        <View style={styles.imageRow}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <Pressable
            onPress={handleRemoveImage}
            style={[styles.removeButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <ThemedText type="small" style={{ color: theme.error }}>
              Quitar
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <Button onPress={handlePickImage} style={{ marginTop: Spacing.xs, marginBottom: Spacing['2xl'] }}>
          Subir imagen
        </Button>
      )}

      <Button onPress={handleContinue} disabled={!isValid} style={{ marginTop: Spacing['2xl'] }}>
        Continuar
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    minHeight: 140,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.border,
  },
  removeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
})

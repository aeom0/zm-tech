// ============================================================
// Captura de foto con reglas ML visibles (cámara o galería)
// ============================================================
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Screen } from '../../components/layout/Screen'
import { productPhotoService } from '../../services/productPhotoService'
import { PHOTO_SLOT_LABELS } from '../../utils/mlPhotoRules'
import { hapticError, hapticLight } from '../../utils/haptics'
import { colors, typography, spacing, borderRadius } from '../../utils/theme'
import type { InventoryStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InventoryStackParamList, 'PhotoCapture'>

const REGLAS = [
  'Fondo claro y liso. Sin taller de fondo.',
  'Una sola pieza. Sin logo, texto ni WhatsApp.',
  'JPG o PNG · mínimo 500 px · ideal 1200×1200',
]

export default function PhotoCaptureScreen({ route, navigation }: Props) {
  const { slotIndex, productId } = route.params
  const [busy, setBusy] = useState(false)
  const titulo = `Foto ${PHOTO_SLOT_LABELS[slotIndex] ?? 'de pieza'}`

  const procesar = async (origen: 'camara' | 'galeria') => {
    setBusy(true)
    try {
      await hapticLight()
      const asset =
        origen === 'camara'
          ? await productPhotoService.abrirCamara()
          : await productPhotoService.abrirGaleria()
      if (!asset) return
      navigation.replace('PhotoReview', {
        slotIndex,
        productId,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
      })
    } catch (err) {
      await hapticError()
      const msg = err instanceof Error ? err.message : 'No se pudo abrir la cámara.'
      Alert.alert('Permiso o error', msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.navGhost} numberOfLines={1}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{titulo}</Text>
        <View style={styles.navPad} />
      </View>

      <View style={styles.viewfinder}>
        <View style={styles.guide} />
        <Text style={styles.guideHint}>Centra la pieza · ~95% del recuadro</Text>
      </View>

      <View style={styles.rules}>
        {REGLAS.map((texto) => (
          <View key={texto} style={styles.ruleRow}>
            <Ionicons name="checkmark" size={16} color={colors.semantic.success} />
            <Text style={styles.ruleText}>{texto}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => void procesar('galeria')}
          disabled={busy}
          accessibilityLabel="Elegir de la galería"
        >
          <Ionicons name="image-outline" size={28} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shutter}
          onPress={() => void procesar('camara')}
          disabled={busy}
          accessibilityLabel="Tomar foto"
        >
          {busy ? (
            <ActivityIndicator color={colors.brand.orange} />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>

        <View style={styles.sideBtn} />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navGhost: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    width: 90,
  },
  navTitle: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  navPad: { width: 90 },
  viewfinder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    borderWidth: 2,
    borderColor: colors.brand.orange,
    borderRadius: borderRadius.md,
  },
  guideHint: {
    position: 'absolute',
    bottom: 36,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.brand.orange,
  },
  rules: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ruleText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  actions: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  sideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: colors.brand.orange,
    backgroundColor: colors.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.text.primary,
  },
})

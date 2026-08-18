// ============================================================
// Revisión post-captura: pasa o falla las reglas ML locales
// ============================================================
import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Screen } from '../../components/layout/Screen'
import { productPhotoService } from '../../services/productPhotoService'
import { evaluarFotoMl } from '../../utils/mlPhotoRules'
import { hapticError, hapticSuccess } from '../../utils/haptics'
import { colors, typography, spacing, borderRadius } from '../../utils/theme'
import type { InventoryStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InventoryStackParamList, 'PhotoReview'>

export default function PhotoReviewScreen({ route, navigation }: Props) {
  const { slotIndex, productId, uri, width, height, fileSize, mimeType } = route.params
  const [busy, setBusy] = useState(false)

  const resultado = useMemo(
    () => evaluarFotoMl({ width, height, fileSize, mimeType }),
    [width, height, fileSize, mimeType]
  )

  const volverACaptura = () => {
    navigation.replace('PhotoCapture', { slotIndex, productId })
  }

  const usarFoto = async () => {
    if (!resultado.ok) return
    setBusy(true)
    try {
      const lista = await productPhotoService.prepararParaMl(uri, width, height)
      await hapticSuccess()
      navigation.navigate('ProductForm', {
        productId,
        pendingPhoto: { slotIndex, uri: lista },
      })
    } catch (err) {
      await hapticError()
      const msg = err instanceof Error ? err.message : 'No se pudo preparar la foto.'
      Alert.alert('Error', msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={volverACaptura} hitSlop={12}>
          <Text style={styles.navGhost}>Otra foto</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Revisar portada</Text>
        <View style={styles.navPad} />
      </View>

      <View style={[styles.preview, !resultado.ok && styles.previewFail]}>
        {resultado.ok ? (
          <Image source={{ uri }} style={styles.previewImg} />
        ) : (
          <Ionicons name="image-outline" size={56} color={colors.semantic.error} />
        )}
        {resultado.ok ? (
          <Text style={styles.previewMeta}>
            {Math.min(width, height)} × {Math.min(width, height)} · JPG
          </Text>
        ) : null}
      </View>

      {!resultado.ok && resultado.mensajeError ? (
        <View style={styles.banner} accessibilityRole="alert">
          <Text style={styles.bannerTitle}>ML no va a aceptar esta foto</Text>
          <Text style={styles.bannerBody}>{resultado.mensajeError}</Text>
        </View>
      ) : null}

      <View style={styles.checks}>
        {resultado.chequeos.map((c) => (
          <View key={c.id} style={styles.checkRow}>
            <Ionicons
              name={c.ok ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={c.ok ? colors.semantic.success : colors.semantic.error}
            />
            <Text style={styles.checkLabel}>{c.label}</Text>
          </View>
        ))}
        <Text style={styles.disclaimer}>
          No detectamos logos automáticamente. Revisa que no haya texto ni marca de agua.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.cta, busy && styles.ctaDisabled]}
        onPress={() => (resultado.ok ? void usarFoto() : volverACaptura())}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <Text style={styles.ctaLabel}>{resultado.ok ? 'Usar esta foto' : 'Tomar otra vez'}</Text>
        )}
      </TouchableOpacity>
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
    width: 80,
  },
  navTitle: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  navPad: { width: 80 },
  preview: {
    width: '100%',
    height: 280,
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewFail: {
    opacity: 0.85,
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewMeta: {
    position: 'absolute',
    bottom: spacing.sm,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  banner: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.semantic.error,
  },
  bannerTitle: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.semantic.error,
    marginBottom: spacing.xs,
  },
  bannerBody: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  checks: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkLabel: {
    flex: 1,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
  },
  disclaimer: {
    marginTop: spacing.sm,
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
  },
  cta: {
    marginTop: 'auto',
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
})

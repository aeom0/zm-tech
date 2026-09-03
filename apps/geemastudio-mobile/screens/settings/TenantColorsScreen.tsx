/**
 * TenantColorsScreen — Owner edita el color principal y de acento del negocio.
 * Accesible desde Tab Más > Mi negocio > Datos del negocio > Colores de marca.
 *
 * Reutiliza las paletas y el selector HSV del onboarding (paso 3) para mantener
 * una sola fuente de verdad de los colores sugeridos.
 */
import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius, Gradients } from '@/constants/theme'
import { CustomColorPickerModal } from '@/screens/onboarding/components/CustomColorPickerModal'
import {
  COLORES_ACENTO,
  COLORES_PRIMARIOS,
} from '@/screens/onboarding/constants/colores-onboarding'

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if (full.length !== 6) return `rgba(128,128,128,${alpha})`
  const n = parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

export default function TenantColorsScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config, updateTenant } = useTenant()

  const [colorPrimario, setColorPrimario] = useState(config.theme.primaryColor)
  const [colorAcento, setColorAcento] = useState(config.theme.accentColor)
  const [selectorColor, setSelectorColor] = useState<'primary' | 'accent' | null>(null)
  const [saving, setSaving] = useState(false)

  const esPrimarioDePaleta = COLORES_PRIMARIOS.some((c) => c.valor === colorPrimario)
  const esAcentoDePaleta = COLORES_ACENTO.some((c) => c.valor === colorAcento)
  const acentoLabel = COLORES_ACENTO.find((c) => c.valor === colorAcento)?.label ?? 'Personalizado'
  const hayCambios =
    colorPrimario !== config.theme.primaryColor || colorAcento !== config.theme.accentColor

  const guardar = async () => {
    setSaving(true)
    try {
      await updateTenant(
        {
          theme: {
            ...config.theme,
            primaryColor: colorPrimario,
            accentColor: colorAcento,
          },
        },
        { syncRemote: true }
      )
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing['3xl'],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.previewCard,
            {
              borderColor: hexToRgba(colorPrimario, 0.35),
              backgroundColor: theme.backgroundDefault,
            },
          ]}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: hexToRgba(colorPrimario, 0.08), borderRadius: BorderRadius.lg },
            ]}
          />
          <View style={[styles.previewIconBg, { backgroundColor: hexToRgba(colorPrimario, 0.18) }]}>
            <Feather name="star" size={26} color={colorPrimario} />
          </View>
          <ThemedText style={[styles.previewNombre, { color: theme.text }]}>
            {config.businessName}
          </ThemedText>
          <View style={[styles.acentoBadge, { backgroundColor: hexToRgba(colorAcento, 0.18) }]}>
            <View style={[styles.acentoDot, { backgroundColor: colorAcento }]} />
            <ThemedText style={[styles.acentoLabel, { color: colorAcento }]}>
              {acentoLabel}
            </ThemedText>
          </View>
          <ThemedText style={[styles.previewSub, { color: theme.textMuted }]}>
            Vista previa de tu marca
          </ThemedText>
          <View style={[styles.accentBar, { backgroundColor: colorAcento }]} />
        </View>

        <View style={styles.campo}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Color principal
          </ThemedText>
          <View style={styles.paletaPrimaria}>
            {COLORES_PRIMARIOS.map((c) => (
              <Pressable
                key={c.valor}
                onPress={() => setColorPrimario(c.valor)}
                style={[
                  styles.swatchOuterPrimaria,
                  { borderColor: theme.border },
                  colorPrimario === c.valor && esPrimarioDePaleta && { borderColor: theme.text },
                ]}
              >
                <View style={[styles.swatchPrimaria, { backgroundColor: c.valor }]} />
              </Pressable>
            ))}
            <Pressable
              onPress={() => setSelectorColor('primary')}
              style={[
                styles.swatchOuterPrimaria,
                { borderColor: theme.border },
                !esPrimarioDePaleta && { borderColor: theme.text },
              ]}
              accessibilityLabel="Elegir color personalizado principal"
            >
              <LinearGradient
                colors={[...Gradients.onboarding.colors]}
                start={Gradients.onboarding.linearStart}
                end={Gradients.onboarding.linearEnd}
                style={styles.swatchCustomPrimaria}
              >
                <Feather name="sliders" size={16} color="rgba(255,255,255,0.95)" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        <View style={styles.campo}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Color de acento
          </ThemedText>
          <View style={styles.paleta}>
            {COLORES_ACENTO.map((c) => (
              <Pressable
                key={c.valor}
                onPress={() => setColorAcento(c.valor)}
                style={[
                  styles.swatchOuter,
                  { borderColor: theme.border },
                  colorAcento === c.valor && esAcentoDePaleta && { borderColor: theme.text },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: c.valor }]} />
              </Pressable>
            ))}
            <Pressable
              onPress={() => setSelectorColor('accent')}
              style={[
                styles.swatchOuter,
                { borderColor: theme.border },
                !esAcentoDePaleta && { borderColor: theme.text },
              ]}
              accessibilityLabel="Elegir color personalizado de acento"
            >
              <LinearGradient
                colors={[...Gradients.onboarding.colors]}
                start={Gradients.onboarding.linearStart}
                end={Gradients.onboarding.linearEnd}
                style={styles.swatchCustom}
              >
                <Feather name="sliders" size={20} color="rgba(255,255,255,0.95)" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={guardar}
          disabled={!hayCambios || saving}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.primary,
              opacity: !hayCambios || saving ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <ThemedText style={styles.saveButtonLabel}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <CustomColorPickerModal
        visible={selectorColor !== null}
        initialHex={selectorColor === 'accent' ? colorAcento : colorPrimario}
        titulo={
          selectorColor === 'accent'
            ? 'Color de acento personalizado'
            : 'Color principal personalizado'
        }
        onClose={() => setSelectorColor(null)}
        onConfirm={(hex) => {
          if (selectorColor === 'accent') {
            setColorAcento(hex)
          } else if (selectorColor === 'primary') {
            setColorPrimario(hex)
          }
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  campo: { marginBottom: Spacing.xl },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paleta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paletaPrimaria: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    alignItems: 'center',
  },
  swatchOuterPrimaria: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
  },
  swatchPrimaria: {
    ...StyleSheet.absoluteFill,
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 5,
  },
  swatchCustomPrimaria: {
    ...StyleSheet.absoluteFill,
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOuter: {
    width: 48,
    height: 48,
    borderRadius: 8,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  swatchCustom: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.lg + 3,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  previewIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewNombre: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  acentoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  acentoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  acentoLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  previewSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  saveButton: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
})

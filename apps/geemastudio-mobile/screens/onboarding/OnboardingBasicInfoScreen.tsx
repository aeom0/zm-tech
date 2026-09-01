import React, { useState } from 'react'
import { View, StyleSheet, TextInput, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from '@/screens/onboarding/components'
import { CustomColorPickerModal } from '@/screens/onboarding/components/CustomColorPickerModal'
import {
  COLORES_ACENTO,
  COLORES_PRIMARIOS,
} from '@/screens/onboarding/constants/colores-onboarding'
import { Colors, Gradients, Spacing } from '@/constants/theme'
import { useTenant } from '@/contexts/TenantContext'

interface OnboardingBasicInfoScreenProps {
  onNext: () => void
  onBack: () => void
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if (full.length !== 6) return `rgba(255,255,255,${alpha})`
  const n = parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

export default function OnboardingBasicInfoScreen({
  onNext,
  onBack,
}: OnboardingBasicInfoScreenProps) {
  const { config, updateTenant } = useTenant()
  const [nombre, setNombre] = useState(
    config.businessName === 'Mi Salón' ? '' : config.businessName
  )
  const [colorPrimario, setColorPrimario] = useState(config.theme.primaryColor)
  const [colorAcento, setColorAcento] = useState(config.theme.accentColor)
  const [error, setError] = useState<string | null>(null)
  const [selectorColor, setSelectorColor] = useState<'primary' | 'accent' | null>(null)
  const esPrimarioDePaleta = COLORES_PRIMARIOS.some((c) => c.valor === colorPrimario)
  const esAcentoDePaleta = COLORES_ACENTO.some((c) => c.valor === colorAcento)

  // Encuentra el label del color de acento activo
  const acentoLabel = COLORES_ACENTO.find((c) => c.valor === colorAcento)?.label ?? 'Personalizado'

  const continuar = async () => {
    const nombreFinal = nombre.trim()
    if (!nombreFinal) {
      setError('El nombre del negocio es obligatorio.')
      return
    }
    await updateTenant({
      businessName: nombreFinal,
      theme: {
        ...config.theme,
        primaryColor: colorPrimario,
        accentColor: colorAcento,
      },
    })
    onNext()
  }

  return (
    <OnboardingLayout scrollable>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <ThemedText style={styles.badge}>PASO 3 DE 7</ThemedText>
        <OnboardingProgressDots currentStep={2} />
        <ThemedText style={styles.titulo}>Cuéntanos sobre tu negocio</ThemedText>
        <ThemedText style={styles.subtitulo}>Elige el nombre y la identidad visual</ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Nombre del negocio *</ThemedText>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="Ej. Spa Bella, Barbería Clásica…"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={nombre}
          onChangeText={(t) => {
            setNombre(t)
            setError(null)
          }}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Color principal</ThemedText>
        <View style={styles.paletaPrimaria}>
          {COLORES_PRIMARIOS.map((c) => (
            <Pressable
              key={c.valor}
              onPress={() => setColorPrimario(c.valor)}
              style={[
                styles.swatchOuterPrimaria,
                colorPrimario === c.valor && esPrimarioDePaleta && styles.swatchOuterSelected,
              ]}
            >
              <View style={[styles.swatchPrimaria, { backgroundColor: c.valor }]} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => setSelectorColor('primary')}
            style={[styles.swatchOuterPrimaria, !esPrimarioDePaleta && styles.swatchOuterSelected]}
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
      </Animated.View>

      {/* Preview card — reacciona a colorPrimario Y colorAcento */}
      <Animated.View
        entering={FadeInDown.delay(320).duration(400)}
        style={[styles.previewCard, { borderColor: hexToRgba(colorPrimario, 0.35) }]}
      >
        {/* Fondo tintado con color primario */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: hexToRgba(colorPrimario, 0.08),
              borderRadius: 16,
            },
          ]}
        />

        {/* Ícono — star, neutro para cualquier tipo de negocio */}
        <View style={[styles.previewIconBg, { backgroundColor: hexToRgba(colorPrimario, 0.18) }]}>
          <Feather name="star" size={26} color={colorPrimario} />
        </View>

        <ThemedText style={styles.previewNombre}>
          {nombre.trim() || 'Mi Estudio Profesional'}
        </ThemedText>

        {/* Badge de acento — muestra el color activo */}
        <View style={[styles.acentoBadge, { backgroundColor: hexToRgba(colorAcento, 0.18) }]}>
          <View style={[styles.acentoDot, { backgroundColor: colorAcento }]} />
          <ThemedText style={[styles.acentoLabel, { color: colorAcento }]}>
            {acentoLabel}
          </ThemedText>
        </View>

        <ThemedText style={styles.previewSub}>Vista previa de tu marca</ThemedText>

        {/* Barra de acento en el borde inferior */}
        <View style={[styles.accentBar, { backgroundColor: colorAcento }]} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Color de acento</ThemedText>
        <View style={styles.paleta}>
          {COLORES_ACENTO.map((c) => (
            <Pressable
              key={c.valor}
              onPress={() => setColorAcento(c.valor)}
              style={[
                styles.swatchOuter,
                colorAcento === c.valor && esAcentoDePaleta && styles.swatchOuterSelected,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: c.valor }]} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => setSelectorColor('accent')}
            style={[styles.swatchOuter, !esAcentoDePaleta && styles.swatchOuterSelected]}
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
      </Animated.View>

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

      <Animated.View entering={FadeInDown.delay(480).duration(400)} style={styles.botones}>
        <GradientCTAButton
          variant="outline"
          label="Atrás"
          onPress={onBack}
          style={styles.btnFlex}
        />
        <GradientCTAButton
          label="Continuar"
          icon="arrow-right"
          onPress={continuar}
          style={styles.btnFlexWide}
        />
      </Animated.View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: Spacing['2xl'],
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#40E0D0',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  subtitulo: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 22,
  },
  campo: { marginBottom: Spacing.xl },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputError: { borderColor: Colors.light.error },
  errorText: { color: Colors.light.error, fontSize: 12, marginTop: 4 },
  paleta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  /** 6 sugeridos + custom en una sola fila; aspectRatio 1 = cuadrados (ancho vía flex). */
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
    borderColor: 'transparent',
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
    borderColor: 'transparent',
  },
  swatchOuterSelected: {
    borderColor: '#FFFFFF',
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
    borderRadius: 16,
    borderWidth: 0.5,
    padding: Spacing.lg,
    paddingBottom: Spacing.lg + 3, // espacio para la accentBar
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
    color: '#FFFFFF',
    textAlign: 'center',
  },
  acentoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  botones: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  btnFlex: {
    flex: 1,
  },
  btnFlexWide: {
    flex: 2,
  },
})

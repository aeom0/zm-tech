import React, { useMemo, useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from '@/screens/onboarding/components'
import { Gradients, Onboarding, Spacing } from '@/constants/theme'
import { useTenant } from '@/contexts/TenantContext'
import {
  countriesForPicker,
  localeFromCountry,
  type CountryPreset,
} from '@zmtech/tenant-config'

interface OnboardingCountryScreenProps {
  onNext: () => void
  onBack?: () => void
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

export default function OnboardingCountryScreen({
  onNext,
  onBack,
}: OnboardingCountryScreenProps) {
  const { config, updateTenant } = useTenant()
  const paises = useMemo(() => countriesForPicker(), [])
  const featured = paises.find((p) => p.featured) ?? paises[0]
  const otros = paises.filter((p) => p.code !== featured?.code)

  const [seleccionado, setSeleccionado] = useState(
    (config.locale.country as CountryPreset['code']) || featured.code
  )

  const presetActual = paises.find((p) => p.code === seleccionado) ?? featured

  const continuar = async () => {
    const locale = localeFromCountry(seleccionado)
    if (!locale) return
    await updateTenant({ locale })
    onNext()
  }

  return (
    <OnboardingLayout scrollable>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backRow} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={Onboarding.textMuted} />
          <ThemedText style={styles.backText}>Volver</ThemedText>
        </Pressable>
      ) : null}

      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <ThemedText style={[styles.badge, { color: Onboarding.lunarisAccent }]}>
          PASO 1 DE 5
        </ThemedText>
        <OnboardingProgressDots currentStep={1} />
        <ThemedText style={[styles.titulo, { color: Onboarding.text }]}>
          ¿Desde dónde operas?
        </ThemedText>
        <ThemedText style={[styles.subtitulo, { color: Onboarding.textMuted }]}>
          Moneda, zona horaria y feriados se configuran según tu país
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <Pressable
          onPress={() => setSeleccionado(featured.code)}
          style={({ pressed }) => [pressed && { opacity: 0.92 }]}
        >
          {seleccionado === featured.code ? (
            <LinearGradient
              colors={[...Gradients.onboarding.colors]}
              locations={[...Gradients.onboarding.locations]}
              start={Gradients.onboarding.linearStart}
              end={Gradients.onboarding.linearEnd}
              style={styles.featuredBorder}
            >
              <View style={[styles.featuredInner, { backgroundColor: Onboarding.cardBackground }]}>
                <ThemedText style={styles.flagGrande}>{featured.flag}</ThemedText>
                <ThemedText style={[styles.featuredLabel, { color: Onboarding.text }]}>
                  {featured.label}
                </ThemedText>
                <ThemedText style={[styles.featuredSub, { color: Onboarding.lunarisAccent }]}>
                  {featured.currency.symbol} {featured.currency.code} · feriados nacionales
                </ThemedText>
              </View>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.featuredInner,
                styles.featuredPlain,
                {
                  backgroundColor: Onboarding.cardBackground,
                  borderColor: Onboarding.border,
                },
              ]}
            >
              <ThemedText style={styles.flagGrande}>{featured.flag}</ThemedText>
              <ThemedText style={[styles.featuredLabel, { color: Onboarding.text }]}>
                {featured.label}
              </ThemedText>
              <ThemedText style={[styles.featuredSub, { color: Onboarding.textMuted }]}>
                {featured.currency.symbol} {featured.currency.code}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </Animated.View>

      <ThemedText style={[styles.otrosLabel, { color: Onboarding.textMuted }]}>
        Otros países
      </ThemedText>
      <View style={styles.grid}>
        {otros.map((pais, i) => {
          const activo = seleccionado === pais.code
          return (
            <Animated.View
              key={pais.code}
              entering={FadeInDown.delay(100 + i * 30).duration(350)}
              style={styles.gridItem}
            >
              <Pressable
                onPress={() => setSeleccionado(pais.code)}
                style={[
                  styles.paisCard,
                  {
                    backgroundColor: activo
                      ? hexToRgba(Gradients.onboarding.start, 0.12)
                      : Onboarding.cardBackground,
                    borderColor: activo ? Gradients.onboarding.start : Onboarding.border,
                  },
                ]}
              >
                <ThemedText style={styles.flagPeq}>{pais.flag}</ThemedText>
                <ThemedText
                  style={[styles.paisLabel, { color: Onboarding.text }]}
                  numberOfLines={2}
                >
                  {pais.label}
                </ThemedText>
              </Pressable>
            </Animated.View>
          )
        })}
      </View>

      <View style={styles.footer}>
        <ThemedText style={[styles.hint, { color: Onboarding.textMuted }]}>
          {presetActual.flag} {presetActual.label} · {presetActual.currency.symbol}{' '}
          {presetActual.currency.code}
        </ThemedText>
        <GradientCTAButton label="Continuar →" onPress={continuar} />
      </View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    gap: 2,
  },
  backText: {
    color: Onboarding.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  subtitulo: {
    fontSize: 15,
    lineHeight: 22,
  },
  featuredBorder: {
    borderRadius: 20,
    padding: 2,
    marginBottom: Spacing.lg,
  },
  featuredInner: {
    borderRadius: 18,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  featuredPlain: {
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  flagGrande: {
    fontSize: 52,
    marginBottom: Spacing.sm,
  },
  featuredLabel: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  featuredSub: {
    fontSize: 13,
    textAlign: 'center',
  },
  otrosLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '48%',
  },
  paisCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    minHeight: 88,
    justifyContent: 'center',
    gap: 6,
  },
  flagPeq: {
    fontSize: 28,
  },
  paisLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
  },
})

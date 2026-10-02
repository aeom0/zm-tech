import React, { useMemo, useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { CountryFlag } from '@/components/CountryFlag'
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from '@/screens/onboarding/components'
import { BorderRadius, Gradients, Onboarding, Spacing } from '@/constants/theme'
import { useTenant } from '@/contexts/TenantContext'
import { COUNTRY_PRESETS, localeFromCountry, type CountryPreset } from '@zmtech/tenant-config'
import { CurrencyPickerModal } from '@/screens/settings/components/CurrencyPickerModal'
import type { Moneda } from '@/screens/settings/constants'

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

/** País sugerido a partir de la zona horaria del dispositivo (solo si es inequívoco). */
function detectSuggestedCountry(paises: CountryPreset[]): CountryPreset | undefined {
  let tz: string | undefined
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
  if (!tz) return undefined
  const matches = paises.filter((p) => p.timezone === tz)
  return matches.length === 1 ? matches[0] : undefined
}

export default function OnboardingCountryScreen({ onNext, onBack }: OnboardingCountryScreenProps) {
  const { updateTenant } = useTenant()
  const paises = useMemo(
    () => [...COUNTRY_PRESETS].sort((a, b) => a.label.localeCompare(b.label, 'es')),
    []
  )
  const featured = useMemo(() => detectSuggestedCountry(paises), [paises])
  const otros = paises.filter((p) => p.code !== featured?.code)

  // `config.locale.country` trae VE por defecto: no es una elección del usuario, así que se ignora.
  const [seleccionado, setSeleccionado] = useState<CountryPreset['code'] | null>(null)
  const [moneda, setMoneda] = useState<{ code: string; symbol: string } | null>(null)
  const [modalMonedaVisible, setModalMonedaVisible] = useState(false)

  const presetActual = paises.find((p) => p.code === seleccionado)
  const monedaActual = moneda ?? presetActual?.currency

  const elegirPais = (code: CountryPreset['code']) => {
    setSeleccionado(code)
    setMoneda(null)
  }

  const continuar = async () => {
    if (!seleccionado) return
    const locale = localeFromCountry(seleccionado)
    if (!locale) return
    await updateTenant({ locale: moneda ? { ...locale, currency: moneda } : locale })
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
          PASO 1 DE 7
        </ThemedText>
        <OnboardingProgressDots currentStep={0} />
        <ThemedText style={[styles.titulo, { color: Onboarding.text }]}>
          ¿Desde dónde operas?
        </ThemedText>
        <ThemedText style={[styles.subtitulo, { color: Onboarding.textMuted }]}>
          Zona horaria y feriados se configuran según tu país. La moneda la puedes cambiar.
        </ThemedText>
      </Animated.View>

      {featured ? (
        <>
          <ThemedText style={[styles.otrosLabel, { color: Onboarding.textMuted }]}>
            Sugerido para ti
          </ThemedText>
      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <Pressable
          onPress={() => elegirPais(featured.code)}
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
                <CountryFlag
                  code={featured.code}
                  width={76}
                  borderRadius={16}
                  borderColor={Gradients.onboarding.start}
                />
                <ThemedText
                  style={[styles.featuredLabel, { color: Onboarding.text, marginTop: Spacing.sm }]}
                >
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
              <CountryFlag
                code={featured.code}
                width={76}
                borderRadius={16}
                borderColor={Onboarding.border}
              />
              <ThemedText
                style={[styles.featuredLabel, { color: Onboarding.text, marginTop: Spacing.sm }]}
              >
                {featured.label}
              </ThemedText>
              <ThemedText style={[styles.featuredSub, { color: Onboarding.textMuted }]}>
                {featured.currency.symbol} {featured.currency.code}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </Animated.View>
        </>
      ) : null}

      <ThemedText style={[styles.otrosLabel, { color: Onboarding.textMuted }]}>
        {featured ? 'Otros países' : 'Elige tu país'}
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
                onPress={() => elegirPais(pais.code)}
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
                <CountryFlag
                  code={pais.code}
                  width={44}
                  borderRadius={10}
                  borderColor={activo ? Gradients.onboarding.start : Onboarding.border}
                />
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
        {presetActual && monedaActual ? (
          <Pressable
            onPress={() => setModalMonedaVisible(true)}
            style={styles.monedaRow}
            hitSlop={8}
          >
            <ThemedText style={[styles.hint, { color: Onboarding.textMuted }]}>
              Moneda: {monedaActual.symbol} {monedaActual.code}
            </ThemedText>
            <ThemedText style={[styles.hint, styles.cambiar, { color: Onboarding.lunarisAccent }]}>
              Cambiar
            </ThemedText>
          </Pressable>
        ) : null}
        <GradientCTAButton label="Continuar →" onPress={continuar} disabled={!seleccionado} />
      </View>

      <CurrencyPickerModal
        visible={modalMonedaVisible}
        currentCode={monedaActual?.code ?? ''}
        onSelect={(m: Moneda) => setMoneda({ code: m.code, symbol: m.symbol })}
        onClose={() => setModalMonedaVisible(false)}
      />
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
    borderRadius: BorderRadius.card,
    padding: 2,
    marginBottom: Spacing.lg,
  },
  featuredInner: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  featuredPlain: {
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  featuredLabel: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.xs,
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
  monedaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cambiar: {
    fontWeight: '600',
  },
})

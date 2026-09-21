/**
 * Splash de marca del tenant — puente visual entre splash nativa / login y el panel.
 * Gradiente vertical suave primary→accent, glow circular, logo y nombre.
 */
import React, { useEffect, useMemo } from 'react'
import { View, StyleSheet, StatusBar, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TenantLogoImage } from '@/components/TenantLogoImage'
import { ThemedText } from '@/components/ThemedText'
import { useTenant } from '@/contexts/TenantContext'
import { hexWithAlpha, Spacing } from '@/constants/theme'
import { mixHexColors } from '@/lib/color-hsv'

const LOGO_SIZE = 128
/** Un poco más de tiempo en pantalla para leer marca (~3.4s). */
const TOTAL_MS = 3400
const FADE_OUT_MS = 520

type Props = {
  onFinish: () => void
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'G'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

/** Gradiente vertical continuo (sin bandas) para el fondo de splash. */
function createSplashGradient(primary: string, accent: string) {
  const top = mixHexColors(primary, '#0A0A0C', 0.28)
  const midA = mixHexColors(primary, accent, 0.28)
  const midB = mixHexColors(primary, accent, 0.55)
  const midC = mixHexColors(primary, accent, 0.78)
  return {
    colors: [top, primary, midA, midB, midC, accent] as const,
    locations: [0, 0.18, 0.38, 0.58, 0.78, 1] as const,
    start: { x: 0.5, y: 0 } as const,
    end: { x: 0.5, y: 1 } as const,
    primary,
  }
}

export function TenantBrandSplashScreen({ onFinish }: Props) {
  const { config } = useTenant()
  const insets = useSafeAreaInsets()
  const splashBg = useMemo(
    () => createSplashGradient(config.theme.primaryColor, config.theme.accentColor),
    [config.theme.primaryColor, config.theme.accentColor]
  )

  const businessName = config.businessName?.trim() || 'GeemaStudio'
  const tagline = config.tagline?.trim() || null
  const hasLogo = Boolean(config.logo)
  const initials = initialsFromName(businessName)

  const screenOpacity = useSharedValue(0)
  const contentOpacity = useSharedValue(0)
  const contentScale = useSharedValue(0.88)
  const glowPulse = useSharedValue(0.9)
  const nameOpacity = useSharedValue(0)
  const nameTranslate = useSharedValue(14)

  useEffect(() => {
    let cancelled = false

    screenOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    contentOpacity.value = withDelay(
      140,
      withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })
    )
    contentScale.value = withDelay(
      140,
      withTiming(1, { duration: 680, easing: Easing.out(Easing.back(1.12)) })
    )
    nameOpacity.value = withDelay(
      420,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })
    )
    nameTranslate.value = withDelay(
      420,
      withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) })
    )
    glowPulse.value = withDelay(
      220,
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.02, { duration: 800, easing: Easing.inOut(Easing.sin) })
      )
    )

    const fadeAt = TOTAL_MS - FADE_OUT_MS
    const fadeTimer = setTimeout(() => {
      if (cancelled) return
      screenOpacity.value = withTiming(0, {
        duration: FADE_OUT_MS,
        easing: Easing.in(Easing.cubic),
      })
    }, fadeAt)

    const doneTimer = setTimeout(() => {
      if (!cancelled) runOnJS(onFinish)()
    }, TOTAL_MS)

    return () => {
      cancelled = true
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [
    contentOpacity,
    contentScale,
    glowPulse,
    nameOpacity,
    nameTranslate,
    onFinish,
    screenOpacity,
  ])

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }))

  const logoBlockStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowPulse.value }],
    opacity: 0.35 + (glowPulse.value - 0.9) * 1.2,
  }))

  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameTranslate.value }],
  }))

  return (
    <Animated.View
      style={[styles.root, screenStyle]}
      accessibilityLabel={`Bienvenida ${businessName}`}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[...splashBg.colors]}
        locations={[...splashBg.locations]}
        start={splashBg.start}
        end={splashBg.end}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <Animated.View style={[styles.logoStage, logoBlockStyle]}>
          {/* Halo suave circular (sin relleno sólido que forme franja) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowRingOuter,
              glowStyle,
              { borderColor: hexWithAlpha('#FFFFFF', 0.22) },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowRing,
              glowStyle,
              { borderColor: hexWithAlpha('#FFFFFF', 0.32) },
            ]}
          />

          {hasLogo ? (
            <TenantLogoImage
              uri={config.logo as string}
              size={LOGO_SIZE}
              bgStyle={config.logoBgDark}
              borderColor="rgba(255,255,255,0.22)"
              style={styles.logoShadow}
            />
          ) : (
            <View
              style={[
                styles.initialsWrap,
                {
                  backgroundColor: hexWithAlpha('#FFFFFF', 0.14),
                  borderColor: hexWithAlpha('#FFFFFF', 0.28),
                },
              ]}
            >
              <ThemedText style={styles.initials}>{initials}</ThemedText>
            </View>
          )}
        </Animated.View>

        <Animated.View style={[styles.textBlock, nameStyle]}>
          <ThemedText style={styles.businessName} numberOfLines={2}>
            {businessName}
          </ThemedText>
          {tagline ? (
            <ThemedText style={styles.tagline} numberOfLines={2}>
              {tagline}
            </ThemedText>
          ) : null}
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111318',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  logoStage: {
    width: LOGO_SIZE + 80,
    height: LOGO_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRingOuter: {
    position: 'absolute',
    width: LOGO_SIZE + 64,
    height: LOGO_SIZE + 64,
    borderRadius: (LOGO_SIZE + 64) / 2,
    borderWidth: 1,
  },
  glowRing: {
    position: 'absolute',
    width: LOGO_SIZE + 28,
    height: LOGO_SIZE + 28,
    borderRadius: (LOGO_SIZE + 28) / 2,
    borderWidth: 1.5,
  },
  logoShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  initialsWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initials: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 1,
  },
  textBlock: {
    marginTop: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
    maxWidth: 320,
  },
  businessName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
  },
})

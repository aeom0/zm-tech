import React from 'react'
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native'

const SRC = {
  wordmark: require('../../../assets/brand/wordmark-repmax.png'),
  tagline: require('../../../assets/brand/wordmark-repmax-tagline.png'),
  icon: require('../../../assets/brand/icon-rm.png'),
} as const

export type BrandLogoVariant = keyof typeof SRC

type BrandLogoProps = {
  variant?: BrandLogoVariant
  /** Ancho en dp (alto escala con aspect ratio del asset). */
  width?: number
  style?: StyleProp<ImageStyle>
}

const ASPECT = {
  wordmark: 1174 / 184,
  tagline: 1400 / 356,
  icon: 512 / 192,
} as const

/**
 * Logo oficial RepMAX (PNG en assets/brand).
 * Preferir `wordmark` en auth; `tagline` en splash; `icon` en espacios chicos.
 */
export function BrandLogo({ variant = 'wordmark', width = 200, style }: BrandLogoProps) {
  const height = width / ASPECT[variant]
  return (
    <Image
      source={SRC[variant]}
      accessibilityLabel="RepMAX"
      resizeMode="contain"
      style={[styles.base, { width, height }, style]}
    />
  )
}

const styles = StyleSheet.create({
  base: {
    maxWidth: '100%',
  },
})

import React from 'react'
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native'

import type { LogoBackgroundStyle } from '@zmtech/tenant-config'
import { BorderRadius } from '@/constants/theme'
import { resolveLogoChipColor } from '@/lib/logoBackground'

interface TenantLogoImageProps {
  uri: string
  size: number
  bgStyle?: LogoBackgroundStyle
  style?: StyleProp<ViewStyle>
  borderColor?: string
  /**
   * `circle` — headers / tabs (default).
   * `roundedSquare` — selectores de color / preview en Logo del negocio (alineado al onboarding).
   */
  shape?: 'circle' | 'roundedSquare'
}

/** Logo del tenant sobre un "chip" opcional (claro/oscuro) para que se lea con cualquier tema de la app. */
export function TenantLogoImage({
  uri,
  size,
  bgStyle,
  style,
  borderColor,
  shape = 'circle',
}: TenantLogoImageProps) {
  const chipColor = resolveLogoChipColor(bgStyle)
  const imageSize = chipColor ? size * 0.68 : size
  const radius = shape === 'roundedSquare' ? BorderRadius.xs : size / 2

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: chipColor ?? 'transparent',
          borderColor: borderColor ?? 'transparent',
          borderWidth: borderColor ? 1 : 0,
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: imageSize, height: imageSize }}
        resizeMode={chipColor ? 'contain' : 'cover'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
